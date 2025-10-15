import { Injectable } from '@angular/core';
import { HTTP } from '@awesome-cordova-plugins/http/ngx';
import { Platform, ToastController } from '@ionic/angular';
import { SQLite, SQLiteObject } from '@ionic-native/sqlite/ngx';
import * as CryptoJS from 'crypto-js';
import { Storage } from '@ionic/storage-angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class RegistrationService {
  private dbInstance: SQLiteObject | null = null;
  private currentUser: any;
  private API_URL: string = 'http://54.206.87.227:8000';
  private REGISTER_URL: string = `${this.API_URL}/users/`;
  private LOGIN_URL: string = `${this.API_URL}/users/login`;

  constructor(
    private sqlite: SQLite,
    private platform: Platform,
    private storage: Storage,
    private http: HttpClient,
    private nativeHttp: HTTP,
    private toastCtrl: ToastController
  ) {
    this.platform.ready().then(async () => {
      await this.initStorage();
      await this.initDatabase();
      this.checkBackendConnection();

      window.addEventListener('online', () => {
        console.log('Device online. Syncing offline data...');
        this.syncOfflineData();
      });
    });
  }

  // ---------------- Storage Initialization ----------------
  private async initStorage() {
    if (!this.storage['_db']) {
      await this.storage.create();
    }
  }

  // ---------------- Database Initialization ----------------
  public async initDatabase() {
    if (!this.platform.is('hybrid')) {
      console.warn('SQLite not available on this platform.');
      return;
    }

    this.dbInstance = await this.sqlite.create({
      name: 'barangayconnect.db',
      location: 'default',
    });

    await this.dbInstance.executeSql(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backend_id INTEGER DEFAULT NULL,
        firstName TEXT,
        middleName TEXT,
        lastName TEXT,
        dob TEXT,
        gender TEXT,
        civilStatus TEXT,
        contact TEXT UNIQUE,
        purok TEXT,
        barangay TEXT,
        city TEXT,
        province TEXT,
        postalCode TEXT,
        password TEXT,
        rawPassword TEXT, 
        photo TEXT,
        role TEXT,
        synced INTEGER DEFAULT 0
      )
    `, []);
  }

  // ---------------- Password Hashing ----------------
  private hashPassword(password: string): string {
    return CryptoJS.SHA256(password).toString();
  }

// ---------------- Unified HTTP Request ----------------
private async request(
  method: 'get' | 'post',
  url: string,
  body: any = {},
  headers: any = {}
): Promise<any> {
  const jsonHeaders = { 
    'Content-Type': 'application/json', 
    'Accept': 'application/json',
    ...headers 
  };

  if (this.platform.is('hybrid')) {
    try {
      if (method === 'get') {
        const res = await this.nativeHttp.get(url, {}, jsonHeaders);
        return JSON.parse(res.data);
      } else {
        // Force JSON serializer for POST
        this.nativeHttp.setDataSerializer('json');
        const res = await this.nativeHttp.post(url, body, jsonHeaders);
        return JSON.parse(res.data);
      }
    } catch (err) {
      console.error('❌ Native HTTP error:', err);
      throw err;
    }
  } else {
    const options = { headers: new HttpHeaders(jsonHeaders) };
    try {
      return method === 'get'
        ? await firstValueFrom(this.http.get(url, options))
        : await firstValueFrom(this.http.post(url, body, options));
    } catch (err) {
      console.error('❌ Web HTTP error:', err);
      throw err;
    }
  }
}

// ---------------- Registration ----------------
async register(data: any): Promise<any> {
  const payload = this.sanitizePayload(data);
  console.log("📤 Payload from app:", JSON.stringify(payload, null, 2));

  if (!navigator.onLine) {
    throw new Error("⚠️ Registration requires internet connection.");
  }

  try {
    const response: any = await this.request('post', this.REGISTER_URL, payload);
    console.log("📥 Response from backend:", response);

    if (response?.firstName) {
      return response; // ✅ backend is source of truth
    } else {
      throw new Error('Unexpected backend response.');
    }
  } catch (err: any) {
    console.error('❌ Registration error:', err);
    throw new Error(err.error?.detail || err.message || 'Registration failed.');
  }
}

// ---------------- Login ----------------
// ---------------- Login ----------------
async login(contact: string, password: string): Promise<any> {
  if (!navigator.onLine) {
    throw new Error("⚠️ Login requires internet connection.");
  }

  // 🔹 Normalize contact format: +63xxxxxxx → 09xxxxxxx
  const normalizedContact = contact
    .trim()
    .replace(/^\+63/, "0")
    .replace(/^63/, "0")
    .replace(/^\+/, "");

  const payload = {
    contact: normalizedContact,
    password: password,
  };

  console.log("📤 Login payload:", JSON.stringify(payload, null, 2));

  try {
    const response: any = await this.request("post", this.LOGIN_URL, payload);

    console.log("📥 Login response:", JSON.stringify(response, null, 2));

    // ✅ Backend returns the user object directly (no "success" field)
    if (response?.role) {
      // Optional rule for residents
      if (response.role === "resident" && response.status !== "Approved") {
        throw new Error(
          `Resident account not approved yet. Status: ${response.status}`
        );
      }

      this.setCurrentUser(response);
      await this.saveOfflineUser({ ...response, rawPassword: password });

      return response;
    } else {
      throw new Error("Invalid login response format.");
    }
  } catch (err: any) {
    console.error("❌ Login error raw:", err);

    let backendMessage = "Login failed.";
    if (err?.error) {
      try {
        const parsed =
          typeof err.error === "string" ? JSON.parse(err.error) : err.error;
        backendMessage = parsed.detail || backendMessage;
      } catch {
        backendMessage = err.error?.detail || backendMessage;
      }
    }

    throw new Error(backendMessage);
  }
}



  // ---------------- Backend Connection Check ----------------
  private async checkBackendConnection() {
    try {
      const res = await this.request('get', `${this.API_URL}/ping`);
      console.log('✅ Connected to backend', res);
    } catch (err) {
      console.error('❌ Connection failed', err);
      const toast = await this.toastCtrl.create({
        message: '⚠️ Cannot connect to backend. Some features may not work.',
        color: 'warning',
        duration: 3000,
        position: 'top'
      });
      await toast.present();
    }
  }

  
// ---------------- Offline Login ----------------
private async offlineLogin(contact: string, password: string): Promise<any | null> {
  const hashed = this.hashPassword(password);

  // Check resident users in SQLite
  if (this.dbInstance) {
    const result = await this.dbInstance.executeSql(
      'SELECT * FROM users WHERE contact = ? AND password = ?',
      [contact, hashed]
    );
    if (result.rows.length > 0) {
      const user = result.rows.item(0);
      this.setCurrentUser(user);
      return user;
    }
  }

  // Check secretary/captain from Storage
  const roles: ('secretary' | 'captain')[] = ['secretary', 'captain'];
  for (const role of roles) {
    const stored = await this.storage.get(`${role}-${contact}`);
    if (stored && stored.password === hashed) {
      this.setCurrentUser({ ...stored, role });
      return { ...stored, role };
    }
  }

  throw new Error("⚠️ Offline login failed. No local record found.");
}


 async saveOfflineUser(user: any) {
  if (!this.dbInstance || user.role !== 'resident') return;

  // ✅ Avoid double hashing
  const hashedPassword = user.rawPassword
    ? this.hashPassword(user.rawPassword)
    : user.password;

  const query = `
    INSERT OR REPLACE INTO users (
      backend_id, firstName, middleName, lastName, dob, gender, civilStatus, contact,
      purok, barangay, city, province, postalCode, password, rawPassword, photo, role, synced
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    user.backend_id || null,
    user.firstName, user.middleName, user.lastName, user.dob, user.gender, user.civilStatus, user.contact,
    user.purok, user.barangay, user.city, user.province, user.postalCode,
    hashedPassword,                 // ✅ correct
    user.rawPassword || user.password, // keep raw for sync
    user.photo, user.role, 0
  ];

  try {
    await this.dbInstance.executeSql(query, values);
  } catch (err) {
    console.error('❌ Save offline error:', err);
  }
}


private sanitizePayload(data: any, isUpdate: boolean = false): any {
  // Photo required for registration, but optional for update
  if (!isUpdate && (!data.photo || data.photo.trim() === '')) {
    throw new Error("⚠️ A photo is required for registration.");
  }

  const payload: any = {
    firstName: data.firstName?.trim() || null,
    lastName: data.lastName?.trim() || null,
    dob: data.dob ? data.dob.split('T')[0] : null, // ensure YYYY-MM-DD
    gender: data.gender?.trim() || null,
    civilStatus: data.civilStatus?.trim() || null,
    contact: data.contact?.trim() || null,
    purok: data.purok?.trim() || null,
    barangay: data.barangay?.trim() || null,
    city: data.city?.trim() || null,
    province: data.province?.trim() || null,
    postalCode: data.postalCode ? String(data.postalCode).trim() : null,
    password: data.password, // raw password for backend
    role: data.role || 'resident',
  };

  if (data.middleName && data.middleName.trim() !== '') {
    payload.middleName = data.middleName.trim();
  }

  // Remove "data:image/...;base64," prefix only if photo is provided
  if (data.photo && data.photo.trim() !== '') {
    payload.photo = data.photo.replace(/^data:image\/[a-z]+;base64,/, '');
  }

  return payload;
}



// ---------------- Sync Offline Users ----------------
public async syncOfflineData(): Promise<void> {
  if (!this.dbInstance || !navigator.onLine) return;

  try {
    const result = await this.dbInstance.executeSql(
      'SELECT * FROM users WHERE synced = 0',
      []
    );

    const promises: Promise<void>[] = [];

    for (let i = 0; i < result.rows.length; i++) {
      const user = result.rows.item(i);

      // ⚠️ local DB has hashed password, backend needs raw
      const payload = this.sanitizePayload({
        ...user,
        password: user.rawPassword , // use raw if available
      });

      console.log("📤 Sync payload:", JSON.stringify(payload, null, 2));

      const p = this.request('post', this.REGISTER_URL, payload)
        .then(async (response: any) => {
          if (response?.firstName) {
            await this.dbInstance!.executeSql(
              'UPDATE users SET synced = 1, backend_id = ? WHERE contact = ?',
              [response.id || null, user.contact]
            );
          }
        })
        .catch(err => {
          console.error(`❌ Failed to sync user: ${user.contact}`, err);
        });

      promises.push(p);
    }

    await Promise.all(promises);
    console.log('✅ Offline data sync complete');
  } catch (err) {
    console.error('❌ Sync failed', err);
  }
}

  // ---------------- Helpers ----------------
  setCurrentUser(user: any) { this.currentUser = user; }
  getCurrentUser() { return this.currentUser; }

  async isDuplicateContact(contact: string): Promise<boolean> {
    if (!this.dbInstance) return false;
    const result = await this.dbInstance.executeSql('SELECT * FROM users WHERE contact = ?', [contact]);
    return result.rows.length > 0;
  }

  async isDuplicateName(first: string, middle: string, last: string): Promise<boolean> {
    if (!this.dbInstance) return false;
    const result = await this.dbInstance.executeSql(
      'SELECT * FROM users WHERE lower(firstName) = ? AND lower(middleName) = ? AND lower(lastName) = ?',
      [first.toLowerCase(), middle.toLowerCase(), last.toLowerCase()]
    );
    return result.rows.length > 0;
  }

  async getAllRegistrations(): Promise<any[]> {
    const allUsers: any[] = [];

    if (this.dbInstance) {
      const result = await this.dbInstance.executeSql('SELECT * FROM users', []);
      for (let i = 0; i < result.rows.length; i++) allUsers.push(result.rows.item(i));
    }

    const keys = await this.storage.keys();
    for (const key of keys) {
      if (key.startsWith('secretary-') || key.startsWith('captain-')) {
        const user = await this.storage.get(key);
        allUsers.push(user);
      }
    }

    return allUsers;
  }

  // ---------------- Auto Login ----------------
public async checkAutoLogin(): Promise<void> {
  const keys = await this.storage.keys();
  // Check secretary/captain first
  for (const key of keys) {
    if (key.startsWith('secretary-') || key.startsWith('captain-')) {
      const user = await this.storage.get(key);
      if (user) {
        this.setCurrentUser(user);
        return;
      }
    }
  }

  // Check resident users from SQLite
  if (this.dbInstance) {
    const result = await this.dbInstance.executeSql(
      'SELECT * FROM users ORDER BY id DESC LIMIT 1', []
    );
    if (result.rows.length > 0) {
      const latestUser = result.rows.item(0);
      this.setCurrentUser(latestUser);
    }
  }
}

 // ---------------- Update User ----------------
async updateUser(user: any): Promise<void> {
  if (user.role === 'resident') {
    if (!this.dbInstance) return;
    const query = `
      UPDATE users SET
        firstName = ?, middleName = ?, lastName = ?, dob = ?, gender = ?, civilStatus = ?,
        contact = ?, purok = ?, barangay = ?, city = ?, province = ?, postalCode = ?,
        password = ?, rawPassword = ?, photo = ?, synced = 0
      WHERE backend_id = ? OR id = ?
    `;
    const values = [
      user.firstName, user.middleName, user.lastName, user.dob, user.gender, user.civilStatus,
      user.contact, user.purok, user.barangay, user.city, user.province, user.postalCode,
      user.password, user.rawPassword || user.password, user.photo || '',
      user.backend_id || user.id, user.backend_id || user.id
    ];
    await this.dbInstance.executeSql(query, values);
  } else {
    await this.storage.set(`${user.role}-${user.contact}`, user);
  }
}
getPhotoBase64(): string | null {
  const user = this.getCurrentUser();
  if (!user?.photo || user.photo.trim() === '') return null;

  // Strip any existing data URL prefix to avoid duplicates
  const base64 = user.photo.replace(/^data:image\/[a-z]+;base64,/, '');
  return 'data:image/png;base64,' + base64;
}



  // ---------------- Clear All ----------------
  async clearAll(): Promise<void> {
  await this.clearUsersTable(); // reuse function
  const keys = await this.storage.keys();
  for (const key of keys) {
    if (key.startsWith('secretary-') || key.startsWith('captain-')) {
      await this.storage.remove(key);
    }
  }
  this.currentUser = null;
}



    // ---------------- Clear Users Table ----------------
  async clearUsersTable(): Promise<void> {
    if (!this.dbInstance) return;
    try {
      await this.dbInstance.executeSql('DELETE FROM users', []);
      console.log('✅ Users table cleared');
    } catch (err) {
      console.error('❌ Failed to clear users table', err);
    }
  }

}

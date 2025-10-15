import { Injectable } from '@angular/core';
import { openDB } from 'idb';
import { User } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class IndexedDBService {
  private dbName = 'barangayconnect';
  private storeName = 'request_history';

  private async getDb() {
    return await openDB(this.dbName, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('request_history')) {
          db.createObjectStore('request_history', { keyPath: 'id' });
        }
      }
    });
  }

  // Save user to IndexedDB
  async saveUser(user: User): Promise<void> {
    const db = await this.getDb();
    if (!user.timestamp) user.timestamp = new Date().toISOString();
    await db.put(this.storeName, user);
  }

  // Get all users from IndexedDB
  async getAllUsers(): Promise<User[]> {
    const db = await this.getDb();
    const raw = await db.getAll(this.storeName);
    return raw.map((r: any) => {
      // Ensure backward compatibility with old User data
      return {
        id: r.id,
        firstName: r.firstName ?? '',
        middleName: r.middleName ?? '',
        lastName: r.lastName ?? '',
        dob: r.dob ?? '',
        gender: r.gender ?? '',
        civilStatus: r.civilStatus ?? '',
        contact: r.contact ?? '',
        purok: r.purok ?? '',
        barangay: r.barangay ?? '',
        city: r.city ?? '',
        province: r.province ?? '',
        postalCode: r.postalCode ?? '',
        photo: r.photo,
        role: r.role ?? '',
        status: r.status ?? 'Pending',
        timestamp: r.timestamp ?? new Date().toISOString()
      } as User;
    });
  }

  // Get users by status
  async getUsersByStatus(status: string): Promise<User[]> {
    const all = await this.getAllUsers();
    return all.filter(u => u.status === status);
  }

  // Get users registered today
  async getUsersToday(): Promise<User[]> {
    const today = new Date();
    const all = await this.getAllUsers();
    return all.filter(u => {
      if (!u.timestamp) return false;
      const userDate = new Date(u.timestamp);
      return (
        userDate.getFullYear() === today.getFullYear() &&
        userDate.getMonth() === today.getMonth() &&
        userDate.getDate() === today.getDate()
      );
    });
  }

  // Clear all users
  async clearUsers(): Promise<void> {
    const db = await this.getDb();
    await db.clear(this.storeName);
  }
}

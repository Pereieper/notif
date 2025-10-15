import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { IndexedDBService } from './indexed-db.service';

export interface User {
  id: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  dob: string;
  gender: string;
  civilStatus: string;
  contact: string;
  purok: string;
  barangay: string;
  city: string;
  province: string;
  postalCode: string;
  photo?: string;
  role: string;
  status: string;
  timestamp?: string;
}

export interface StatusResponse {
  success: boolean;
  id: number;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://54.206.87.227:8000/users/';

  constructor(private http: HttpClient, private idb: IndexedDBService) {}

  // Get all users
  getUsers(): Observable<User[]> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.get<User[]>(this.apiUrl, { headers }).pipe(
      tap(users => users.forEach(u => this.idb.saveUser(u))), // <- saveUser for User type
      catchError(err => {
        console.warn('Backend offline, loading from IndexedDB...', err);
        return from(this.idb.getAllUsers()); // <- getAllUsers returns User[]
      })
    );
  }

  // Update user status
  updateUserStatus(id: number, status: string): Observable<StatusResponse> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put<StatusResponse>(`${this.apiUrl}/${id}/status`, { status }, { headers })
      .pipe(
        tap(updated => {
          const user: User = { id: updated.id, status: updated.status } as User;
          this.idb.saveUser(user);
        }),
        catchError(err => {
          console.error('Failed to update status on backend, using IndexedDB fallback...', err);
          return from(this.idb.getAllUsers().then(users => {
            const user = users.find(u => u.id === id);
            if (user) {
              user.status = status;
              this.idb.saveUser(user);
            }
            return { success: true, id: id, status } as StatusResponse;
          }));
        })
      );
  }

  // Register user
  register(user: Partial<User>): Observable<User> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<User>(this.apiUrl, user, { headers }).pipe(
      tap(registeredUser => this.idb.saveUser(registeredUser)),
      catchError(err => {
        console.error('Registration failed:', err);
        throw err;
      })
    );
  }

  // Login user
  login(contact: string, password: string): Observable<{ success: boolean; user: User }> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<{ success: boolean; user: User }>(
      `${this.apiUrl}login`,
      { contact, password },
      { headers }
    ).pipe(
      tap(res => {
        if (res?.user) this.idb.saveUser(res.user);
      }),
      catchError(err => {
        console.error('Login failed:', err);
        throw err;
      })
    );
  }
}

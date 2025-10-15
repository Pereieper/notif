// ---------------- Imports ----------------
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Platform } from '@ionic/angular';
import { throwError, firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HTTP } from '@awesome-cordova-plugins/http/ngx';

// ---------------- Interfaces ----------------
export interface UserInfo {
  firstName: string;
  middleName?: string;
  lastName: string;
  photo?: string;
}

export interface DocumentRequestPayload {
  id?: number;
  documentType: string;
  purpose: string;
  copies: number;
  requirements?: string;
  photo?: string | null;
  contact: string;
  notes?: string;
  status: RequestStatus;
  action?: string;
  created_at: Date;
  updated_at?: Date | null;
  pickup_date?: string | null;
  user?: UserInfo;
}


export interface AddRequestPayload {
  documentType: string;
  purpose: string;
  copies: number;
  requirements?: string;
  photo?: string;
  contact: string;
  notes?: string;
}

export interface UpdateStatusPayload {
  id: number;
  status: RequestStatus;
  action?: string;
  notes?: string;
}
export type RequestStatus =
  | 'Pending'
  | 'Returned'
  | 'Approved'
  | 'For Print'
  | 'For Pickup'
  | 'Completed'
  | 'Rejected'
  | 'Cancelled'
  | 'Expired';


// ---------------- Service ----------------
@Injectable({ providedIn: 'root' })
export class DocumentRequestService {
  private API_URL = 'http://54.206.87.227:8000';
  private DOCUMENT_REQUEST_URL = `${this.API_URL}/document-requests`;

  constructor(
    private http: HttpClient,
    private nativeHttp: HTTP,
    private platform: Platform
  ) {}

  // ---------------- Contact Normalization ----------------
  private normalizeContact(contact: string): string {
    contact = (contact || '').trim();
    if (contact.startsWith('+63')) contact = '0' + contact.slice(3);
    else if (contact.startsWith('63')) contact = '0' + contact.slice(2);
    return contact;
  }

  private getHeaders(): any {
    return { 'Content-Type': 'application/json', 'Accept': 'application/json' };
  }

  // ---------------- Unified Request ----------------
  private async request<T>(method: 'get' | 'post' | 'delete', url: string, body: any = {}): Promise<T> {
    const headers = this.getHeaders();

    if (this.platform.is('hybrid')) {
      try {
        if (method === 'get') {
          const res = await this.nativeHttp.get(url, {}, headers);
          return JSON.parse(res.data);
        } else if (method === 'post') {
          this.nativeHttp.setDataSerializer('json');
          const res = await this.nativeHttp.post(url, body, headers);
          return JSON.parse(res.data);
        } else if (method === 'delete') {
          const res = await this.nativeHttp.delete(url, {}, headers);
          return JSON.parse(res.data);
        }
      } catch (err) {
        console.error('❌ Native HTTP error:', err);
        throw err;
      }
    } else {
      try {
        const options = { headers: new HttpHeaders(headers) };
        if (method === 'get') {
          return await firstValueFrom(this.http.get<T>(url, options).pipe(catchError(err => this.handleError(err))));
        } else if (method === 'post') {
          return await firstValueFrom(this.http.post<T>(url, body, options).pipe(catchError(err => this.handleError(err))));
        } else if (method === 'delete') {
          return await firstValueFrom(this.http.delete<T>(url, options).pipe(catchError(err => this.handleError(err))));
        }
      } catch (err) {
        console.error('❌ Web HTTP error:', err);
        throw err;
      }
    }

    // 🔑 Ensure function always returns
    throw new Error(`Unsupported request method: ${method}`);
  }

  // ---------------- Error Handling ----------------
  private handleError(error: HttpErrorResponse) {
    console.error('HTTP Error:', error);
    let message = 'An unknown error occurred';
    if (error.status === 0) message = 'Cannot connect to server. Check network/server.';
    else if (error.status === 500) message = 'Server error. Please try again later.';
    else if (error.status === 409) message = error.error?.detail || 'Conflict error occurred.';
    else if (error.error?.detail) message = error.error.detail;
    return throwError(() => new Error(message));
  }

  // ---------------- Normalizer ----------------
  private normalizeRequest(req?: DocumentRequestPayload): DocumentRequestPayload {
  if (!req) {
    return {
      id: 0,
      documentType: 'Unknown',
      purpose: '',
      copies: 1,
      requirements: '',
      photo: null,
      contact: '',
      notes: '',
      status: 'Pending',
      action: 'Review',
      created_at: new Date(),
      updated_at: null,
      pickup_date: null,
      user: { firstName: '', middleName: '', lastName: '', photo: '' }
    };
  }

  return {
    id: req.id ?? 0,
    documentType: req.documentType ?? 'Unknown',
    purpose: req.purpose ?? '',
    copies: req.copies ?? 1,
    requirements: req.requirements ?? '',
    photo: req.photo ?? '',
    contact: req.contact ?? '',
    notes: req.notes ?? '',
    status: req.status ?? 'Pending',
    action: req.action ?? 'Review',
    created_at: req.created_at ? new Date(req.created_at) : new Date(),  // ✅ always Date
    updated_at: req.updated_at ? new Date(req.updated_at) : null,
    pickup_date: req.pickup_date ?? null, 
    user: req.user
      ? {
          firstName: req.user.firstName ?? '',
          middleName: req.user.middleName ?? '',
          lastName: req.user.lastName ?? '',
          photo: req.user.photo ?? ''
        }
      : { firstName: '', middleName: '', lastName: '', photo: '' }
  };
}


  // ---------------- API Methods ----------------
  async getAllRequests(): Promise<DocumentRequestPayload[]> {
    const res = await this.request<DocumentRequestPayload[]>('get', this.DOCUMENT_REQUEST_URL);
    return (res || []).map(r => this.normalizeRequest(r));
  }

  async getRequestsByContact(contact: string): Promise<DocumentRequestPayload[]> {
    const url = `${this.DOCUMENT_REQUEST_URL}?contact=${this.normalizeContact(contact)}`;
    const res = await this.request<DocumentRequestPayload[]>('get', url);
    return (res || []).map(r => this.normalizeRequest(r));
  }

  async getRequestsByContactAndStatus(contact: string, status: string): Promise<DocumentRequestPayload[]> {
    const url = `${this.DOCUMENT_REQUEST_URL}?contact=${this.normalizeContact(contact)}&status=${status}`;
    const res = await this.request<DocumentRequestPayload[]>('get', url);
    return (res || []).map(r => this.normalizeRequest(r));
  }

  async getRequestById(id: number): Promise<DocumentRequestPayload> {
    const url = `${this.DOCUMENT_REQUEST_URL}/${id}`;
    const res = await this.request<DocumentRequestPayload>('get', url);
    return this.normalizeRequest(res);
  }

  async addRequest(data: AddRequestPayload): Promise<DocumentRequestPayload> {
    const payload = {
      ...data,
      contact: this.normalizeContact(data.contact),
      requirements: data.requirements ?? '',
      photo: data.photo ?? '',
      notes: data.notes ?? ''
    };
    const res = await this.request<DocumentRequestPayload>('post', `${this.DOCUMENT_REQUEST_URL}/`, payload);
    return this.normalizeRequest(res);
  }

  async updateStatus(data: UpdateStatusPayload): Promise<DocumentRequestPayload> {
    const res = await this.request<DocumentRequestPayload>('post', `${this.DOCUMENT_REQUEST_URL}/status`, data);
    return this.normalizeRequest(res);
  }

  // ---------------- Extra Methods ----------------
  async cancelRequestById(id: number): Promise<DocumentRequestPayload> {
  const url = `${this.DOCUMENT_REQUEST_URL}/${id}`;
  const res = await this.request<DocumentRequestPayload>('delete', url);
  return this.normalizeRequest(res);
}


  async deleteRequestById(id: number): Promise<any> {
    const url = `${this.DOCUMENT_REQUEST_URL}/${id}`;
    return await this.request<any>('delete', url); // ✅ only one implementation
  }

  async updateRequest(data: Partial<DocumentRequestPayload>): Promise<DocumentRequestPayload> {
    if (!data.id) throw new Error('Request ID is required for update');
    const url = `${this.DOCUMENT_REQUEST_URL}/${data.id}/update`;
    const res = await this.request<DocumentRequestPayload>('post', url, data);
    return this.normalizeRequest(res);
  }
}

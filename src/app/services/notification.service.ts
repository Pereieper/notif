import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HTTP } from '@awesome-cordova-plugins/http/ngx';
import { Platform } from '@ionic/angular';
import { from, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private baseUrl = 'http://54.206.87.227:8000/notifications';

  constructor(
    private http: HttpClient,
    private nativeHttp: HTTP,
    private platform: Platform
  ) {}

  // Get all notifications
  getAllNotifications(): Observable<any[]> {
    if (this.platform.is('hybrid')) {
      // Use native HTTP on devices
      return from(
        this.nativeHttp.get(this.baseUrl, {}, {})
          .then(response => JSON.parse(response.data))
      );
    } else {
      // Use HttpClient in browser
      return this.http.get<any[]>(this.baseUrl);
    }
  }

  // Mark notification as read
  markAsRead(id: number): Observable<any> {
    const url = `${this.baseUrl}/${id}/read`;
    if (this.platform.is('hybrid')) {
      return from(
        this.nativeHttp.put(url, {}, {})
          .then(response => JSON.parse(response.data))
      );
    } else {
      return this.http.put(url, {});
    }
  }
}

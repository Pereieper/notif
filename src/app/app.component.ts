import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet, Platform } from '@ionic/angular/standalone';
import { UserService } from './services/user.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor(
    private platform: Platform,
    private userService: UserService
  ) {
    this.initializeApp();
  }

  async initializeApp() {
    await this.platform.ready();

    // ❌ remove init() kay wala na siya sa UserService
    // await this.userService.init();

    // optional: auto-check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token found, user needs to login');
    } else {
      console.log('Token found, user is logged in');
    }
  }
}

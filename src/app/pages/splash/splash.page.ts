import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { RegistrationService } from 'src/app/services/registration.service';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule]
})
export class SplashPage implements OnInit {
  isExiting = false;
  expandLogo = false;

  constructor(
    private router: Router,
    private registrationService: RegistrationService,
    private userService: UserService
  ) {}

  async ngOnInit() {
  this.expandLogo = true;

  // ❌ REMOVE userService.init() kay wala na siya
  // await this.userService.init();

  // Kung kinahanglan gyud local storage setup, registrationService ra
  await this.registrationService.initDatabase();

  // Check auto-login safely
  if (this.registrationService.checkAutoLogin) {
    await this.registrationService.checkAutoLogin();
  }

  // Wait for animation
  await new Promise(res => setTimeout(res, 2000));

  this.isExiting = true;
  await new Promise(res => setTimeout(res, 800));

  // Navigate after animation
  const resident = this.registrationService.getCurrentUser();

  if (resident) {
    this.router.navigateByUrl('/resident-dashboard');
  } else {
    this.router.navigateByUrl('/login');
  }
}
}

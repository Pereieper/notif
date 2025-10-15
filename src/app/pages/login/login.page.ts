import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RegistrationService } from 'src/app/services/registration.service';
import { Storage } from '@ionic/storage-angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule],
})
export class LoginPage implements OnInit {
  phone: string = '';
  password: string = '';
  rememberMe: boolean = false;
  showPassword: boolean = false;
  passwordFocused = false;

  constructor(
    private router: Router,
    private registrationService: RegistrationService,
    private toastController: ToastController,
    private storage: Storage
  ) {}

  async ngOnInit() {
    await this.storage.create();
    const savedPhone = await this.storage.get('savedPhone');
if (savedPhone?.startsWith('+63')) {
  this.phone = savedPhone.slice(3); 
  this.rememberMe = true;
}
  }

  // Normalize phone to +63 format
  normalizePhone(phone: string): string {
    const cleaned = phone.trim().replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      return '+63' + cleaned.slice(1);
    } else if (cleaned.startsWith('9') && cleaned.length === 10) {
      return '+63' + cleaned;
    }
    return cleaned;
  }

  async login() {

     if (!navigator.onLine) {
    this.presentToast('⚠️ Internet required to log in.', 'warning');
    return;
  }

    const rawPhone = this.phone.trim();
const numericPhone = rawPhone.replace(/\D/g, '');

if (/\D/.test(rawPhone)) {
  this.presentToast('⚠️ Phone number must contain numbers only.', 'warning');
  return;
}

if (!rawPhone || !this.password) {
  this.presentToast('⚠️ Please enter your phone number and password.', 'warning');
  return;
}

if (numericPhone.length !== 10) {
  this.presentToast('⚠️ Phone number must be exactly 10 digits.', 'warning');
  return;
}

const formattedPhone = '+63' + numericPhone;

    const user = await this.registrationService.login(formattedPhone, this.password);

    if (user) {
      this.presentToast('Login successful!', 'success');

       await this.storage.set('userToken', user.token);

      if (this.rememberMe) {
        await this.storage.set('savedPhone', formattedPhone); 
      } else {
        await this.storage.remove('savedPhone');
      }

      this.registrationService.setCurrentUser(user);

      switch (user.role) {
        case 'secretary':
          this.router.navigate(['/secretary-dashboard']);
          break;
        case 'captain':
          this.router.navigate(['/captain-dashboard']);
          break;
        default:
          this.router.navigate(['/resident-dashboard']);
      }
    } else {
      this.presentToast('❌ Invalid phone number or password.', 'danger');
    }
  }

  restrictPhoneInput(event: any) {
    const input = event.target.value;
    this.phone = input.replace(/\D/g, '').slice(0, 10);
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  goToForgotPassword() {
    this.router.navigate(['/forgot-password']);
  }

  goToRegister() {
    this.router.navigate(['/registration']);
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color,
      position: 'top',
    });
    await toast.present();
  }
}

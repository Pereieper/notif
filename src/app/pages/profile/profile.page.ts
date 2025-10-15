import { Component } from '@angular/core';
import { RegistrationService } from 'src/app/services/registration.service';
import { ToastController, NavController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as CryptoJS from 'crypto-js';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class ProfilePage {
  user: any = {};
  isEditing = false;
  isContactModalOpen = false;
  newPassword: string = '';
  confirmPassword: string = '';
  showNewPassword = false;
  showConfirmPassword = false;

  photoBase64: string | null = null;

  constructor(
    private registrationService: RegistrationService,
    private toastCtrl: ToastController,
    private navCtrl: NavController
  ) {}

  goBack() {
    this.navCtrl.back();
  }

  ionViewWillEnter() {
    this.user = this.registrationService.getCurrentUser() || {};
    this.photoBase64 = this.getPhotoBase64();
  }

  getPhotoBase64(): string | null {
    if (!this.user?.photo || this.user.photo.trim() === '') return null;
    const base64 = this.user.photo.replace(/^data:image\/[a-z]+;base64,/, '');
    return 'data:image/png;base64,' + base64;
  }

  onFileChange(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.photoBase64 = reader.result as string;
      this.user.photo = this.photoBase64; // update user object directly
    };
    reader.readAsDataURL(file);
  }

  async toggleEdit() {
    if (this.isEditing) {
      // Validate passwords if provided
      if (this.newPassword || this.confirmPassword) {
        if (this.newPassword !== this.confirmPassword) {
          this.presentToast('⚠️ Passwords do not match.', 'danger');
          return;
        }
        this.user.password = CryptoJS.SHA256(this.newPassword).toString();
      }

      await this.registrationService.updateUser(this.user);
      this.photoBase64 = this.getPhotoBase64(); // refresh photo preview
      this.presentToast('✅ Changes saved successfully.', 'success');

      this.newPassword = '';
      this.confirmPassword = '';
    }

    this.isEditing = !this.isEditing;
  }

  toggleNewPasswordVisibility() {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  openContactModal() {
    if (this.isEditing) this.isContactModalOpen = true;
  }

  closeModal() {
    this.isContactModalOpen = false;
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'top',
      color,
    });
    await toast.present();
  }
}

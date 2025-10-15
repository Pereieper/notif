import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RegistrationService } from 'src/app/services/registration.service';
import { ToastController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Component({
  selector: 'app-registration',
  templateUrl: './registration.page.html',
  styleUrls: ['./registration.page.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule]
})
export class RegistrationPage implements OnInit {
  [key: string]: any;

  // User Info
  firstName = '';
  middleName = '';
  lastName = '';
  dob = '';
  gender = '';
  civilStatus = '';
  contact = '';
  purok = '';
  barangay = '';
  city = '';
  province = '';
  postalCode = '';

  // Security
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirm = false;
  passwordError = false;
  confirmError = false;
  passwordFocused = false;
  confirmFocused = false;

  // Photo (✅ required)
  photo: string = '';

  // Age Validation
  maxDate = '';
  isUnderage = false;
  calculatedAge = 0;
  dobSelected = false;

  // Validation
  nameErrors: { [key: string]: string } = {};

  purokOptions: string[] = [
    'Purok Mangga', 'Purok Tambis', 'Purok Lubi', 'Purok Tinago',
    'Purok Tabok', 'Purok Tagaytay', 'Purok Sapa', 'Purok Centro'
  ];

  constructor(
    private registrationService: RegistrationService,
    private router: Router,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.setMaxDOB();
  }

  // ---------------------------
  // Helpers & Validators
  // ---------------------------
  setMaxDOB() {
    const today = new Date();
    today.setFullYear(today.getFullYear() - 18);
    this.maxDate = today.toISOString().split('T')[0];
  }

  checkAge(value: string | string[] | null | undefined) {
    const dateStr = Array.isArray(value) ? value[0] : value;
    if (!dateStr) return;

    const today = new Date();
    const birthDate = new Date(dateStr);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    this.calculatedAge = age;
    this.isUnderage = age < 18;
    this.dobSelected = true;

    if (this.isUnderage) {
      this.presentToast('🚫 You must be at least 18 years old.', 'warning');
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmVisibility() {
    this.showConfirm = !this.showConfirm;
  }

  validatePassword() {
    const hasUpper = /[A-Z]/.test(this.password);
    const hasLower = /[a-z]/.test(this.password);
    const hasSpecial = /[\W_]/.test(this.password);
    const isLongEnough = this.password.length >= 8;
    this.passwordError = !(hasUpper && hasLower && hasSpecial && isLongEnough);
  }

  autoUppercaseLive(event: any, fieldName: string) {
    const input = event.target;
    const start = input.selectionStart;
    const rawValue = input.value.replace(/[^a-zA-ZñÑ\s'-]/g, '');
    const uppercased = rawValue.toUpperCase();
    this[fieldName] = uppercased;

    setTimeout(() => {
      input.setSelectionRange(start, start);
    });
  }

  validateName(field: string) {
    const value = (this as any)[field];
    const trimmed = value.trim();

    if (!trimmed || /^[\s'-]+$/.test(trimmed)) {
      this.nameErrors[field] = 'Name must not be empty or contain only special characters.';
    } else if (!/^[A-Za-zÑñ\s'-]+$/.test(trimmed)) {
      this.nameErrors[field] = 'Only letters, spaces, hyphens, and apostrophes are allowed.';
    } else {
      this.nameErrors[field] = '';
    }
  }

  preventPaste(event: Event) {
    event.preventDefault();
  }

  // ---------------------------
  // Registration
  // ---------------------------
  async register() {
    this.validatePassword();
    this.confirmError = this.password !== this.confirmPassword;

    const missingFields: string[] = [];
    if (!this.firstName) missingFields.push('First Name');
    if (!this.lastName) missingFields.push('Last Name');
    if (!this.contact) missingFields.push('Contact Number');
    if (!this.gender) missingFields.push('Gender');
    if (!this.dob) missingFields.push('Date of Birth');
    if (!this.password) missingFields.push('Password');
    if (!this.confirmPassword) missingFields.push('Confirm Password');
    if (!this.purok) missingFields.push('Purok');
    if (!this.photo) missingFields.push('Photo'); // ✅ Required

    if (missingFields.length > 0) {
      const message = `⚠️ Missing: ${missingFields.join(', ')}`;
      await this.presentToast(message, 'warning');
      return;
    }

    if (this.isUnderage) {
      await this.presentToast('🚫 You must be at least 18 years old to register.', 'danger');
      return;
    }

    if (this.passwordError || this.confirmError) {
      await this.presentToast('❌ Please fix password errors.', 'danger');
      return;
    }

    const isValidName = (name: string) => {
      const trimmed = name.trim();
      return trimmed && /^[A-Za-zÑñ\s'-]+$/.test(trimmed);
    };

    if (![this.firstName, this.lastName].every(isValidName)) {
      await this.presentToast('❌ Names must only contain letters, spaces, hyphens, or apostrophes.', 'danger');
      return;
    }

    // ✅ Normalize phone for backend (09XXXXXXXXX)
    function normalizeForBackend(phone: string): string {
      const cleaned = phone.replace(/\D/g, '');
      if (cleaned.startsWith('63')) return '0' + cleaned.slice(2);
      if (cleaned.startsWith('9') && cleaned.length === 10) return '0' + cleaned;
      return cleaned;
    }
    const backendContact = normalizeForBackend(this.contact);

    if (!/^09\d{9}$/.test(backendContact)) {
      await this.presentToast('⚠️ Enter a valid 11-digit mobile number (starts with 09)', 'warning');
      return;
    }

    // ✅ Duplicate checks
    const isDupContact = await this.registrationService.isDuplicateContact(backendContact);
    const isDupName = await this.registrationService.isDuplicateName(this.firstName, this.middleName, this.lastName);
    if (isDupContact || isDupName) {
      await this.presentToast('⚠️ Duplicate record found.', 'danger');
      return;
    }

    // ✅ Prepare record
    const newRecord = {
      firstName: this.firstName.trim(),
      middleName: this.middleName.trim(),
      lastName: this.lastName.trim(),
      dob: this.dob,
      gender: this.gender,
      civilStatus: this.civilStatus,
      contact: backendContact,
      purok: this.purok,
      barangay: this.barangay,
      city: this.city,
      province: this.province,
      postalCode: this.postalCode,
      password: this.password,
      photo: this.photo, // ✅ Required
      role: 'resident',
    };

    if (!navigator.onLine) {
      await this.presentToast('⚠️ Internet required to register.', 'warning');
      return;
    }

    try {
      const user = await this.registrationService.register(newRecord);

      // Save offline copy
      await this.registrationService.saveOfflineUser({ ...user, password: newRecord.password });

      await this.presentToast('✅ Registered successfully!', 'success');
      this.clearForm();
      this.router.navigate(['/login']);
    } catch (err: any) {
      console.error('❌ Registration failed:', err.message);
      await this.presentToast(`❌ ${err.message}`, 'danger');
    }
  }

  // ---------------------------
  // Photo
  // ---------------------------
  async takePhoto() {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });
      this.photo = image.dataUrl || '';
    } catch (error) {
      await this.presentToast('❌ Failed to take photo.', 'danger');
      console.error(error);
    }
  }

  // ---------------------------
  // Helpers
  // ---------------------------
  clearForm() {
    this.firstName = '';
    this.middleName = '';
    this.lastName = '';
    this.dob = '';
    this.gender = '';
    this.civilStatus = '';
    this.contact = '';
    this.purok = '';
    this.barangay = '';
    this.city = '';
    this.province = '';
    this.postalCode = '';
    this.password = '';
    this.confirmPassword = '';
    this.photo = '';
    this.passwordError = false;
    this.confirmError = false;
    this.showPassword = false;
    this.showConfirm = false;
    this.isUnderage = false;
    this.calculatedAge = 0;
    this.dobSelected = false;
    this.nameErrors = {};
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'top',
    });
    await toast.present();
  }

  async testView() {
    const all = await this.registrationService.getAllRegistrations();
    console.log('📄 All registrations:', all);
  }
}

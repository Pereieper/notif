import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, AlertController, ActionSheetController, Platform } from '@ionic/angular';
import { DocumentRequestService } from 'src/app/services/document-request.service';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { RegistrationService } from 'src/app/services/registration.service';

@Component({
  selector: 'app-request-document',
  templateUrl: './request-document.page.html',
  styleUrls: ['./request-document.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class RequestDocumentPage implements OnInit {
  documentType = '';
  purpose = '';
  customPurpose = '';
  numberOfCopies = 1;
  requirements = '';
  photo = '';
  uploadedPhoto: string | null = null;
  dateNow: string = '';
  timeNow: string = '';
  requests: any[] = [];

  documentOptions = ['Barangay Clearance', 'Certificate of Residency', 'Certificate of Indigency'];
  purposeOptions = ['Employment', 'School Requirement', 'Financial Assistance', 'Others'];

  constructor(
    private navCtrl: NavController,
    private requestService: DocumentRequestService,
    private alertCtrl: AlertController,
    private actionSheetCtrl: ActionSheetController,
    private platform: Platform,
    private registrationService: RegistrationService
  ) {}

  ngOnInit() {
    const now = new Date();
    this.dateNow = now.toLocaleDateString();
    this.timeNow = now.toLocaleTimeString();

    const currentUser = this.registrationService.getCurrentUser();
    if (currentUser?.contact) this.loadUserRequests(currentUser.contact);
  }

  async loadUserRequests(contact: string) {
    this.requests = await this.requestService.getRequestsByContact(contact);
  }

async onContinue() {
  try {
    if (this.purpose === 'Others' && !this.customPurpose.trim()) { 
      alert('Please specify your purpose.'); 
      return; 
    }
    if (this.numberOfCopies < 1) { 
      alert('Number of copies must be at least 1.'); 
      return; 
    }

    const finalPurpose = this.purpose === 'Others' ? this.customPurpose : this.purpose;
    const currentUser = this.registrationService.getCurrentUser();
    if (!currentUser?.contact) { 
      alert('No logged-in user found.'); 
      return; 
    }

    const requestData = {
      documentType: this.documentType,
      purpose: finalPurpose,
      copies: this.numberOfCopies,
      requirements: this.requirements,
      photo: this.photo,
      timestamp: new Date().toISOString(),
      contact: currentUser.contact
    };

    await this.requestService.addRequest(requestData);
    alert('Your request has been submitted.');
    this.resetForm();
    this.loadUserRequests(currentUser.contact);

  } catch (err: any) {
    console.error('Submit failed:', err);

    // Check for HTTP response from backend
    let message = 'Failed to submit request. Check console for details.';
    if (err?.error) {
      try {
        const backendError = typeof err.error === 'string' ? JSON.parse(err.error) : err.error;
        if (backendError?.detail) message = backendError.detail;
      } catch (parseErr) {
        console.warn('Error parsing backend response', parseErr);
      }
    }

    alert(message);
  }
}



  async openPhotoOptions() {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt
      });
      this.uploadedPhoto = image.dataUrl || null;
      this.photo = image.dataUrl || '';
    } catch (err) { console.error('Failed to get photo', err); }
  }

  resetForm() {
    this.documentType = '';
    this.purpose = '';
    this.customPurpose = '';
    this.numberOfCopies = 1;
    this.requirements = '';
    this.photo = '';
    this.uploadedPhoto = null;
  }

  onCancel() { this.navCtrl.back(); }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController } from '@ionic/angular';
import { DocumentRequestService, DocumentRequestPayload } from 'src/app/services/document-request.service';
import { RegistrationService } from 'src/app/services/registration.service';

@Component({
  selector: 'app-request-log',
  templateUrl: './request-log.page.html',
  styleUrls: ['./request-log.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class RequestLogPage implements OnInit {
  requests: DocumentRequestPayload[] = [];
  paginatedRequests: DocumentRequestPayload[] = [];
  selectedRequest: DocumentRequestPayload | null = null;
  showModal = false;

  // ✅ Resubmit modal
  showResubmitModal = false;
  updatedPurpose = '';
  updatedRequirements = '';

  // ✅ Pagination & search
  currentPage = 1;
  itemsPerPage = 5;
  totalPages = 1;
  searchTerm = '';

  constructor(
    private documentRequestService: DocumentRequestService,
    private registrationService: RegistrationService,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    const currentUser = this.registrationService.getCurrentUser();
    if (currentUser?.contact) {
      this.loadRequests(currentUser.contact);
    }
  }

  async loadRequests(contact: string) {
    try {
      this.requests = await this.documentRequestService.getRequestsByContact(contact);
      this.filterRequests();
    } catch (err) {
      console.error('❌ Failed to load requests:', err);
    }
  }

  // ---------------- Cancel / Delete ----------------
  async cancelRequest(request: DocumentRequestPayload) {
    try {
      await this.documentRequestService.cancelRequestById(request.id!);
      alert('Request cancelled.');
      this.loadRequests(this.registrationService.getCurrentUser().contact);
    } catch (err) {
      console.error('❌ Cancel error:', err);
      alert('Failed to cancel request.');
    }
  }

  async deleteRequest(request: DocumentRequestPayload) {
    try {
      await this.documentRequestService.deleteRequestById(request.id!);
      alert('Request deleted.');
      this.loadRequests(this.registrationService.getCurrentUser().contact);
    } catch (err) {
      console.error('❌ Delete error:', err);
      alert('Failed to delete request.');
    }
  }

  // ---------------- View details ----------------
  viewDetails(request: DocumentRequestPayload) {
    this.selectedRequest = request;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedRequest = null;
  }

  // ---------------- Resubmit ----------------
  openResubmitModal(request: DocumentRequestPayload) {
    this.selectedRequest = request;
    this.updatedPurpose = request.purpose || '';
    this.updatedRequirements = request.requirements || '';
    this.showResubmitModal = true;
  }

  cancelResubmit() {
    this.showResubmitModal = false;
    this.updatedPurpose = '';
    this.updatedRequirements = '';
  }

  async confirmResubmit() {
    if (!this.selectedRequest?.id) return;

    try {
      await this.documentRequestService.updateRequest({
        id: this.selectedRequest.id,
        purpose: this.updatedPurpose,
        requirements: this.updatedRequirements,
        status: 'Pending',
        notes: '' // ✅ clear notes once resubmitted
      });

      this.cancelResubmit();
      this.loadRequests(this.registrationService.getCurrentUser().contact);

      const alert = await this.alertCtrl.create({
        header: 'Success',
        message: 'Your request has been resubmitted.',
        buttons: ['OK']
      });
      await alert.present();
    } catch (err) {
      console.error('❌ Resubmit error:', err);
      alert('Failed to resubmit request.');
    }
  }

  // ---------------- Status color ----------------
  getStatusColor(status: string) {
    switch (status) {
      case 'Pending': return 'warning';
      case 'Returned': return 'tertiary'; // ✅ new status color
      case 'Approved': return 'success';
      case 'For Pickup': return 'dark';
      case 'Rejected': return 'danger';
      case 'Cancelled': return 'medium';
      default: return 'medium';
    }
  }

  // ---------------- Pagination & Search ----------------
  filterRequests() {
    let filtered = this.requests;
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = this.requests.filter(r =>
        r.documentType?.toLowerCase().includes(term) ||
        r.purpose?.toLowerCase().includes(term) ||
        r.status?.toLowerCase().includes(term)
      );
    }
    this.totalPages = Math.ceil(filtered.length / this.itemsPerPage) || 1;
    this.currentPage = 1;
    this.paginateRequests(filtered);
  }

  paginateRequests(filteredRequests?: DocumentRequestPayload[]) {
    const list = filteredRequests || this.requests;
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedRequests = list.slice(start, end);
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.paginateRequests();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.paginateRequests();
    }
  }
}

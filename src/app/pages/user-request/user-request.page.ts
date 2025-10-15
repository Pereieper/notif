import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButton, IonModal, IonCheckbox, IonInput, IonItem,
  IonLabel, IonBadge, IonSelect, IonSelectOption,
  IonSearchbar, IonIcon, IonList
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { DocumentRequestService, DocumentRequestPayload, RequestStatus } from '../../services/document-request.service';

@Component({
  selector: 'app-user-request',
  templateUrl: './user-request.page.html',
  styleUrls: ['./user-request.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButton, IonModal, IonCheckbox, IonInput,
    IonItem, IonLabel, IonBadge, IonSelect,
    IonSelectOption, IonSearchbar, IonIcon, IonList
  ]
})
export class UserRequestPage implements OnInit {
  requests: DocumentRequestPayload[] = [];
  currentDate = '';
  currentTime = '';
  selectedStatus = 'All';
  searchText = '';
  selectedRequest: DocumentRequestPayload | null = null;

  // 🔹 Pagination
  currentPage = 1;
  pageSize = 5;

  showRejectModal = false;
  showUpdateModal = false;
  rejectionReasons = {
    noID: false,
    blurryPhoto: false,
    wrongZone: false,
    duplicate: false,
    notFound: false,
    other: ''
  };
  updateReasons = {
    missingID: false,
    other: ''
  };

  constructor(
    private router: Router,
    private alertController: AlertController,
    private requestService: DocumentRequestService
  ) {}

  ngOnInit() {
    setInterval(() => {
      const now = new Date();
      this.currentDate = now.toDateString();
      this.currentTime = now.toLocaleTimeString();
    }, 1000);

    this.loadRequests();
  }

  async loadRequests() {
    try {
      this.requests = await this.requestService.getAllRequests();
    } catch (err) {
      console.error('Error loading requests:', err);
    }
  }

  // ----- VIEW REQUEST MODAL -----
  async viewRequestModal(req: DocumentRequestPayload) {
    this.selectedRequest = req;

    const alert = await this.alertController.create({
      header: 'Request Details',
      message: `
        Name: ${req.user?.firstName} ${req.user?.lastName}<br>
        Document: ${req.documentType}<br>
        Purpose: ${req.purpose}<br>
        ID/Photo: ${req.user?.photo ? 'Provided' : 'N/A'}<br>
        Requested On: ${req.created_at || 'N/A'}<br>
        Pickup Date: ${req.pickup_date || 'N/A'}<br>
        Status: ${req.status || 'Pending'}<br>
        Notes/Reason: ${req.notes || '-'}
      `,
      buttons: this.getActionButtons(req)
    });

    await alert.present();
  }

  getActionButtons(req: DocumentRequestPayload) {
    const buttons: any[] = [];
    const status = req.status || 'Pending';

    if (status === 'Pending') {
      buttons.push(
        { text: 'Approve', handler: () => this.confirmApprove(req) },
        { text: 'Request Update', handler: () => this.openUpdateModal(req) },
        { text: 'Reject', handler: () => this.openRejectModal(req) }
      );
    } else if (status === 'Approved') {
      buttons.push({ text: 'For Print', handler: () => this.nextAction(req) });
    } else if (status === 'For Print') {
      buttons.push({ text: 'For Pickup', handler: () => this.nextAction(req) });
    } else if (status === 'For Pickup') {
      buttons.push({ text: 'Mark as Released', handler: () => this.nextAction(req) });
    } else if (status === 'Returned') {
      buttons.push({ text: 'Awaiting User Resubmission', role: 'cancel' });
    } else if (status === 'Completed' || status === 'Rejected' || status === 'Expired') {
      buttons.push({ text: 'View Details', role: 'cancel' });
    }

    buttons.push({ text: 'Close', role: 'cancel' });
    return buttons;
  }

  // ----- APPROVE -----
  async confirmApprove(req: DocumentRequestPayload) {
    const alert = await this.alertController.create({
      header: 'Confirm Approval',
      message: `Are you sure you want to approve ${req.user?.firstName} ${req.user?.lastName}'s request?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Approve',
          handler: async () => {
            if (req.id != null) {
              await this.requestService.updateStatus({
                id: req.id,
                status: 'Approved' as RequestStatus,
                action: 'Review'
              });
              await this.loadRequests();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // ----- NEXT STATUS -----
  async nextAction(req: DocumentRequestPayload) {
    if (!req.id) return;
    let newStatus: RequestStatus | null = null;

    switch (req.status) {
      case 'Approved': newStatus = 'For Print' as RequestStatus; break;
      case 'For Print': newStatus = 'For Pickup' as RequestStatus; break;
      case 'For Pickup': newStatus = 'Completed' as RequestStatus; break;
    }

    if (newStatus) {
      await this.requestService.updateStatus({ id: req.id, status: newStatus });
      await this.loadRequests();
    }
  }

  // ----- REQUEST UPDATE -----
  openUpdateModal(req: DocumentRequestPayload) {
    this.selectedRequest = req;
    this.showUpdateModal = true;
  }

  cancelUpdate() {
    this.showUpdateModal = false;
    this.updateReasons = { missingID: false, other: '' };
  }

  confirmUpdate() {
    if (!this.selectedRequest?.id) return;

    const reason = [
      this.updateReasons.missingID && 'Missing valid ID',
      this.updateReasons.other
    ].filter(Boolean).join(', ') || 'Update required';

    this.requestService.updateStatus({
      id: this.selectedRequest.id,
      status: 'Returned' as RequestStatus,
      action: 'Update Request',
      notes: reason
    }).then(() => this.loadRequests());

    this.cancelUpdate();
  }

  // ----- REJECT -----
  openRejectModal(req: DocumentRequestPayload) {
    this.selectedRequest = req;
    this.showRejectModal = true;
  }

  cancelReject() {
    this.showRejectModal = false;
    this.rejectionReasons = { noID:false, blurryPhoto:false, wrongZone:false, duplicate:false, notFound:false, other:'' };
  }

  confirmReject() {
    if (!this.selectedRequest?.id) return;

    const reason = [
      this.rejectionReasons.noID && 'No ID',
      this.rejectionReasons.blurryPhoto && 'Blurry Photo',
      this.rejectionReasons.wrongZone && 'Wrong Zone',
      this.rejectionReasons.duplicate && 'Duplicate',
      this.rejectionReasons.notFound && 'Not Found',
      this.rejectionReasons.other
    ].filter(Boolean).join(', ') || 'Rejected';

    this.requestService.updateStatus({
      id: this.selectedRequest.id,
      status: 'Rejected' as RequestStatus,
      action: 'Reject',
      notes: reason
    }).then(() => this.loadRequests());

    this.cancelReject();
  }

  // ----- FILTER + PAGINATION -----
  filteredRequests(): DocumentRequestPayload[] {
    const filtered = this.requests.filter(req => {
      const status = req.status || 'Pending';
      const matchesStatus = this.selectedStatus === 'All' || status === this.selectedStatus;
      const userFullName = [req.user?.firstName || '', req.user?.middleName || '', req.user?.lastName || '']
        .join(' ').toLowerCase();

      return matchesStatus &&
        (req.contact + ' ' + req.documentType + ' ' + (req.notes || '') + ' ' + userFullName)
          .toLowerCase()
          .includes(this.searchText.toLowerCase());
    });

    const start = (this.currentPage - 1) * this.pageSize;
    return filtered.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(
      this.requests.filter(req => {
        const status = req.status || 'Pending';
        const matchesStatus = this.selectedStatus === 'All' || status === this.selectedStatus;
        const userFullName = [req.user?.firstName || '', req.user?.middleName || '', req.user?.lastName || '']
          .join(' ').toLowerCase();
        return matchesStatus &&
          (req.contact + ' ' + req.documentType + ' ' + (req.notes || '') + ' ' + userFullName)
            .toLowerCase()
            .includes(this.searchText.toLowerCase());
      }).length / this.pageSize
    );
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  // ----- UTILITIES -----
  convertPhoto(photo?: string): string {
    if (!photo) return 'assets/default-user.png';
    if (photo.startsWith('data:image')) return photo;
    return `data:image/png;base64,${photo}`;
  }

  navigateTo(path: string) {
    this.router.navigate(['/' + path]);
  }

  getStatusColor(status: string) {
    switch (status) {
      case 'Pending': return 'warning';
      case 'Approved': return 'success';
      case 'For Print': return 'primary';
      case 'For Pickup': return 'tertiary';
      case 'Completed': return 'dark';
      case 'Rejected': return 'danger';
      case 'Returned': return 'medium';
      case 'Expired': return 'danger';
      default: return 'medium';
    }
  }

  // ----- RESUBMIT REQUEST -----
  async resubmitRequest(req: DocumentRequestPayload) {
    if (!req.id) return;

    try {
      const updated = await this.requestService.updateRequest({
        id: req.id,
        status: 'Pending' as RequestStatus,
        action: 'Resubmit',
        notes: ''
      });

      console.log('✅ Resubmitted:', updated);
      await this.loadRequests();

      const alert = await this.alertController.create({
        header: 'Resubmitted',
        message: 'Your request has been resubmitted successfully.',
        buttons: ['OK']
      });
      await alert.present();

    } catch (err) {
      console.error('❌ Resubmit failed:', err);
    }
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Logout', handler: () => { localStorage.clear(); this.router.navigate(['/login']); } }
      ]
    });
    await alert.present();
  }
}

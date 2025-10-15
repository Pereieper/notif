import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonIcon, 
  AlertController, IonButton, IonModal, IonCheckbox, IonInput, IonItem, IonLabel 
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { IndexedDBService } from '../../services/indexed-db.service';
import { catchError } from 'rxjs';
import { UserService, User } from '../../services/user.service';

@Component({
  selector: 'app-user-registration',
  templateUrl: './user-registration.page.html',
  styleUrls: ['./user-registration.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonIcon,
    IonButton, IonModal, IonCheckbox, IonInput, IonItem, IonLabel
  ]
})
export class UserRegistrationPage implements OnInit {
  users: User[] = [];
  currentDate: string = '';
  currentTime: string = '';
  selectedStatus: string = 'All';
  searchText: string = '';
  selectedId: number | null = null;

  // Rejection modal variables
  showRejectModal = false;
  selectedRejectUserId: number | null = null;
  rejectionReasons = {
    noID: false,
    blurryPhoto: false,
    wrongZone: false,
    duplicate: false,
    notFound: false,
    other: ''
  };

  constructor(
    private router: Router,
    private alertController: AlertController,
    private userService: UserService,
    private idb: IndexedDBService
  ) {}

  ngOnInit() {
    // Live date & time
    setInterval(() => {
      const now = new Date();
      this.currentDate = now.toDateString();
      this.currentTime = now.toLocaleTimeString();
    }, 1000);

    this.loadUsers();
  }

  loadUsers() {
    this.userService.getUsers()
      .pipe(
        catchError(async (err) => {
          console.error('Error loading users, loading from IndexedDB...', err);
          const offlineUsers = await this.idb.getAllUsers();
          return offlineUsers;
        })
      )
      .subscribe((data: User[]) => {
        this.users = data;
      });
  }

  approveUser(id: number) {
    this.userService.updateUserStatus(id, 'Approved')
      .subscribe(() => this.loadUsers());
  }

  openRejectModal(id: number) {
    this.selectedRejectUserId = id;
    this.rejectionReasons = {
      noID: false,
      blurryPhoto: false,
      wrongZone: false,
      duplicate: false,
      notFound: false,
      other: ''
    };
    this.showRejectModal = true;
  }

  confirmReject() {
    if (this.selectedRejectUserId !== null) {
      const reason = Object.entries(this.rejectionReasons)
        .filter(([key, val]) => val && key !== 'other')
        .map(([key]) => key)
        .concat(this.rejectionReasons.other ? [this.rejectionReasons.other] : [])
        .join(', ');

      console.log('Reject reason:', reason);

      this.userService.updateUserStatus(this.selectedRejectUserId, 'Rejected')
        .subscribe(() => {
          this.loadUsers();
          this.showRejectModal = false;
          this.selectedRejectUserId = null;
        });
    }
  }

  cancelReject() {
    this.showRejectModal = false;
    this.selectedRejectUserId = null;
  }

  reReview(id: number) {
    this.userService.updateUserStatus(id, 'Pending')
      .subscribe(() => this.loadUsers());
  }

  filteredUsers() {
    return this.users.filter(user => {
      const matchesStatus = this.selectedStatus === 'All' || (user.status || 'Pending') === this.selectedStatus;
      const matchesSearch = (user.firstName + ' ' + user.lastName).toLowerCase().includes(this.searchText.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }

  navigateTo(path: string) {
    this.router.navigate(['/' + path]);
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Logout',
          handler: () => {
            localStorage.clear();
            this.router.navigate(['/login']);
          }
        }
      ]
    });

    await alert.present();
  }
}

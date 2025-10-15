import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { IonicModule, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { DocumentRequestService, DocumentRequestPayload } from 'src/app/services/document-request.service';
import { ChangeDetectorRef } from '@angular/core';
import { NotificationService } from 'src/app/services/notification.service';


Chart.register(...registerables);

@Component({
  selector: 'app-secretary-dashboard',
  templateUrl: './secretary-dashboard.page.html',
  styleUrls: ['./secretary-dashboard.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class SecretaryDashboardPage implements OnInit, OnDestroy {

  requestData: DocumentRequestPayload[] = [];
  filteredData: DocumentRequestPayload[] = [];

  totalRequests = 0;
  pendingRequests = 0;
  completedRequests = 0;
  approvedCount = 0;
  rejectedCount = 0;

  currentDate: Date = new Date();
  selectedFilter = 'thisMonth';

  barChart!: Chart;
  pieChart!: Chart;
  statusChart!: Chart;

  notifications: { 
    id?: number;
    title: string; 
    message: string; 
    timestamp: Date; 
    is_read?: boolean;
  }[] = [];

  notificationCount = 0;
  showNotifications = false;

  private notificationInterval: any;

  constructor(
    private router: Router,
    private alertController: AlertController,
    private documentRequestService: DocumentRequestService,
    private cd: ChangeDetectorRef,
    private notificationService: NotificationService
  ) {}

  async ngOnInit() {
    await this.loadDashboardCounts();
    await this.checkNewRequests();

    // Auto-refresh notifications every 10 seconds
    this.notificationInterval = setInterval(() => {
      this.checkNewRequests();
    }, 10000);
  }

  ngOnDestroy() {
    if (this.barChart) this.barChart.destroy();
    if (this.pieChart) this.pieChart.destroy();
    if (this.statusChart) this.statusChart.destroy();
    if (this.notificationInterval) clearInterval(this.notificationInterval);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: any) {
    const target = event.target;
    if (!target.closest('.notification-wrapper')) {
      this.showNotifications = false;
    }
  }

  async loadDashboardCounts() {
    const allRequests: DocumentRequestPayload[] = await this.documentRequestService.getAllRequests();
    this.requestData = allRequests;

    this.totalRequests = allRequests.length;
    this.pendingRequests = allRequests.filter(r => r.status === 'Pending').length;
    this.completedRequests = allRequests.filter(r => r.status === 'Completed').length;
    this.approvedCount = allRequests.filter(r => r.status === 'Approved').length;
    this.rejectedCount = allRequests.filter(r => r.status === 'Rejected').length;

    this.filterData(this.selectedFilter);
    this.cd.detectChanges();

    this.renderBarChart();
    this.renderPieChart();
    this.renderStatusChart();
  }

  renderBarChart() {
    const canvas = document.getElementById('barChart') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (this.barChart) this.barChart.destroy();

    this.barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Pending', 'Approved', 'Rejected', 'Completed'],
        datasets: [{
          label: 'Requests Summary',
          data: [this.pendingRequests, this.approvedCount, this.rejectedCount, this.completedRequests],
          backgroundColor: ['#FFA500', '#4CAF50', '#F44336', '#2196F3']
        }]
      },
      options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
  }

  renderPieChart() {
    const canvas = document.getElementById('pieChart') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (this.pieChart) this.pieChart.destroy();

    const typeCounts: { [key: string]: number } = {};
    this.requestData.forEach(r => {
      const type = r.documentType || 'Unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    this.pieChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: Object.keys(typeCounts),
        datasets: [{
          data: Object.values(typeCounts),
          backgroundColor: Object.keys(typeCounts).map(() => this.randomColor())
        }]
      },
      options: { responsive: true }
    });
  }

  renderStatusChart() {
    const canvas = document.getElementById('statusChart') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (this.statusChart) this.statusChart.destroy();

    const statusCounts: { [key: string]: number } = {};
    this.requestData.forEach(r => {
      const status = r.status || 'Unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    this.statusChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: Object.keys(statusCounts),
        datasets: [{
          data: Object.values(statusCounts),
          backgroundColor: Object.keys(statusCounts).map(() => this.randomColor())
        }]
      },
      options: { responsive: true }
    });
  }

  randomColor(): string {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    return `rgba(${r},${g},${b},0.7)`;
  }

  convertPhoto(photo: string | null | undefined): string {
  // No image provided → use default
  if (!photo || photo.trim() === '') {
    return 'assets/default-user.png';
  }

  // Already valid base64 data URI
  if (photo.startsWith('data:image')) {
    return photo;
  }

  // Raw base64 string (no header)
  if (/^[A-Za-z0-9+/=]+={0,2}$/.test(photo)) {
    return `data:image/png;base64,${photo}`;
  }

  // Full HTTP(S) URL
  if (photo.startsWith('http')) {
    return photo;
  }

  // Filename like “default.jpg” or “user.png”
  if (photo.match(/\.(jpg|jpeg|png|gif)$/i)) {
    return `assets/${photo}`;
  }

  // Everything else → fallback image
  return 'assets/default-user.png';
}

 filterData(filter: string) {
  const now = new Date();
  let startDate: Date | null = null;
  let endDate: Date = now;

  switch (filter) {
    case 'thisWeek':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay()); // Sunday of this week
      break;

    case 'lastWeek':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay() - 7); // Sunday of last week
      endDate = new Date(now);
      endDate.setDate(now.getDate() - now.getDay() - 1); // Saturday of last week
      break;

    case 'thisMonth':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;

    case 'lastMonth':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      break;

    case 'all':
    default:
      startDate = null; // no filtering
      break;
  }

  this.filteredData = this.requestData
    .filter(r => {
      // Always include even if created_at is missing
      if (!r.created_at) return true;

      const reqDate = new Date(r.created_at);
      if (!startDate) return true; // "all" filter

      return reqDate >= startDate && reqDate <= endDate;
    })
    .sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA; // newest first
    })
    .slice(0, 5); // show only latest 5
}



  getStatusColor(status?: string): string {
    switch(status) {
      case 'Pending': return 'warning';
      case 'Approved': return 'success';
      case 'Rejected': return 'danger';
      case 'Completed': return 'medium';
      case 'For Pickup': return 'primary';
      default: return 'light';
    }
  }

 async checkNewRequests() {
  try {
    // ✅ ensure fallback empty array if undefined
    const notifs = (await this.notificationService.getAllNotifications().toPromise()) || [];

    // ✅ map notifications properly with id + is_read
    this.notifications = notifs.map((n: any) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      timestamp: new Date(n.created_at),
      is_read: n.is_read
    }));

    // ✅ count unread notifications safely
    this.notificationCount = this.notifications.filter(n => !n.is_read).length;
  } catch (error) {
    console.error('Error loading notifications:', error);
  }
}



 async markAsRead(notif: any) {
  if (!notif.id) return;
  try {
    await this.notificationService.markAsRead(notif.id).toPromise();
    notif.is_read = true;
    this.notificationCount = this.notifications.filter(n => !n.is_read).length;
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}


  openNotifications() {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) this.notificationCount = 0;
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
        { text: 'Logout', handler: () => { localStorage.clear(); this.router.navigate(['/login']); } }
      ]
    });
    await alert.present();
  }

  goToUserRequest(req: DocumentRequestPayload) {
    this.router.navigate(['/user-request'], { queryParams: { id: req.id } });
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-captain-dashboard',
  templateUrl: './captain-dashboard.page.html',
  styleUrls: ['./captain-dashboard.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class CaptainDashboardPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}

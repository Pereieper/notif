import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonInput, IonButton } from '@ionic/angular/standalone';

@Component({
  selector: 'app-verify-code',
  templateUrl: './verify-code.page.html',
  styleUrls: ['./verify-code.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonInput, IonButton],
})
export class VerifyCodePage {
  code: string[] = ['', '', '', '', '', ''];
  timer: number = 30;
  interval: any;

  constructor(private router: Router) {}

  ngOnInit() {
    this.startTimer();
  }

  startTimer() {
    this.interval = setInterval(() => {
      if (this.timer > 0) {
        this.timer--;
      } else {
        clearInterval(this.interval);
      }
    }, 1000);
  }

  resendCode() {
    this.timer = 30;
    this.startTimer();
    // Add resend code logic here (API call)
  }

  verify() {
    const fullCode = this.code.join('');
    if (fullCode.length === 6) {
      // Add verification logic here
      this.router.navigate(['/reset-password']);
    }
  }
}

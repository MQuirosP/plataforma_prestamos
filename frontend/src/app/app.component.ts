import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoanService } from './services/loan.service';
import { AdminService } from './services/admin.service';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ExpiredComponent } from './expired/expired.component';
import { SettingsComponent } from './settings/settings.component';
import { LoginComponent } from './login/login.component';
import { OnboardingComponent } from './onboarding/onboarding.component';
import { AdminComponent } from './admin/admin.component';
import { ToastComponent } from './toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, DashboardComponent, ExpiredComponent, SettingsComponent, LoginComponent, OnboardingComponent, AdminComponent, ToastComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  loanService = inject(LoanService);
  adminService = inject(AdminService);
  currentScreen = signal<'dashboard' | 'settings'>('dashboard');

  onOnboardingFinished() {
    this.loanService.isNewUser.set(false);
    this.loanService.loadLoans();
  }

  returnToAdmin() {
    this.adminService.returnToAdmin();
  }
}

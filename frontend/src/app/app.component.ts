import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoanService } from './services/loan.service';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ExpiredComponent } from './expired/expired.component';
import { SettingsComponent } from './settings/settings.component';
import { LoginComponent } from './login/login.component';
import { OnboardingComponent } from './onboarding/onboarding.component';
import { AdminComponent } from './admin/admin.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, DashboardComponent, ExpiredComponent, SettingsComponent, LoginComponent, OnboardingComponent, AdminComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  loanService = inject(LoanService);
  currentScreen = signal<'dashboard' | 'settings'>('dashboard');

  onOnboardingFinished() {
    this.loanService.isNewUser.set(false);
    // Reload loans to pick up the updated settings (e.g. currency symbol, business name)
    this.loanService.loadLoans();
  }
}

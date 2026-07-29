import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoanService, Role } from './services/loan.service';
import { AdminService } from './services/admin.service';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ExpiredComponent } from './expired/expired.component';
import { SettingsComponent } from './settings/settings.component';
import { LoginComponent } from './login/login.component';
import { OnboardingComponent } from './onboarding/onboarding.component';
import { AdminComponent } from './admin/admin.component';
import { ToastComponent } from './toast/toast.component';
import { CreateLoanComponent } from './create-loan/create-loan.component';
import { EditLoanComponent } from './edit-loan/edit-loan.component';
import { TeamManagementComponent } from './team-management/team-management.component';
import { Loan } from './services/loan.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, DashboardComponent, ExpiredComponent, SettingsComponent, LoginComponent, OnboardingComponent, AdminComponent, ToastComponent, CreateLoanComponent, EditLoanComponent, TeamManagementComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  Role = Role;
  loanService = inject(LoanService);
  adminService = inject(AdminService);
  currentScreen = signal<'dashboard' | 'settings' | 'create-loan' | 'edit-loan' | 'team-management'>('dashboard');
  selectedLoanForEdit = signal<Loan | null>(null);

  openEditLoanScreen(loan: Loan) {
    this.selectedLoanForEdit.set(loan);
    this.currentScreen.set('edit-loan');
  }

  onOnboardingFinished() {

    this.loanService.isNewUser.set(false);
    this.loanService.loadLoans();
  }

  returnToAdmin() {
    this.adminService.returnToAdmin();
  }
}

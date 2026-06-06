import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoanService } from './services/loan.service';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ExpiredComponent } from './expired/expired.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, DashboardComponent, ExpiredComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  loanService = inject(LoanService);
}

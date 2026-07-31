import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoanService, Role } from '../../services/loan.service';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="border-b border-industrial-border px-5 py-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md bg-opacity-95" style="background-color: #111111;">
      <div class="flex items-center gap-2.5">
        <img src="/assets/images/logo-header.webp" width="220" height="44" class="h-11 w-auto object-contain cursor-pointer" alt="Cat-Loan Logo" (click)="goHome.emit()">
        <div>
          <h1 class="text-sm font-black text-white leading-none tracking-tight uppercase cursor-pointer" (click)="goHome.emit()">
            {{ loanService.settings()?.nombreNegocio || 'CAT-LOAN' }}
          </h1>
          <p class="text-[9px] text-caterpillar uppercase tracking-wider font-mono mt-0.5">CONSOLE</p>
        </div>
      </div>

      <div class="flex items-center gap-1.5">
        <ng-container *ngIf="loanService.currentUser()?.rol !== Role.COBRADOR && currentScreen === 'dashboard'">
          <!-- Add Loan button — hidden on mobile (uses FAB instead) -->
          <button (click)="openCreateModal.emit()" 
                  class="hidden md:flex bg-caterpillar hover:bg-caterpillar-dark text-industrial-black px-3 py-2 rounded-lg font-bold transition duration-150 shadow-md items-center gap-1.5 text-xs"
                  title="Agregar Préstamo">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span class="font-black uppercase tracking-tight">Nuevo</span>
          </button>
        </ng-container>

        <!-- Settings button -->
        <button (click)="openSettings.emit()" 
                [class.text-caterpillar]="currentScreen === 'settings'"
                [class.text-industrial-muted]="currentScreen !== 'settings'"
                class="bg-industrial-surface border border-industrial-border p-2 rounded-lg hover:text-caterpillar transition duration-150"
                title="Configuración">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        <!-- Logout button -->
        <button (click)="logout()" 
                class="bg-industrial-surface border border-industrial-border p-2 rounded-lg text-industrial-muted hover:text-semantic-red transition duration-150"
                title="Cerrar Sesión">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  `
})
export class HeaderComponent {
  @Input() currentScreen: string = 'dashboard';
  @Output() goHome = new EventEmitter<void>();
  @Output() openCreateModal = new EventEmitter<void>();
  @Output() openSettings = new EventEmitter<void>();

  loanService = inject(LoanService);
  adminService = inject(AdminService);
  Role = Role;

  logout() {
    if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
      this.loanService.logout();
    }
  }
}

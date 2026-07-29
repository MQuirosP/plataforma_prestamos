import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoanService } from '../../services/loan.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-trial-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="showBanner()" 
         class="bg-gradient-to-r from-amber-950/90 via-industrial-surface to-amber-950/90 border-b border-caterpillar/30 text-xs text-white shadow-lg relative z-30 transition-all duration-300">
      
      <!-- Bar Header: Always visible, compact on mobile -->
      <div class="px-4 py-2 flex items-center justify-between">
        
        <!-- Left: Badge + Short Text -->
        <div class="flex items-center gap-2 cursor-pointer md:cursor-default select-none" (click)="toggleExpandedOnMobile()">
          <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-caterpillar/20 text-caterpillar text-[11px] font-black shrink-0 animate-pulse">
            ⚡
          </span>
          <span class="font-bold text-caterpillar">
            Plan Demo
          </span>
          <span class="text-industrial-muted hidden md:inline">•</span>
          <span class="font-mono text-[11px] font-bold" [ngClass]="isExpiringVerySoon() ? 'text-semantic-red animate-pulse' : 'text-industrial-light'">
            {{ remainingTimeText() }}
          </span>
        </div>

        <!-- Right Desktop: Action button -->
        <div class="hidden md:flex items-center gap-3">
          <a [href]="whatsappUrl" 
             target="_blank"
             class="bg-caterpillar text-industrial-black font-black text-[10px] uppercase px-3.5 py-1.5 rounded hover:bg-caterpillar-dark transition shrink-0">
            Activar Plan Oficial
          </a>
        </div>

        <!-- Right Mobile: Chevron Toggle Button -->
        <button (click)="toggleExpandedOnMobile()" 
                type="button"
                aria-label="Ver detalles de la suscripción de prueba"
                class="md:hidden p-1 text-industrial-muted hover:text-caterpillar transition duration-300 focus:outline-none">
          <svg class="w-4 h-4 transform transition-transform duration-300 ease-in-out" [class.rotate-180]="isExpandedMobile()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
      </div>

      <!-- Mobile Expandable Content Area with CSS Smooth Grid Transition -->
      <div class="grid transition-all duration-300 ease-in-out md:hidden"
           [ngClass]="isExpandedMobile() ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'">
        <div class="overflow-hidden">
          <div class="px-4 pb-3 pt-1 border-t border-industrial-border/40 bg-industrial-dark/60 flex flex-col gap-2.5">
            <p class="text-[11px] text-industrial-muted leading-tight">
              Estás disfrutando del período de evaluación sin restricciones. Activa tu plan oficial para mantener el servicio activo sin interrupciones.
            </p>
            <a [href]="whatsappUrl" 
               target="_blank"
               class="w-full text-center bg-caterpillar text-industrial-black font-black text-xs uppercase py-2.5 rounded shadow-lg hover:bg-caterpillar-dark transition">
              Activar Plan Oficial
            </a>
          </div>
        </div>
      </div>

    </div>
  `
})
export class TrialBannerComponent {
  private loanService = inject(LoanService);

  isExpandedMobile = signal(false);

  whatsappUrl = `https://wa.me/${(environment as any).supportWhatsappNumber || '50672666369'}?text=${encodeURIComponent('Hola, quisiera activar mi plan oficial en la plataforma')}`;

  currentUser = computed(() => this.loanService.currentUser());

  showBanner = computed(() => {
    const user = this.currentUser();
    if (!user) return false;
    return user.rol === 'PRESTAMISTA' && !!user.isTrial && !user.paymentDate;
  });

  isExpiringVerySoon = computed(() => {
    const user = this.currentUser();
    if (!user?.fechaPruebaFin) return false;
    const diffMs = new Date(user.fechaPruebaFin).getTime() - new Date().getTime();
    const daysLeft = diffMs / (1000 * 60 * 60 * 24);
    return daysLeft <= 3;
  });

  remainingTimeText = computed(() => {
    const user = this.currentUser();
    if (!user?.fechaPruebaFin) return 'Prueba activa';
    
    const diffMs = new Date(user.fechaPruebaFin).getTime() - new Date().getTime();
    if (diffMs <= 0) return '¡Prueba Expirada!';
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `Quedan ${days}d y ${hours}h`;
    }
    return `Quedan ${hours} horas`;
  });

  toggleExpandedOnMobile() {
    this.isExpandedMobile.update(val => !val);
  }
}

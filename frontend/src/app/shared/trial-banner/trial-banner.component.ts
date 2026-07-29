import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoanService } from '../../services/loan.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-trial-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="showBanner()" 
         class="bg-gradient-to-r from-amber-950/80 via-industrial-surface to-amber-950/80 border-b border-caterpillar/30 px-4 py-2 text-xs text-white flex items-center justify-between shadow-lg relative z-30">
      
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-caterpillar/20 text-caterpillar text-[11px] font-black animate-pulse">
          ⚡
        </span>
        <span class="font-medium">
          Estás usando el <strong class="text-caterpillar font-bold">Plan Demo (Prueba Gratuita)</strong>.
        </span>
        <span class="hidden md:inline text-industrial-muted">|</span>
        <span class="font-mono text-[11px] font-bold" [ngClass]="isExpiringVerySoon() ? 'text-semantic-red animate-pulse' : 'text-caterpillar'">
          {{ remainingTimeText() }}
        </span>
      </div>

      <a [href]="whatsappUrl" 
         target="_blank"
         class="bg-caterpillar text-industrial-black font-black text-[10px] uppercase px-3 py-1 rounded hover:bg-caterpillar-dark transition shrink-0 ml-2">
        Activar Plan Oficial
      </a>
    </div>
  `
})
export class TrialBannerComponent {
  private loanService = inject(LoanService);

  whatsappUrl = `https://wa.me/${environment.supportWhatsappNumber}?text=${encodeURIComponent('Hola, quisiera activar mi plan oficial en la plataforma')}`;

  currentUser = computed(() => this.loanService.currentUser());

  showBanner = computed(() => {
    const user = this.currentUser();
    if (!user) return false;
    // Solo mostrar para el prestamista si está en isTrial y no ha registrado pago
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
      return `Te quedan ${days} día${days > 1 ? 's' : ''} y ${hours}h de prueba`;
    }
    return `Te quedan ${hours} horas de prueba`;
  });
}

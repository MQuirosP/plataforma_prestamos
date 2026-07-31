import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoanService } from '../../services/loan.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-trial-banner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <ng-container *ngIf="showBanner()">
    <div class="bg-gradient-to-r from-amber-950/90 via-industrial-surface to-amber-950/90 border-b border-caterpillar/30 text-xs text-white shadow-lg relative z-30 transition-all duration-300">
      
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
          <button (click)="showActivationModal.set(true)" 
             class="bg-caterpillar text-industrial-black font-black text-[10px] uppercase px-3.5 py-1.5 rounded hover:bg-caterpillar-dark transition shrink-0">
            Activar Plan Oficial
          </button>
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
            <button (click)="showActivationModal.set(true)" 
               class="w-full text-center bg-caterpillar text-industrial-black font-black text-xs uppercase py-2.5 rounded shadow-lg hover:bg-caterpillar-dark transition">
              Activar Plan Oficial
            </button>
          </div>
        </div>
      </div>

      </div> <!-- End Banner Div -->

      <!-- Activation Modal -->
      <div *ngIf="showActivationModal()" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" (click)="showActivationModal.set(false)"></div>
        
        <!-- Modal Dialog -->
        <div class="relative bg-industrial-dark border border-industrial-border/60 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden text-left flex flex-col max-h-[90vh]">
          
          <!-- Header -->
          <div class="px-5 py-4 border-b border-industrial-border/60 flex items-center justify-between bg-industrial-surface">
            <h3 class="text-white font-black text-sm uppercase tracking-wide flex items-center gap-2">
              <span class="text-caterpillar">⚡</span> Activar Plan Oficial
            </h3>
            <button (click)="showActivationModal.set(false)" class="text-industrial-muted hover:text-white transition">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <!-- Body -->
          <div class="p-5 flex flex-col gap-4 overflow-y-auto custom-scrollbar bg-industrial-dark">
            <p class="text-industrial-muted text-xs leading-relaxed">
              Selecciona el plan al cual deseas suscribirte. Enviaremos tu solicitud oficial a nuestro equipo vía WhatsApp.
            </p>
            
            <!-- Plan Selector -->
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold text-industrial-light uppercase tracking-wider">Plan Deseado</label>
              <div class="group relative flex items-stretch rounded-lg overflow-hidden border border-industrial-border focus-within:border-caterpillar transition-colors duration-150 bg-industrial-surface">
                <select [(ngModel)]="selectedPlan" name="plan" class="w-full bg-transparent text-white text-sm px-3 py-3 pr-12 focus:outline-none appearance-none cursor-pointer">
                  <option *ngFor="let config of planConfigs()" [value]="config.plan">
                    {{config.plan}} (₡{{config.precioMensual}}/mes) - Máx {{config.maxClientes === -1 ? 'Ilimitado' : config.maxClientes}} clientes
                  </option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center justify-center w-9 bg-industrial-dark text-caterpillar border-l border-industrial-border pointer-events-none select-none group-hover:bg-caterpillar group-hover:text-industrial-black transition-colors duration-150">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
            
            <!-- Extra Message -->
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold text-industrial-light uppercase tracking-wider">Comentarios Adicionales (Opcional)</label>
              <textarea [(ngModel)]="extraMessage" 
                        class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-sm text-white placeholder-industrial-muted focus:border-caterpillar focus:outline-none transition-colors duration-150 min-h-[80px] resize-y custom-scrollbar"
                        placeholder="Ej: Quisiera mantener mis clientes actuales y activar la suscripción mensual..."></textarea>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="p-4 border-t border-industrial-border/60 bg-industrial-surface flex justify-between gap-3 shrink-0">
            <button (click)="showActivationModal.set(false)" 
                    class="flex-1 py-2.5 text-xs font-bold text-industrial-light hover:text-white bg-industrial-dark border border-industrial-border/60 hover:border-industrial-border rounded-lg transition uppercase tracking-wide">
              Cerrar y Volver
            </button>
            <button (click)="shareActivationRequest()" 
                    class="flex-1 py-2.5 text-xs font-black text-industrial-black bg-caterpillar hover:bg-caterpillar-dark rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 uppercase tracking-wide flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
              Compartir
            </button>
          </div>
        </div>
      </div>

    </ng-container>
  `
})
export class TrialBannerComponent implements OnInit {
  planConfigs = signal<any[]>([]);

  async ngOnInit() {
    try {
      const configs = await this.loanService.getPlanConfigs();
      this.planConfigs.set(configs);
    } catch (e) {
      console.error('Error loading plans', e);
    }
  }

  private loanService = inject(LoanService);

  isExpandedMobile = signal(false);

showActivationModal = signal(false);
  selectedPlan = signal('BRONCE');
  extraMessage = signal('');
  
  async shareActivationRequest() {
    const supportPhone = (environment as any).supportWhatsappNumber || '50672666369';
    let text = `Hola, quisiera activar el plan oficial *${this.selectedPlan()}* en la plataforma.`;
    if (this.extraMessage().trim()) {
      text += `\n\n${this.extraMessage().trim()}`;
    }
    
    const whatsappUrl = `https://wa.me/${supportPhone}?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
    this.showActivationModal.set(false);
  }

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



import { Component, OnInit, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoanService, Role, FineFrequency } from '../services/loan.service';
import { ToastService } from '../services/toast.service';
import { NumericStepperComponent } from '../shared/numeric-stepper/numeric-stepper.component';

@Component({
  selector: 'app-create-loan',
  standalone: true,
  imports: [CommonModule, FormsModule, NumericStepperComponent],
  template: `
    <div class="min-h-screen bg-industrial-black text-industrial-light pb-24 font-sans select-none">
      
      <!-- Top Caterpillar Branded Bar -->
      <header class="border-b border-industrial-border px-5 py-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md bg-opacity-95" style="background-color: #111111;">
        <div class="flex items-center gap-2">
          <button (click)="goBack.emit()" class="text-caterpillar hover:text-caterpillar mr-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 class="text-lg font-bold text-white leading-tight tracking-tight">NUEVO PRÉSTAMO</h1>
            <p class="text-[10px] text-caterpillar uppercase tracking-wider font-mono">REGISTRAR EN SISTEMA</p>
          </div>
        </div>
      </header>

      <!-- Content Column -->
      <main class="max-w-md mx-auto px-4 mt-6">
        
        <div class="bg-industrial-dark border border-industrial-border rounded-xl p-5 space-y-5 shadow-2xl relative overflow-hidden">
          
          <!-- Industrial stripe -->
          <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-caterpillar via-industrial-black to-caterpillar bg-[length:30px_6px]"></div>

          <form (submit)="onCreateLoan($event)" class="space-y-4 pt-2">
            
            <!-- Nombre Completo del Cliente -->
            <div>
              <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Nombre Completo del Cliente</label>
              <input type="text" [(ngModel)]="newLoanData.clienteNombre" name="clienteNombre" required 
                     class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar">
            </div>

            <!-- Teléfono (WhatsApp) -->
            <div>
              <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Teléfono (WhatsApp)</label>
              <input type="text" [(ngModel)]="newLoanData.clienteTelefono" name="clienteTelefono" required 
                     class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar">
            </div>

            <!-- Modalidad del Préstamo -->
            <div>
              <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Modalidad del Préstamo</label>
              <div class="group relative flex items-stretch rounded-lg overflow-hidden border border-industrial-border focus-within:border-caterpillar transition-colors duration-150 bg-industrial-surface">
                <select [(ngModel)]="newLoanData.modalidad" name="modalidad" required
                        class="w-full bg-transparent text-white text-sm px-3 py-3 pr-12 focus:outline-none appearance-none cursor-pointer">
                  <option value="TRADICIONAL">Tradicional Amortizable</option>
                  <option value="ALQUILER">Alquiler de Dinero (Renta)</option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center justify-center w-9 bg-industrial-dark text-caterpillar border-l border-industrial-border pointer-events-none select-none group-hover:bg-caterpillar group-hover:text-industrial-black transition-colors duration-150">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
            </div>

            <!-- Frecuencia de Cobro -->
            <div>
              <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Frecuencia de Cobro</label>
              <div class="group relative flex items-stretch rounded-lg overflow-hidden border border-industrial-border focus-within:border-caterpillar transition-colors duration-150 bg-industrial-surface">
                <select [(ngModel)]="newLoanData.frecuenciaPago" name="frecuenciaPago" required
                        class="w-full bg-transparent text-white text-sm px-3 py-3 pr-12 focus:outline-none appearance-none cursor-pointer">
                  <option value="SEMANAL">Semanal</option>
                  <option value="QUINCENAL">Quincenal</option>
                  <option value="MENSUAL">Mensual</option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center justify-center w-9 bg-industrial-dark text-caterpillar border-l border-industrial-border pointer-events-none select-none group-hover:bg-caterpillar group-hover:text-industrial-black transition-colors duration-150">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
            </div>

            <!-- Monto Original & Cuota -->
            <div class="space-y-4">
              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Monto Original</label>
                <app-numeric-stepper [(ngModel)]="newLoanData.montoOriginal" name="montoOriginal" [required]="true" [min]="0" [step]="1000"></app-numeric-stepper>
              </div>
              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">
                  Cuota {{ newLoanData.frecuenciaPago === 'SEMANAL' ? 'Semanal' : newLoanData.frecuenciaPago === 'QUINCENAL' ? 'Quincenal' : 'Mensual' }}
                  {{ newLoanData.modalidad === 'ALQUILER' ? '(Renta)' : '' }}
                </label>
                <app-numeric-stepper [(ngModel)]="newLoanData.cuotaSemanal" name="cuotaSemanal" [required]="true" [min]="0" [step]="500"></app-numeric-stepper>
              </div>
            </div>

            <!-- Tipo de Interés & Porcentaje / Monto Fijo -->
            <div *ngIf="newLoanData.modalidad !== 'ALQUILER'" class="space-y-4">
              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Tipo de Interés</label>
                <div class="group relative flex items-stretch rounded-lg overflow-hidden border border-industrial-border focus-within:border-caterpillar transition-colors duration-150 bg-industrial-surface">
                  <select [(ngModel)]="newLoanData.creationMode" name="creationMode"
                          class="w-full bg-transparent text-white text-sm px-3 py-3 pr-12 focus:outline-none appearance-none cursor-pointer">
                    <option value="porcentaje">% de Interés</option>
                    <option value="monto_fijo">Monto Final de Pago</option>
                  </select>
                  <div class="absolute inset-y-0 right-0 flex items-center justify-center w-9 bg-industrial-dark text-caterpillar border-l border-industrial-border pointer-events-none select-none group-hover:bg-caterpillar group-hover:text-industrial-black transition-colors duration-150">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                </div>
              </div>
              
              <div *ngIf="newLoanData.creationMode === 'porcentaje'">
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Interés (%)</label>
                <app-numeric-stepper [(ngModel)]="newLoanData.porcentaje" name="porcentaje" [min]="0" [max]="100" [step]="5"></app-numeric-stepper>
              </div>
              
              <div *ngIf="newLoanData.creationMode === 'monto_fijo'">
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Monto Final de Pago</label>
                <app-numeric-stepper [(ngModel)]="newLoanData.totalAPagarDirect" name="totalAPagarDirect" [min]="0" [step]="1000"></app-numeric-stepper>
              </div>
            </div>

            <!-- Día de Cobro Pactado -->
            <div>
              <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Día de Cobro Pactado</label>
              <div class="group relative flex items-stretch rounded-lg overflow-hidden border border-industrial-border focus-within:border-caterpillar transition-colors duration-150 bg-industrial-surface">
                <select [(ngModel)]="newLoanData.diaCobro" name="diaCobro" required 
                        class="w-full bg-transparent text-white text-sm px-3 py-3 pr-12 focus:outline-none appearance-none cursor-pointer">
                  <option [value]="1">Lunes</option>
                  <option [value]="2">Martes</option>
                  <option [value]="3">Miércoles</option>
                  <option [value]="4">Jueves</option>
                  <option [value]="5">Viernes</option>
                  <option [value]="6">Sábado</option>
                  <option [value]="7">Domingo</option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center justify-center w-9 bg-industrial-dark text-caterpillar border-l border-industrial-border pointer-events-none select-none group-hover:bg-caterpillar group-hover:text-industrial-black transition-colors duration-150">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
            </div>

            <!-- Fine Settings section -->
            <div class="border border-industrial-border rounded-xl p-4 bg-industrial-dark/40 space-y-3">
              <div class="flex items-center justify-between">
                <label class="text-sm font-bold text-white">¿Aplicar multas por mora?</label>
                <input type="checkbox" [(ngModel)]="newLoanData.hasFine" name="hasFine"
                       class="rounded border-industrial-border text-caterpillar focus:ring-0 bg-industrial-surface h-5 w-5">
              </div>

              <div *ngIf="newLoanData.hasFine" class="space-y-4 pt-2 border-t border-industrial-border/30">
                <div>
                  <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Monto de Multa</label>
                  <app-numeric-stepper [(ngModel)]="newLoanData.fineAmount" name="fineAmount" [min]="0" [step]="100"></app-numeric-stepper>
                </div>
                <div>
                  <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Frecuencia</label>
                  <div class="group relative flex items-stretch rounded-lg overflow-hidden border border-industrial-border focus-within:border-caterpillar transition-colors duration-150 bg-industrial-surface">
                    <select [(ngModel)]="newLoanData.fineFrequency" name="fineFrequency"
                            class="w-full bg-transparent text-white text-sm px-3 py-3 pr-12 focus:outline-none appearance-none cursor-pointer">
                      <option [value]="FineFrequency.DAILY">Diario</option>
                      <option [value]="FineFrequency.WEEKLY">Semanal</option>
                      <option [value]="FineFrequency.MONTHLY">Mensual</option>
                    </select>
                    <div class="absolute inset-y-0 right-0 flex items-center justify-center w-9 bg-industrial-dark text-caterpillar border-l border-industrial-border pointer-events-none select-none group-hover:bg-caterpillar group-hover:text-industrial-black transition-colors duration-150">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Días de gracia</label>
                  <app-numeric-stepper [(ngModel)]="newLoanData.graceDays" name="graceDays" [min]="0" [step]="1"></app-numeric-stepper>
                </div>
              </div>
            </div>

            <!-- Estimación/Cálculo del Total -->
            <div class="bg-industrial-surface p-3 rounded-lg border border-industrial-border text-xs text-industrial-muted font-mono flex justify-between items-center mt-2">
              <span>{{ newLoanData.modalidad === 'ALQUILER' ? 'Retorno de Capital:' : 'Total Estimado a Cobrar:' }}</span>
              <span class="text-white font-extrabold text-sm">
                {{ loanService.settings()?.monedaSimbolo || '₡' }} 
                {{ (newLoanData.modalidad === 'ALQUILER'
                     ? (newLoanData.montoOriginal || 0)
                     : (newLoanData.creationMode === 'porcentaje' 
                         ? (newLoanData.montoOriginal || 0) * (1 + (newLoanData.porcentaje || 0) / 100) 
                         : (newLoanData.totalAPagarDirect || 0))) | number:'1.0-0' }}
              </span>
            </div>

            <!-- Buttons -->
            <div class="flex gap-3 pt-4">
              <button type="button" (click)="goBack.emit()"
                      class="flex-1 bg-industrial-surface border border-industrial-border hover:bg-industrial-border text-white text-xs font-bold py-3 rounded-lg transition duration-150">
                Cancelar
              </button>
              <button type="submit"
                      class="flex-1 bg-caterpillar hover:bg-caterpillar-dark text-industrial-black py-3 rounded-lg font-black uppercase tracking-wider text-xs transition duration-150 shadow-lg">
                Crear Préstamo Activo
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  `
})
export class CreateLoanComponent implements OnInit {
  Role = Role;
  FineFrequency = FineFrequency;
  loanService = inject(LoanService);
  toastService = inject(ToastService);

  @Output() goBack = new EventEmitter<void>();

  newLoanData = {
    clienteNombre: '',
    clienteTelefono: '',
    montoOriginal: null as number | null,
    cuotaSemanal: null as number | null,
    diaCobro: 1,
    porcentaje: null as number | null,
    creationMode: 'porcentaje' as 'porcentaje' | 'monto_fijo',
    totalAPagarDirect: null as number | null,
    fineAmount: null as number | null,
    fineFrequency: FineFrequency.DAILY as FineFrequency,
    graceDays: 0,
    hasFine: false,
    modalidad: 'TRADICIONAL' as any,
    frecuenciaPago: 'SEMANAL' as any
  };

  ngOnInit() {
    const settings = this.loanService.settings();
    const currency = settings?.monedaCodigo || 'CRC';
    const prefix = this.getPrefixByCurrency(currency);

    this.newLoanData = {
      clienteNombre: '',
      clienteTelefono: prefix,
      montoOriginal: null,
      cuotaSemanal: null,
      diaCobro: 1,
      porcentaje: settings?.gananciaPorcentaje || 50,
      creationMode: 'porcentaje',
      totalAPagarDirect: null,
      fineAmount: null,
      fineFrequency: FineFrequency.DAILY,
      graceDays: 0,
      hasFine: false,
      modalidad: settings?.modalidadPredeterminada || 'TRADICIONAL',
      frecuenciaPago: 'SEMANAL'
    };
  }

  getPrefixByCurrency(monedaCodigo: string | undefined): string {
    if (!monedaCodigo) return '+506';
    const mapping: Record<string, string> = {
      'CRC': '+506',
      'MXN': '+52',
      'COP': '+57',
      'CLP': '+56',
      'PEN': '+51',
      'GTQ': '+502',
      'HNL': '+504',
      'NIO': '+505',
      'PAB': '+507',
      'USD': '+1',
      'DOP': '+1',
      'EUR': '+34',
      'VES': '+58',
      'ARS': '+54',
      'BOB': '+591',
      'PYG': '+595',
      'UYU': '+598',
      'BRL': '+55'
    };
    return mapping[monedaCodigo.toUpperCase()] || '+506';
  }

  async onCreateLoan(event: Event) {
    event.preventDefault();
    if (!this.newLoanData.clienteNombre || !this.newLoanData.clienteTelefono || !this.newLoanData.montoOriginal || !this.newLoanData.cuotaSemanal) {
      this.toastService.error('Por favor llene todos los campos');
      return;
    }

    try {
      await this.loanService.createLoan({
        clienteNombre: this.newLoanData.clienteNombre,
        clienteTelefono: this.newLoanData.clienteTelefono,
        montoOriginal: Number(this.newLoanData.montoOriginal),
        cuotaSemanal: Number(this.newLoanData.cuotaSemanal),
        diaCobro: Number(this.newLoanData.diaCobro),
        porcentaje: this.newLoanData.modalidad !== 'ALQUILER' && this.newLoanData.creationMode === 'porcentaje' && this.newLoanData.porcentaje !== null ? Number(this.newLoanData.porcentaje) : undefined,
        totalAPagarDirect: this.newLoanData.modalidad !== 'ALQUILER' && this.newLoanData.creationMode === 'monto_fijo' ? Number(this.newLoanData.totalAPagarDirect) : null,
        fineAmount: this.newLoanData.hasFine && this.newLoanData.fineAmount ? Number(this.newLoanData.fineAmount) : null,
        fineFrequency: this.newLoanData.hasFine ? this.newLoanData.fineFrequency : null,
        graceDays: this.newLoanData.hasFine ? Number(this.newLoanData.graceDays) : 0,
        modalidad: this.newLoanData.modalidad,
        frecuenciaPago: this.newLoanData.frecuenciaPago
      });

      this.toastService.success('Préstamo creado correctamente');
      this.goBack.emit();
    } catch (err: any) {
      if (err.status === 403) {
        this.toastService.error('Suscripción Expirada. Habilite en panel.');
      } else {
        this.toastService.error('Error al registrar el préstamo');
      }
    }
  }
}

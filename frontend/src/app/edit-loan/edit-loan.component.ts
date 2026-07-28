import { Component, OnInit, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoanService, Loan, FineFrequency, Role } from '../services/loan.service';
import { ToastService } from '../services/toast.service';
import { NumericStepperComponent } from '../shared/numeric-stepper/numeric-stepper.component';

@Component({
  selector: 'app-edit-loan',
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
            <h1 class="text-lg font-bold text-white leading-tight tracking-tight">EDITAR PRÉSTAMO</h1>
            <p class="text-[10px] text-caterpillar uppercase tracking-wider font-mono">PANEL DE ADMINISTRACIÓN</p>
          </div>
        </div>
      </header>

      <!-- Content Column -->
      <main class="max-w-md mx-auto px-4 mt-6">
        
        <div class="bg-industrial-dark border border-industrial-border rounded-xl p-5 space-y-5 shadow-2xl relative overflow-hidden">
          
          <!-- Industrial stripe -->
          <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-caterpillar via-industrial-black to-caterpillar bg-[length:30px_6px]"></div>

          <!-- Warning banner if loan has payments -->
          <div *ngIf="hasPayments" class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-400 font-mono">
            ⚠ Este préstamo ya registra abonos o pagos. Los valores financieros de origen (monto original, modalidad) están protegidos para evitar distorsiones contables.
          </div>

          <form (submit)="onSaveEdit($event)" class="space-y-4 pt-2">
            
            <!-- Nombre Completo del Cliente -->
            <div>
              <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Nombre Completo del Cliente</label>
              <input type="text" [(ngModel)]="editData.clienteNombre" name="clienteNombre" required 
                     class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar">
            </div>

            <!-- Teléfono (WhatsApp) -->
            <div>
              <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Teléfono (WhatsApp)</label>
              <input type="text" [(ngModel)]="editData.clienteTelefono" name="clienteTelefono" required 
                     class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar">
            </div>

            <!-- Identificación opcional -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Tipo Doc.</label>
                <input type="text" [(ngModel)]="editData.tipoIdentificacion" name="tipoIdentificacion" placeholder="Cédula/Pass"
                       class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar">
              </div>
              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Nº Identificación</label>
                <input type="text" [(ngModel)]="editData.numeroIdentificacion" name="numeroIdentificacion" placeholder="Nº Documento"
                       class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar">
              </div>
            </div>

            <!-- Monto Original & Cuota -->
            <div class="space-y-4">
              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Monto Original</label>
                <app-numeric-stepper [(ngModel)]="editData.montoOriginal" name="montoOriginal" [required]="true" [min]="0" [step]="1000" [disabled]="hasPayments"></app-numeric-stepper>
              </div>
              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Cuota Pactada</label>
                <app-numeric-stepper [(ngModel)]="editData.cuotaSemanal" name="cuotaSemanal" [required]="true" [min]="0" [step]="500"></app-numeric-stepper>
              </div>
            </div>

            <!-- Día de Cobro Pactado -->
            <div>
              <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Día de Cobro Pactado</label>
              <div class="group relative flex items-stretch rounded-lg overflow-hidden border border-industrial-border focus-within:border-caterpillar transition-colors duration-150 bg-industrial-surface">
                <select [(ngModel)]="editData.diaCobro" name="diaCobro" required 
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
                <input type="checkbox" [(ngModel)]="editData.hasFine" name="hasFine"
                       class="rounded border-industrial-border text-caterpillar focus:ring-0 bg-industrial-surface h-5 w-5">
              </div>

              <div *ngIf="editData.hasFine" class="space-y-4 pt-2 border-t border-industrial-border/30">
                <div>
                  <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Monto de Multa</label>
                  <app-numeric-stepper [(ngModel)]="editData.fineAmount" name="fineAmount" [min]="0" [step]="100"></app-numeric-stepper>
                </div>
                <div>
                  <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Frecuencia</label>
                  <div class="group relative flex items-stretch rounded-lg overflow-hidden border border-industrial-border focus-within:border-caterpillar transition-colors duration-150 bg-industrial-surface">
                    <select [(ngModel)]="editData.fineFrequency" name="fineFrequency"
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
                  <app-numeric-stepper [(ngModel)]="editData.graceDays" name="graceDays" [min]="0" [step]="1"></app-numeric-stepper>
                </div>
              </div>
            </div>

            <!-- Buttons -->
            <div class="flex gap-3 pt-4">
              <button type="button" (click)="goBack.emit()"
                      class="flex-1 bg-industrial-surface border border-industrial-border hover:bg-industrial-border text-white text-xs font-bold py-3.5 rounded-lg transition duration-150">
                Cancelar
              </button>
              <button type="submit" [disabled]="saving()"
                      class="flex-1 bg-caterpillar hover:bg-caterpillar-dark text-industrial-black py-3.5 rounded-lg font-black uppercase tracking-wider text-xs transition duration-150 shadow-lg disabled:opacity-50">
                {{ saving() ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  `
})
export class EditLoanComponent implements OnInit {
  @Input({ required: true }) loan!: Loan;
  @Output() goBack = new EventEmitter<void>();

  FineFrequency = FineFrequency;
  loanService = inject(LoanService);
  toastService = inject(ToastService);

  saving = signal(false);
  hasPayments = false;

  editData = {
    clienteNombre: '',
    clienteTelefono: '',
    tipoIdentificacion: '',
    numeroIdentificacion: '',
    montoOriginal: null as number | null,
    cuotaSemanal: null as number | null,
    diaCobro: 1,
    fineAmount: null as number | null,
    fineFrequency: FineFrequency.DAILY as FineFrequency,
    graceDays: 0,
    hasFine: false
  };

  ngOnInit() {
    if (!this.loan) return;
    this.hasPayments = (this.loan.payments && this.loan.payments.length > 0) || false;

    this.editData = {
      clienteNombre: this.loan.clienteNombre,
      clienteTelefono: this.loan.clienteTelefono,
      tipoIdentificacion: this.loan.tipoIdentificacion || '',
      numeroIdentificacion: this.loan.numeroIdentificacion || '',
      montoOriginal: Number(this.loan.montoOriginal),
      cuotaSemanal: Number(this.loan.cuotaSemanal),
      diaCobro: Number(this.loan.diaCobro || 1),
      fineAmount: this.loan.fineAmount ? Number(this.loan.fineAmount) : null,
      fineFrequency: (this.loan.fineFrequency as FineFrequency) || FineFrequency.DAILY,
      graceDays: Number(this.loan.graceDays || 0),
      hasFine: !!this.loan.fineAmount
    };
  }

  async onSaveEdit(event: Event) {
    event.preventDefault();
    if (!this.editData.clienteNombre || !this.editData.clienteTelefono || !this.editData.montoOriginal || !this.editData.cuotaSemanal) {
      this.toastService.error('Todos los campos requeridos deben estar completos.');
      return;
    }

    this.saving.set(true);
    try {
      await this.loanService.updateLoan(this.loan.id, {
        clienteNombre: this.editData.clienteNombre,
        clienteTelefono: this.editData.clienteTelefono,
        tipoIdentificacion: this.editData.tipoIdentificacion || null,
        numeroIdentificacion: this.editData.numeroIdentificacion || null,
        montoOriginal: Number(this.editData.montoOriginal),
        cuotaSemanal: Number(this.editData.cuotaSemanal),
        diaCobro: Number(this.editData.diaCobro),
        hasFine: this.editData.hasFine,
        fineAmount: this.editData.hasFine && this.editData.fineAmount ? Number(this.editData.fineAmount) : null,
        fineFrequency: this.editData.hasFine ? this.editData.fineFrequency : null,
        graceDays: this.editData.hasFine ? Number(this.editData.graceDays) : 0
      });

      this.toastService.success('Préstamo actualizado exitosamente.');
      this.goBack.emit();
    } catch (err: any) {
      if (err.status === 403) {
        this.toastService.error('Acceso denegado. Solo el administrador en impersonación puede editar préstamos.');
      } else {
        this.toastService.error(err.error?.error || 'Error al actualizar préstamo');
      }
    } finally {
      this.saving.set(false);
    }
  }
}

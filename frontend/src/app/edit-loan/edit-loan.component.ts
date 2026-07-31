import { Component, OnInit, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoanService, Loan, FineFrequency, Role, TipoIdentificacion, LoanFrecuencia } from '../services/loan.service';
import { ToastService } from '../services/toast.service';
import { NumericStepperComponent } from '../shared/numeric-stepper/numeric-stepper.component';
import { trigger, state, style, animate, transition } from '@angular/animations';

@Component({
  selector: 'app-edit-loan',
  standalone: true,
  imports: [CommonModule, FormsModule, NumericStepperComponent],
  animations: [
    trigger('expandCollapse', [
      state('void', style({ maxHeight: '0', opacity: '0', overflow: 'hidden', transform: 'translateY(-6px)' })),
      state('*',    style({ maxHeight: '500px', opacity: '1', overflow: 'hidden', transform: 'translateY(0)' })),
      transition('void => *', animate('220ms cubic-bezier(0.4, 0, 0.2, 1)')),
      transition('* => void', animate('180ms cubic-bezier(0.4, 0, 0.6, 1)'))
    ])
  ],
  template: `
    <div class="min-h-screen bg-industrial-black text-industrial-light pb-24 font-sans select-none pt-6">
      <!-- Content Column -->
      <main class="max-w-md mx-auto px-4">
        
        <div class="bg-industrial-dark border border-industrial-border rounded-xl p-5 space-y-5 shadow-2xl relative overflow-hidden">
          
          <!-- Industrial stripe -->
          <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-caterpillar via-industrial-black to-caterpillar bg-[length:30px_6px]"></div>

          <!-- Form Title Inside Card (No back button) -->
          <div class="pt-2 pb-3 border-b border-industrial-border/60">
            <h1 class="text-lg font-bold text-white leading-tight tracking-tight uppercase">EDITAR PRÉSTAMO</h1>
            <p class="text-[10px] text-caterpillar uppercase tracking-wider font-mono">PANEL DE ADMINISTRACIÓN</p>
          </div>

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
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Tipo de Documento</label>
                <div class="group relative flex items-stretch rounded-lg overflow-hidden border border-industrial-border focus-within:border-caterpillar transition-colors duration-150 bg-industrial-surface">
                  <select [(ngModel)]="editData.tipoIdentificacion" name="tipoIdentificacion"
                          class="w-full bg-transparent text-white text-sm px-3 py-3 pr-12 focus:outline-none appearance-none cursor-pointer">
                    <option value="CEDULA_NACIONAL">Cédula Nacional</option>
                    <option value="PASAPORTE">Pasaporte</option>
                    <option value="RESIDENCIA_DIMEX">DIMEX</option>
                    <option value="OTRO">Otro</option>
                  </select>
                  <div class="absolute inset-y-0 right-0 flex items-center justify-center w-9 bg-industrial-dark text-caterpillar border-l border-industrial-border pointer-events-none select-none group-hover:bg-caterpillar group-hover:text-industrial-black transition-colors duration-150">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Nº Identificación</label>
                <input type="text" [(ngModel)]="editData.numeroIdentificacion" name="numeroIdentificacion"
                       [placeholder]="getIdPlaceholder(editData.tipoIdentificacion)"
                       [maxlength]="getIdMaxLength(editData.tipoIdentificacion)"
                       (input)="onIdInput($event, editData, 'numeroIdentificacion')"
                       [attr.inputmode]="editData.tipoIdentificacion === 'PASAPORTE' || editData.tipoIdentificacion === 'OTRO' ? 'text' : 'numeric'"
                       class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar font-mono tracking-wide">
              </div>
            </div>

            <!-- Frecuencia & Día de Cobro Pactado -->
            <div class="space-y-3 bg-industrial-dark/40 border border-industrial-border/60 rounded-xl p-3.5">
              <div class="flex items-center justify-between">
                <span class="text-xs text-industrial-muted font-mono uppercase">Frecuencia de Cobro</span>
                <span class="px-2 py-0.5 rounded bg-caterpillar/10 text-caterpillar text-xs font-bold uppercase border border-caterpillar/30">
                  {{ loan.frecuenciaPago || 'SEMANAL' }}
                </span>
              </div>
              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">{{ getDiaCobroLabel(loan.frecuenciaPago) }}</label>
                <div [class.opacity-50]="loan.frecuenciaPago === LoanFrecuencia.DIARIO"
                     class="group relative flex items-stretch rounded-lg overflow-hidden border border-industrial-border focus-within:border-caterpillar transition-colors duration-150 bg-industrial-surface">
                  <select [(ngModel)]="editData.diaCobro" name="diaCobro" required [disabled]="loan.frecuenciaPago === LoanFrecuencia.DIARIO"
                          class="w-full bg-transparent text-white text-sm px-3 py-3 pr-12 focus:outline-none appearance-none cursor-pointer">
                    <option *ngFor="let opt of getDiaCobroOptions(loan.frecuenciaPago)" [value]="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                  <div class="absolute inset-y-0 right-0 flex items-center justify-center w-9 bg-industrial-dark text-caterpillar border-l border-industrial-border pointer-events-none select-none group-hover:bg-caterpillar group-hover:text-industrial-black transition-colors duration-150">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                </div>
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

            <!-- Fine Settings section -->
            <div class="border border-industrial-border rounded-xl p-4 bg-industrial-dark/40 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm font-bold text-white">¿Aplicar multas por mora?</span>
                <!-- Custom checkbox -->
                <label for="hasFine-edit" class="relative cursor-pointer">
                  <input type="checkbox" id="hasFine-edit" [(ngModel)]="editData.hasFine" name="hasFine" class="sr-only peer">
                  <div class="w-5 h-5 rounded flex items-center justify-center border border-industrial-border bg-industrial-surface
                               peer-checked:bg-caterpillar peer-checked:border-caterpillar transition-colors duration-150">
                    <svg *ngIf="editData.hasFine" class="w-3 h-3 text-industrial-black" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                </label>
              </div>

              <div *ngIf="editData.hasFine" @expandCollapse class="space-y-4 pt-2 border-t border-industrial-border/30">
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
                      class="flex-1 bg-industrial-surface border border-industrial-border hover:border-caterpillar/40 text-white hover:text-caterpillar text-xs font-bold py-3.5 rounded-lg transition duration-150 uppercase tracking-wider">
                Cerrar y volver
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

  LoanFrecuencia = LoanFrecuencia;
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
      tipoIdentificacion: this.loan.client?.tipoIdentificacion || this.loan.tipoIdentificacion || '',
      numeroIdentificacion: this.loan.client?.numeroIdentificacion || this.loan.numeroIdentificacion || '',
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

  getDiaCobroLabel(frecuencia: string | undefined): string {
    const freq = frecuencia || this.loan?.frecuenciaPago || 'SEMANAL';
    if (freq === 'QUINCENAL') return 'Esquema / Día de Cobro Quincenal';
    if (freq === 'MENSUAL') return 'Día del Mes de Cobro (1 al 31)';
    if (freq === 'DIARIO') return 'Día de Cobro (Cobro Diario)';
    return 'Día de Cobro Pactado (Semanal)';
  }

  getDiaCobroOptions(frecuencia: string | undefined): { value: number; label: string }[] {
    const freq = frecuencia || this.loan?.frecuenciaPago || 'SEMANAL';
    if (freq === 'DIARIO') {
      return [{ value: 1, label: 'Todos los días (Lunes a Domingo)' }];
    }
    if (freq === 'QUINCENAL') {
      return [
        { value: 15, label: 'Días 15 y 30 de cada mes (Planilla Quincenal)' },
        { value: 1, label: 'Días 1 y 16 de cada mes (Inicio/Mitad de Mes)' },
        { value: 5, label: 'Cada 2 semanas los Viernes' },
        { value: 2, label: 'Cada 2 semanas los Lunes' }
      ];
    }
    if (freq === 'MENSUAL') {
      const days = [];
      for (let i = 1; i <= 31; i++) {
        days.push({ value: i, label: `Día ${i} de cada mes` });
      }
      return days;
    }
    return [
      { value: 1, label: 'Lunes' },
      { value: 2, label: 'Martes' },
      { value: 3, label: 'Miércoles' },
      { value: 4, label: 'Jueves' },
      { value: 5, label: 'Viernes' },
      { value: 6, label: 'Sábado' },
      { value: 7, label: 'Domingo' }
    ];
  }

  getIdPlaceholder(tipo: string): string {
    switch (tipo) {
      case 'CEDULA_NACIONAL':  return '1-1234-5678';
      case 'RESIDENCIA_DIMEX': return '12345678901';
      case 'PASAPORTE':        return 'ABC123456';
      default:                 return 'Núm. de documento';
    }
  }

  getIdMaxLength(tipo: string): number {
    switch (tipo) {
      case 'CEDULA_NACIONAL':  return 11;
      case 'RESIDENCIA_DIMEX': return 12;
      case 'PASAPORTE':        return 20;
      default:                 return 30;
    }
  }

  getIdHint(tipo: string): string {
    switch (tipo) {
      case 'CEDULA_NACIONAL':  return 'Formato: #-####-#### (9 dígitos)';
      case 'RESIDENCIA_DIMEX': return 'Solo números — 11 o 12 dígitos';
      case 'PASAPORTE':        return 'Letras y números, sin espacios';
      default:                 return '';
    }
  }

  onIdInput(event: Event, dataObj: any, field: string): void {
    const input = event.target as HTMLInputElement;
    const tipo: string = dataObj.tipoIdentificacion;

    if (tipo === 'CEDULA_NACIONAL') {
      let raw = input.value.replace(/\D/g, '').slice(0, 9);
      let formatted = raw;
      if (raw.length > 5) {
        formatted = raw[0] + '-' + raw.slice(1, 5) + '-' + raw.slice(5);
      } else if (raw.length > 1) {
        formatted = raw[0] + '-' + raw.slice(1);
      }
      dataObj[field] = formatted;
      input.value = formatted;
    } else if (tipo === 'RESIDENCIA_DIMEX') {
      const raw = input.value.replace(/\D/g, '').slice(0, 12);
      dataObj[field] = raw;
      input.value = raw;
    } else if (tipo === 'PASAPORTE') {
      const raw = input.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 20);
      dataObj[field] = raw;
      input.value = raw;
    }
  }
}

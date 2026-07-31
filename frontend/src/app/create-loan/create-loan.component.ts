import { Component, OnInit, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoanService, Role, FineFrequency, TipoIdentificacion } from '../services/loan.service';
import { ClientService } from '../services/client.service';
import { ToastService } from '../services/toast.service';
import { NumericStepperComponent } from '../shared/numeric-stepper/numeric-stepper.component';
import { trigger, state, style, animate, transition } from '@angular/animations';

@Component({
  selector: 'app-create-loan',
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
    <!-- Content Column -->
    <main class="max-w-md md:max-w-xl mx-auto px-4 pb-24 pt-6">
      
      <div class="bg-industrial-dark border border-industrial-border rounded-2xl p-5 space-y-5 shadow-2xl relative overflow-hidden mb-6">
        
        <!-- Industrial stripe -->
        <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-caterpillar via-industrial-black to-caterpillar bg-[length:30px_6px]"></div>

          <!-- Form Title Inside Card (No back button) -->
          <div class="pt-2 pb-3 border-b border-industrial-border/60">
            <h1 class="text-lg font-bold text-white leading-tight tracking-tight uppercase">NUEVO PRÉSTAMO</h1>
            <p class="text-[10px] text-caterpillar uppercase tracking-wider font-mono">REGISTRAR EN SISTEMA</p>
          </div>

          <form (submit)="onCreateLoan($event)" class="space-y-4">
            
            <!-- Selección de Cliente -->
            <div class="space-y-4 border border-industrial-border rounded-xl p-4 bg-industrial-dark/40">
              <div class="flex gap-4 mb-2">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="clientMode" [(ngModel)]="clientMode" value="existing" class="text-caterpillar focus:ring-caterpillar bg-industrial-surface border-industrial-border">
                  <span class="text-sm text-white">Cliente Existente</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="clientMode" [(ngModel)]="clientMode" value="new" class="text-caterpillar focus:ring-caterpillar bg-industrial-surface border-industrial-border">
                  <span class="text-sm text-white">Nuevo Cliente</span>
                </label>
              </div>

              <!-- Selector de Cliente Existente -->
              <div *ngIf="clientMode === 'existing'" @expandCollapse>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Seleccionar Cliente</label>
                <div class="group relative flex items-stretch rounded-lg overflow-hidden border border-industrial-border focus-within:border-caterpillar transition-colors duration-150 bg-industrial-surface">
                  <select [(ngModel)]="newLoanData.clientId" name="clientId"
                          class="w-full bg-transparent text-white text-sm px-3 py-3 pr-12 focus:outline-none appearance-none cursor-pointer">
                    <option value="" disabled>Seleccione un cliente...</option>
                    <option *ngFor="let client of clientService.clients()" [value]="client.id">
                      {{ client.nombre }} - {{ client.telefono }}
                    </option>
                  </select>
                  <div class="absolute inset-y-0 right-0 flex items-center justify-center w-9 bg-industrial-dark text-caterpillar border-l border-industrial-border pointer-events-none select-none group-hover:bg-caterpillar group-hover:text-industrial-black transition-colors duration-150">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <!-- Formulario de Nuevo Cliente -->
              <div *ngIf="clientMode === 'new'" @expandCollapse class="space-y-4 pt-2 border-t border-industrial-border/30">
                <div>
                  <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Nombre Completo del Cliente</label>
                  <input type="text" [(ngModel)]="newLoanData.clienteNombre" name="clienteNombre"
                         class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar">
                </div>

                <div>
                  <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Teléfono (WhatsApp)</label>
                  <input type="text" [(ngModel)]="newLoanData.clienteTelefono" name="clienteTelefono"
                         class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar">
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Tipo de Documento</label>
                    <div class="group relative flex items-stretch rounded-lg overflow-hidden border border-industrial-border focus-within:border-caterpillar transition-colors duration-150 bg-industrial-surface">
                      <select [(ngModel)]="newLoanData.tipoIdentificacion" name="tipoIdentificacion"
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
                    <input type="text" [(ngModel)]="newLoanData.numeroIdentificacion" name="numeroIdentificacion"
                           [placeholder]="getIdPlaceholder(newLoanData.tipoIdentificacion)"
                           [maxlength]="getIdMaxLength(newLoanData.tipoIdentificacion)"
                           (input)="onIdInput($event, newLoanData, 'numeroIdentificacion')"
                           [attr.inputmode]="newLoanData.tipoIdentificacion === 'PASAPORTE' || newLoanData.tipoIdentificacion === 'OTRO' ? 'text' : 'numeric'"
                           class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar font-mono tracking-wide">
                  </div>
                </div>
              </div>
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
                <select [(ngModel)]="newLoanData.frecuenciaPago" (ngModelChange)="onFrecuenciaChange($event)" name="frecuenciaPago" required
                        class="w-full bg-transparent text-white text-sm px-3 py-3 pr-12 focus:outline-none appearance-none cursor-pointer">
                  <option value="DIARIO">Diario</option>
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

            <!-- Día de Cobro Pactado (Ubicación lógica directamente debajo de Frecuencia) -->
            <div>
              <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">{{ getDiaCobroLabel(newLoanData.frecuenciaPago) }}</label>
              <div [class.opacity-50]="newLoanData.frecuenciaPago === 'DIARIO'"
                   class="group relative flex items-stretch rounded-lg overflow-hidden border border-industrial-border focus-within:border-caterpillar transition-colors duration-150 bg-industrial-surface">
                <select [(ngModel)]="newLoanData.diaCobro" name="diaCobro" required [disabled]="newLoanData.frecuenciaPago === 'DIARIO'"
                        class="w-full bg-transparent text-white text-sm px-3 py-3 pr-12 focus:outline-none appearance-none cursor-pointer">
                  <option *ngFor="let opt of getDiaCobroOptions(newLoanData.frecuenciaPago)" [value]="opt.value">
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

            <!-- Monto Original & Cuota -->
            <div class="space-y-4">
              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Monto Original</label>
                <app-numeric-stepper [(ngModel)]="newLoanData.montoOriginal" name="montoOriginal" [required]="true" [min]="0" [step]="1000"></app-numeric-stepper>
              </div>
              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">
                  Cuota {{ newLoanData.frecuenciaPago === 'DIARIO' ? 'Diaria' : newLoanData.frecuenciaPago === 'SEMANAL' ? 'Semanal' : newLoanData.frecuenciaPago === 'QUINCENAL' ? 'Quincenal' : 'Mensual' }}
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

            <!-- Fine Settings section -->
            <div class="border border-industrial-border rounded-xl p-4 bg-industrial-dark/40 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm font-bold text-white">¿Aplicar multas por mora?</span>
                <!-- Custom checkbox -->
                <label for="hasFine-create" class="relative cursor-pointer">
                  <input type="checkbox" id="hasFine-create" [(ngModel)]="newLoanData.hasFine" name="hasFine" class="sr-only peer">
                  <div class="w-5 h-5 rounded flex items-center justify-center border border-industrial-border bg-industrial-surface
                               peer-checked:bg-caterpillar peer-checked:border-caterpillar transition-colors duration-150">
                    <svg *ngIf="newLoanData.hasFine" class="w-3 h-3 text-industrial-black" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                </label>
              </div>

              <div *ngIf="newLoanData.hasFine" @expandCollapse class="space-y-4 pt-2 border-t border-industrial-border/30">
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
                      class="flex-1 bg-industrial-surface border border-industrial-border hover:border-caterpillar/40 text-white hover:text-caterpillar text-xs font-bold py-3 rounded-lg transition duration-150 uppercase tracking-wider">
                Cerrar y volver
              </button>
              <button type="submit"
                      class="flex-1 bg-caterpillar hover:bg-caterpillar-dark text-industrial-black py-3 rounded-lg font-black uppercase tracking-wider text-xs transition duration-150 shadow-lg">
                Crear Préstamo
              </button>
            </div>
          </form>
      </div>
    </main>
  `
})
export class CreateLoanComponent implements OnInit {
  Role = Role;
  FineFrequency = FineFrequency;
  loanService = inject(LoanService);
  clientService = inject(ClientService);
  toastService = inject(ToastService);

  @Output() goBack = new EventEmitter<void>();

  clientMode: 'existing' | 'new' = 'existing';

  newLoanData = {
    clientId: '',
    clienteNombre: '',
    clienteTelefono: '',
    tipoIdentificacion: TipoIdentificacion.CEDULA_NACIONAL as TipoIdentificacion,
    numeroIdentificacion: '',
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

  readonly TipoIdentificacion = TipoIdentificacion;

  ngOnInit() {
    const settings = this.loanService.settings();
    const currency = settings?.monedaCodigo || 'CRC';
    const prefix = this.getPrefixByCurrency(currency);

    this.newLoanData = {
      clientId: '',
      clienteNombre: '',
      clienteTelefono: prefix,
      tipoIdentificacion: TipoIdentificacion.CEDULA_NACIONAL,
      numeroIdentificacion: '',
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

    if (this.clientService.clients().length === 0) {
      this.clientService.loadClients().then(() => {
        if (this.clientService.clients().length === 0) {
          this.clientMode = 'new';
        }
      });
    }
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

  getDiaCobroLabel(frecuencia: string): string {
    if (frecuencia === 'QUINCENAL') return 'Esquema / Día de Cobro Quincenal';
    if (frecuencia === 'MENSUAL') return 'Día del Mes de Cobro (1 al 31)';
    if (frecuencia === 'DIARIO') return 'Día de Cobro (Cobro Diario)';
    return 'Día de Cobro Pactado (Semanal)';
  }

  getDiaCobroOptions(frecuencia: string): { value: number; label: string }[] {
    if (frecuencia === 'DIARIO') {
      return [{ value: 1, label: 'Todos los días (Lunes a Domingo)' }];
    }
    if (frecuencia === 'QUINCENAL') {
      return [
        { value: 15, label: 'Días 15 y 30 de cada mes (Planilla Quincenal)' },
        { value: 1, label: 'Días 1 y 16 de cada mes (Inicio/Mitad de Mes)' },
        { value: 5, label: 'Cada 2 semanas los Viernes' },
        { value: 2, label: 'Cada 2 semanas los Lunes' }
      ];
    }
    if (frecuencia === 'MENSUAL') {
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

  onFrecuenciaChange(frecuencia: string) {
    if (frecuencia === 'MENSUAL') {
      this.newLoanData.diaCobro = 15;
    } else if (frecuencia === 'QUINCENAL') {
      this.newLoanData.diaCobro = 15;
    } else if (frecuencia === 'DIARIO') {
      this.newLoanData.diaCobro = 1;
    } else {
      this.newLoanData.diaCobro = 1;
    }
  }

  async onCreateLoan(event: Event) {
    event.preventDefault();
    
    if (this.clientMode === 'existing' && !this.newLoanData.clientId) {
      this.toastService.error('Debe seleccionar un cliente.');
      return;
    }
    
    if (this.clientMode === 'new' && (!this.newLoanData.clienteNombre || !this.newLoanData.clienteTelefono)) {
      this.toastService.error('Por favor indique el nombre y teléfono del nuevo cliente.');
      return;
    }

    if (!this.newLoanData.montoOriginal || !this.newLoanData.cuotaSemanal) {
      this.toastService.error('Los montos son requeridos.');
      return;
    }

    try {
      await this.loanService.createLoan({
        clientId: this.clientMode === 'existing' ? this.newLoanData.clientId : undefined,
        clienteNombre: this.clientMode === 'new' ? this.newLoanData.clienteNombre : undefined,
        clienteTelefono: this.clientMode === 'new' ? this.newLoanData.clienteTelefono : undefined,
        tipoIdentificacion: this.clientMode === 'new' ? this.newLoanData.tipoIdentificacion || null : undefined,
        numeroIdentificacion: this.clientMode === 'new' ? this.newLoanData.numeroIdentificacion || null : undefined,
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

  /** Placeholder contextual según el tipo de identificación. */
  getIdPlaceholder(tipo: string): string {
    switch (tipo) {
      case 'CEDULA_NACIONAL':  return '1-1234-5678';
      case 'RESIDENCIA_DIMEX': return '12345678901';
      case 'PASAPORTE':        return 'ABC123456';
      default:                 return 'Núm. de documento';
    }
  }

  /** Longitud máxima de caracteres según tipo. */
  getIdMaxLength(tipo: string): number {
    switch (tipo) {
      case 'CEDULA_NACIONAL':  return 11; // X-XXXX-XXXX con guiones
      case 'RESIDENCIA_DIMEX': return 12; // 11 o 12 dígitos
      case 'PASAPORTE':        return 20;
      default:                 return 30;
    }
  }

  /** Texto de ayuda bajo el campo. */
  getIdHint(tipo: string): string {
    switch (tipo) {
      case 'CEDULA_NACIONAL':  return 'Formato: #-####-#### (9 dígitos)';
      case 'RESIDENCIA_DIMEX': return 'Solo números — 11 o 12 dígitos';
      case 'PASAPORTE':        return 'Letras y números, sin espacios';
      default:                 return '';
    }
  }

  /** Auto-formatea cédula (X-XXXX-XXXX) y filtra caracteres inválidos. */
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
    // Para OTRO: sin restricción
  }
}

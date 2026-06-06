import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoanService, Loan, Payment } from '../services/loan.service';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-industrial-black text-industrial-light pb-24 font-sans select-none">
      
      <!-- Top Caterpillar Branded Bar -->
      <header class="bg-industrial-dark border-b border-industrial-border px-5 py-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-caterpillar rounded-lg flex items-center justify-center font-extrabold text-industrial-black text-lg">
            C
          </div>
          <div>
            <h1 class="text-lg font-bold text-white leading-tight tracking-tight">CAT-LOAN</h1>
            <p class="text-[10px] text-caterpillar uppercase tracking-wider font-mono">B2B LENDER CONSOLE</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Quick dev toggle subscription status -->
          <button (click)="toggleSub()" 
                  class="text-xs bg-industrial-surface border border-industrial-border px-3 py-1.5 rounded-lg text-caterpillar hover:text-white font-mono transition duration-150">
            🔒 [Suscripción: {{ loanService.isExpired() ? 'Expirada' : 'Activa' }}]
          </button>
          
          <button (click)="openCreateModal()" 
                  class="bg-caterpillar hover:bg-caterpillar-dark text-industrial-black p-2 rounded-lg font-bold transition duration-150 shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </header>

      <!-- Main Layout container -->
      <main class="max-w-md mx-auto px-4 mt-6">
        
        <!-- KPI Cards Grid -->
        <section class="grid grid-cols-3 gap-3 mb-6">
          <div class="bg-industrial-dark border border-industrial-border p-3 rounded-xl flex flex-col justify-between">
            <span class="text-[10px] text-industrial-muted uppercase font-mono">En la Calle</span>
            <span class="text-sm font-black text-white mt-1">{{ capitalEnCalle() | currency:'USD':'symbol':'1.0-0' }}</span>
          </div>
          <div class="bg-industrial-dark border border-industrial-border p-3 rounded-xl flex flex-col justify-between">
            <span class="text-[10px] text-industrial-muted uppercase font-mono">Esta Semana</span>
            <span class="text-sm font-black text-caterpillar mt-1">{{ porCobrarEstaSemana() | currency:'USD':'symbol':'1.0-0' }}</span>
          </div>
          <div class="bg-industrial-dark border border-industrial-border p-3 rounded-xl flex flex-col justify-between">
            <span class="text-[10px] text-industrial-muted uppercase font-mono">Rendimiento</span>
            <span class="text-sm font-black text-semantic-emerald mt-1">{{ rendimientoEstimado() | currency:'USD':'symbol':'1.0-0' }}</span>
          </div>
        </section>

        <!-- Dynamic Cobranza Wall Selector Tabs -->
        <section class="bg-industrial-dark border border-industrial-border p-1 rounded-xl mb-4 flex gap-1">
          <button (click)="activeTab.set('atrasados')" 
                  [class]="'flex-1 py-2.5 text-xs font-bold uppercase rounded-lg transition-all ' + (activeTab() === 'atrasados' ? 'bg-semantic-red text-white shadow-md' : 'text-industrial-muted hover:text-white')">
            Atrasados ({{ atrasadosCount() }})
          </button>
          <button (click)="activeTab.set('hoy')" 
                  [class]="'flex-1 py-2.5 text-xs font-bold uppercase rounded-lg transition-all ' + (activeTab() === 'hoy' ? 'bg-caterpillar text-industrial-black shadow-md' : 'text-industrial-muted hover:text-white')">
            Vencen Hoy ({{ hoyCount() }})
          </button>
          <button (click)="activeTab.set('dia')" 
                  [class]="'flex-1 py-2.5 text-xs font-bold uppercase rounded-lg transition-all ' + (activeTab() === 'dia' ? 'bg-industrial-surface border border-industrial-border text-white shadow-md' : 'text-industrial-muted hover:text-white')">
            Al Día ({{ alDiaCount() }})
          </button>
        </section>

        <!-- Cobranza Wall List -->
        <section class="space-y-3">
          <div *ngIf="filteredLoans().length === 0" class="text-center py-10 bg-industrial-dark/50 border border-dashed border-industrial-border rounded-xl">
            <p class="text-xs text-industrial-muted">Sin clientes registrados en esta categoría</p>
          </div>

          <div *ngFor="let loan of filteredLoans()" 
               class="bg-industrial-dark border border-industrial-border rounded-xl p-4 transition-all duration-200 hover:border-caterpillar/30">
            <div class="flex justify-between items-start mb-2">
              <div>
                <h3 class="font-extrabold text-white text-base">{{ loan.clienteNombre }}</h3>
                <span class="text-xs text-industrial-muted font-mono">{{ loan.clienteTelefono }}</span>
              </div>
              <div class="text-right">
                <span class="text-xs text-industrial-muted font-mono block">Pendiente</span>
                <span class="text-sm font-black text-white block">{{ loan.balancePendiente | currency:'USD' }}</span>
              </div>
            </div>

            <!-- Client Info Meta Grid -->
            <div class="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-industrial-border/60 text-xs">
              <div>
                <span class="text-industrial-muted block">Progreso:</span>
                <span class="text-white font-bold block">Cuota {{ loan.cuotaActual }} de {{ loan.cuotasTotales }}</span>
              </div>
              <div class="text-right">
                <span class="text-industrial-muted block">Cuota Semanal:</span>
                <span class="text-caterpillar font-bold block">{{ loan.cuotaSemanal | currency:'USD' }}</span>
              </div>
            </div>

            <!-- Action buttons: WhatsApp message and Statement Details -->
            <div class="flex items-center gap-2 mt-4">
              <button (click)="openStatement(loan)" 
                      class="flex-1 bg-industrial-surface hover:bg-industrial-border border border-industrial-border text-xs text-white py-2 rounded-lg font-bold transition duration-150">
                Estado de Cuenta
              </button>
              
              <button (click)="openAbonoModal(loan)" 
                      class="flex-1 bg-caterpillar hover:bg-caterpillar-dark text-industrial-black text-xs py-2 rounded-lg font-bold transition duration-150">
                Registrar Abono
              </button>
              
              <a [href]="getWhatsappLink(loan)" target="_blank"
                 class="w-10 h-10 bg-emerald-600/20 hover:bg-emerald-600/40 text-semantic-emerald flex items-center justify-center rounded-lg border border-semantic-emerald/30 transition duration-150">
                <svg class="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.498 1.45 5.429 1.451 5.517 0 10.005-4.486 10.008-10.007.002-2.673-1.037-5.188-2.928-7.081-1.892-1.892-4.408-2.934-7.083-2.935-5.52 0-10.007 4.488-10.01 10.01-.001 1.916.498 3.793 1.448 5.378L1.745 22.25l6.559-1.722L6.647 19.15z"/>
                </svg>
              </a>
            </div>
          </div>
        </section>
      </main>

      <!-- MODAL 1: Create Loan Form -->
      <div *ngIf="showCreateModal()" class="fixed inset-0 z-50 bg-black/80 flex items-end justify-center backdrop-blur-sm">
        <div class="bg-industrial-dark w-full max-w-md rounded-t-2xl border-t border-industrial-border p-6 pb-8">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-black text-white uppercase tracking-tight">Nuevo Préstamo</h2>
            <button (click)="showCreateModal.set(false)" class="text-industrial-muted hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form (submit)="onCreateLoan($event)" class="space-y-4">
            <div>
              <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Nombre Completo del Cliente</label>
              <input type="text" [(ngModel)]="newLoanData.clienteNombre" name="clienteNombre" required 
                     class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar">
            </div>
            <div>
              <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Teléfono (WhatsApp)</label>
              <input type="text" [(ngModel)]="newLoanData.clienteTelefono" name="clienteTelefono" required 
                     class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Monto Original</label>
                <input type="number" [(ngModel)]="newLoanData.montoOriginal" name="montoOriginal" required 
                       class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar">
              </div>
              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Cuota Semanal</label>
                <input type="number" [(ngModel)]="newLoanData.cuotaSemanal" name="cuotaSemanal" required 
                       class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar">
              </div>
            </div>
            <div>
              <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Día de Cobro Pactado</label>
              <select [(ngModel)]="newLoanData.diaCobro" name="diaCobro" required 
                      class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar">
                <option [value]="1">Lunes</option>
                <option [value]="2">Martes</option>
                <option [value]="3">Miércoles</option>
                <option [value]="4">Jueves</option>
                <option [value]="5">Viernes</option>
                <option [value]="6">Sábado</option>
                <option [value]="7">Domingo</option>
              </select>
            </div>
            <div class="bg-industrial-surface p-3 rounded-lg border border-industrial-border text-xs text-industrial-muted font-mono flex justify-between items-center mt-2">
              <span>Total Estimado a Cobrar (+50%):</span>
              <span class="text-white font-extrabold text-sm">{{ (newLoanData.montoOriginal || 0) * 1.5 | currency:'USD' }}</span>
            </div>
            
            <button type="submit" 
                    class="w-full bg-caterpillar hover:bg-caterpillar-dark text-industrial-black py-3 rounded-lg font-black uppercase tracking-wider text-sm transition duration-150 mt-4 shadow-lg">
              Crear Préstamo Activo
            </button>
          </form>
        </div>
      </div>

      <!-- MODAL 2: Add Payment / Abono -->
      <div *ngIf="showAbonoModal()" class="fixed inset-0 z-50 bg-black/80 flex items-end justify-center backdrop-blur-sm">
        <div class="bg-industrial-dark w-full max-w-md rounded-t-2xl border-t border-industrial-border p-6 pb-8">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-black text-white uppercase tracking-tight">Registrar Abono</h2>
            <button (click)="showAbonoModal.set(false)" class="text-industrial-muted hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div *ngIf="selectedLoanForAbono" class="space-y-4">
            <div class="bg-industrial-surface p-4 rounded-xl border border-industrial-border">
              <div class="flex justify-between text-xs text-industrial-muted">
                <span>Cliente:</span>
                <span>Balance Pendiente:</span>
              </div>
              <div class="flex justify-between mt-1 items-end">
                <span class="text-white font-extrabold text-sm">{{ selectedLoanForAbono.clienteNombre }}</span>
                <span class="text-caterpillar font-black text-base">{{ selectedLoanForAbono.balancePendiente | currency:'USD' }}</span>
              </div>
            </div>

            <form (submit)="onSubmitAbono($event)" class="space-y-4">
              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Monto a Abonar</label>
                <input type="number" [(ngModel)]="abonoMonto" name="abonoMonto" required 
                       class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar">
              </div>
              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Notas / Observaciones</label>
                <input type="text" [(ngModel)]="abonoNotas" name="abonoNotas" placeholder="Opcional..." 
                       class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar">
              </div>
              
              <button type="submit" 
                      class="w-full bg-caterpillar hover:bg-caterpillar-dark text-industrial-black py-3 rounded-lg font-black uppercase tracking-wider text-sm transition duration-150 mt-4 shadow-lg">
                Registrar Abono e Imprimir
              </button>
            </form>
          </div>
        </div>
      </div>

      <!-- MODAL 3: Account Statement Visual Pro -->
      <div *ngIf="showStatementModal()" class="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
        <div class="w-full max-w-sm flex flex-col items-center">
          
          <!-- Shared Account Statement Card Wrapper -->
          <div id="statement-card" class="w-full bg-industrial-dark border border-industrial-border rounded-2xl p-6 shadow-2xl relative overflow-hidden text-industrial-light">
            <!-- Caterpillar Caution Stripe Accent -->
            <div class="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-caterpillar via-industrial-black to-caterpillar bg-[length:30px_8px]"></div>

            <div class="text-center border-b border-industrial-border/60 pb-4 mt-2 mb-4">
              <h2 class="text-xs text-caterpillar uppercase tracking-widest font-mono">Estado de Cuenta Oficial</h2>
              <p class="text-[9px] text-industrial-muted uppercase tracking-wider font-mono">B2B Caterpillar Credit</p>
            </div>

            <!-- Client Metadata -->
            <div class="space-y-1 text-sm mb-4">
              <div class="flex justify-between">
                <span class="text-industrial-muted">Cliente:</span>
                <span class="text-white font-extrabold">{{ selectedStatementLoan?.clienteNombre }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-industrial-muted">Teléfono:</span>
                <span class="text-white font-mono">{{ selectedStatementLoan?.clienteTelefono }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-industrial-muted">F. Inicio:</span>
                <span class="text-white font-mono">{{ selectedStatementLoan?.fechaInicio | date:'dd/MM/yyyy' }}</span>
              </div>
            </div>

            <!-- Financial Status Box -->
            <div class="bg-industrial-surface border border-industrial-border p-4 rounded-xl space-y-2 mb-4">
              <div class="flex justify-between text-xs">
                <span class="text-industrial-muted">Monto Original (x1.5):</span>
                <span class="text-white font-bold">{{ selectedStatementLoan?.totalAPagar | currency:'USD' }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-industrial-muted">Total Abonado:</span>
                <span class="text-semantic-emerald font-bold">+{{ (selectedStatementLoan?.totalAPagar || 0) - (selectedStatementLoan?.balancePendiente || 0) | currency:'USD' }}</span>
              </div>
              <div class="flex justify-between text-sm pt-2 border-t border-industrial-border/60 font-black">
                <span class="text-white">BALANCE RESTANTE:</span>
                <span class="text-caterpillar">{{ selectedStatementLoan?.balancePendiente | currency:'USD' }}</span>
              </div>
            </div>

            <!-- Payment Progress -->
            <div class="space-y-1.5 text-xs mb-4">
              <div class="flex justify-between">
                <span class="text-industrial-muted">Progreso Cuotas:</span>
                <span class="text-white font-bold">Cuota {{ selectedStatementLoan?.cuotaActual }} de {{ selectedStatementLoan?.cuotasTotales }}</span>
              </div>
              <div class="w-full bg-industrial-surface h-2.5 rounded-full overflow-hidden border border-industrial-border">
                <div class="bg-caterpillar h-full rounded-full transition-all duration-300"
                     [style.width.%]="getProgressPercentage()"></div>
              </div>
            </div>

            <!-- Receipt Lists -->
            <div>
              <span class="text-xs text-industrial-muted uppercase font-mono block mb-2">Historial de Abonos</span>
              <div class="max-h-36 overflow-y-auto space-y-2 pr-1 border border-industrial-border/40 p-2 rounded-lg bg-industrial-surface/50">
                <div *ngIf="selectedStatementLoan?.payments?.length === 0" class="text-[10px] text-industrial-muted text-center py-4">
                  No se han registrado abonos aún
                </div>
                <div *ngFor="let pay of selectedStatementLoan?.payments" class="text-xs flex justify-between bg-industrial-dark p-2 border border-industrial-border rounded-lg">
                  <div>
                    <span class="text-[9px] text-industrial-muted font-mono block">{{ pay.numeroRecibo }}</span>
                    <span class="text-[9px] text-white block">{{ pay.fechaPago | date:'dd/MM HH:mm' }}</span>
                  </div>
                  <div class="text-right">
                    <span class="text-white font-black block">{{ pay.montoAbonado | currency:'USD' }}</span>
                    <span class="text-[8px] text-industrial-muted block" *ngIf="pay.notas">{{ pay.notas }}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- Statement Modal Actions -->
          <div class="w-full flex gap-3 mt-4">
            <button (click)="exportAndShare()" 
                    class="flex-1 bg-caterpillar hover:bg-caterpillar-dark text-industrial-black py-3 rounded-lg font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition duration-150">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 10.742l4.63-2.315a1.5 1.5 0 11.536.536l-4.63 2.315a1.5 1.5 0 11-.536-.536zm0 2.516l4.63 2.315a1.5 1.5 0 11-.536.536l-4.63-2.315a1.5 1.5 0 11.536-.536z" />
              </svg>
              Compartir Recibo
            </button>
            <button (click)="showStatementModal.set(false)" 
                    class="bg-industrial-surface border border-industrial-border hover:bg-industrial-border text-white text-xs font-bold px-4 py-3 rounded-lg transition duration-150">
              Cerrar
            </button>
          </div>
          
        </div>
      </div>

    </div>
  `,
  styles: [`
    /* Custom scrollbar styling inside statement scroll container */
    div::-webkit-scrollbar {
      width: 4px;
    }
  `]
})
export class DashboardComponent implements OnInit {
  loanService = inject(LoanService);

  // States
  activeTab = signal<'atrasados' | 'hoy' | 'dia'>('hoy');
  showCreateModal = signal<boolean>(false);
  showAbonoModal = signal<boolean>(false);
  showStatementModal = signal<boolean>(false);

  // Selected entities
  selectedLoanForAbono: Loan | null = null;
  selectedStatementLoan: Loan | null = null;

  // Form bindings
  newLoanData = {
    clienteNombre: '',
    clienteTelefono: '',
    montoOriginal: null as number | null,
    cuotaSemanal: null as number | null,
    diaCobro: 1
  };
  abonoMonto: number | null = null;
  abonoNotas: string = '';

  // Get current weekday mapped to 1-7
  get currentWeekday(): number {
    const day = new Date().getDay();
    // getDay() gives 0 (Sunday) to 6 (Saturday)
    // We want: 1 = Lunes, 6 = Sábado, 7 = Domingo
    if (day === 0) return 7;
    return day;
  }

  // Count helper functions
  atrasadosCount = signal<number>(0);
  hoyCount = signal<number>(0);
  alDiaCount = signal<number>(0);

  // Read signals
  loans = this.loanService.loans;
  capitalEnCalle = this.loanService.capitalEnCalle;
  porCobrarEstaSemana = this.loanService.porCobrarEstaSemana;
  rendimientoEstimado = this.loanService.rendimientoEstimado;

  ngOnInit() {
    this.loanService.loadLoans().then(() => {
      this.recalculateCounts();
    });
  }

  recalculateCounts() {
    const list = this.loans();
    const today = this.currentWeekday;

    let atrasados = 0;
    let hoy = 0;
    let aldia = 0;

    list.forEach(l => {
      if (l.estado === 'PAID') return;

      const paymentsTotal = l.payments.reduce((sum, p) => sum + Number(p.montoAbonado), 0);
      const weeksActive = Math.max(1, Math.ceil((Date.now() - new Date(l.fechaInicio).getTime()) / (7 * 24 * 60 * 60 * 1000)));
      const targetWeeklyExpectation = Number(l.cuotaSemanal) * weeksActive;

      // Logic definition:
      // Atrasado: Accumulated paid balance is less than weekly quota expectation based on time elapsed
      if (paymentsTotal < targetWeeklyExpectation) {
        atrasados++;
      } else if (l.diaCobro === today) {
        hoy++;
      } else {
        aldia++;
      }
    });

    this.atrasadosCount.set(atrasados);
    this.hoyCount.set(hoy);
    this.alDiaCount.set(aldia);
  }

  filteredLoans(): Loan[] {
    const list = this.loans();
    const today = this.currentWeekday;

    return list.filter(l => {
      if (l.estado === 'PAID') return false;

      const paymentsTotal = l.payments.reduce((sum, p) => sum + Number(p.montoAbonado), 0);
      const weeksActive = Math.max(1, Math.ceil((Date.now() - new Date(l.fechaInicio).getTime()) / (7 * 24 * 60 * 60 * 1000)));
      const targetWeeklyExpectation = Number(l.cuotaSemanal) * weeksActive;

      const isAtrasado = paymentsTotal < targetWeeklyExpectation;
      const isHoy = l.diaCobro === today;

      if (this.activeTab() === 'atrasados') {
        return isAtrasado;
      }
      if (this.activeTab() === 'hoy') {
        return !isAtrasado && isHoy;
      }
      // al día category (is not behind, and is not scheduled for today)
      return !isAtrasado && !isHoy;
    });
  }

  getProgressPercentage(): number {
    if (!this.selectedStatementLoan) return 0;
    const paid = Number(this.selectedStatementLoan.totalAPagar) - Number(this.selectedStatementLoan.balancePendiente);
    return Math.min(100, Math.round((paid / Number(this.selectedStatementLoan.totalAPagar)) * 100));
  }

  getWhatsappLink(loan: Loan): string {
    const formattedMsg = `Hola ${loan.clienteNombre}, te escribo para recordarte que tu balance pendiente es de ${loan.balancePendiente} USD. Tu cuota programada es de ${loan.cuotaSemanal} USD. Favor de enviar el abono a la brevedad. ¡Gracias!`;
    return `https://wa.me/${loan.clienteTelefono}?text=${encodeURIComponent(formattedMsg)}`;
  }

  openCreateModal() {
    this.newLoanData = {
      clienteNombre: '',
      clienteTelefono: '',
      montoOriginal: null,
      cuotaSemanal: null,
      diaCobro: 1
    };
    this.showCreateModal.set(true);
  }

  async onCreateLoan(event: Event) {
    event.preventDefault();
    if (!this.newLoanData.clienteNombre || !this.newLoanData.clienteTelefono || !this.newLoanData.montoOriginal || !this.newLoanData.cuotaSemanal) {
      alert('Por favor llene todos los campos');
      return;
    }

    try {
      await this.loanService.createLoan({
        clienteNombre: this.newLoanData.clienteNombre,
        clienteTelefono: this.newLoanData.clienteTelefono,
        montoOriginal: Number(this.newLoanData.montoOriginal),
        cuotaSemanal: Number(this.newLoanData.cuotaSemanal),
        diaCobro: Number(this.newLoanData.diaCobro)
      });
      this.showCreateModal.set(false);
      this.recalculateCounts();
    } catch (err: any) {
      if (err.status === 403) {
        alert('Suscripción Expirada. Habilite en panel.');
      } else {
        alert('Error al registrar el préstamo');
      }
    }
  }

  openAbonoModal(loan: Loan) {
    this.selectedLoanForAbono = loan;
    this.abonoMonto = null;
    this.abonoNotas = '';
    this.showAbonoModal.set(true);
  }

  async onSubmitAbono(event: Event) {
    event.preventDefault();
    if (!this.selectedLoanForAbono || !this.abonoMonto || this.abonoMonto <= 0) {
      alert('Ingrese un abono válido');
      return;
    }

    try {
      await this.loanService.addPayment(
        this.selectedLoanForAbono.id,
        this.abonoMonto,
        this.abonoNotas
      );
      this.showAbonoModal.set(false);
      this.recalculateCounts();
      
      // Auto open receipt sharing modal after success
      const updated = this.loans().find(l => l.id === this.selectedLoanForAbono?.id);
      if (updated) {
        this.openStatement(updated);
      }
    } catch (err: any) {
      alert(err.error?.error || 'No se pudo aplicar el abono');
    }
  }

  openStatement(loan: Loan) {
    this.selectedStatementLoan = loan;
    this.showStatementModal.set(true);
  }

  async exportAndShare() {
    const element = document.getElementById('statement-card');
    if (!element) return;

    try {
      // Create canvas from modal card
      const canvas = await html2canvas(element, {
        backgroundColor: '#121212',
        scale: 2
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], `Recibo_${this.selectedStatementLoan?.clienteNombre}.png`, { type: 'image/png' });
        
        // Use Web Share API if supported
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'Recibo de Pago',
              text: `Hola ${this.selectedStatementLoan?.clienteNombre}, adjunto envío tu estado de cuenta digital.`
            });
          } catch (shareErr) {
            this.downloadFallback(canvas);
          }
        } else {
          // Standard browser download fallback
          this.downloadFallback(canvas);
        }
      }, 'image/png');

    } catch (err) {
      alert('Error al exportar el estado de cuenta');
    }
  }

  downloadFallback(canvas: HTMLCanvasElement) {
    const link = document.createElement('a');
    link.download = `EstadoCuenta_${this.selectedStatementLoan?.clienteNombre}.png`;
    link.href = canvas.toDataURL();
    link.click();
    alert('Recibo exportado como imagen. Ya puede enviarlo por WhatsApp manualmente.');
  }

  toggleSub() {
    this.loanService.toggleSubscription().then(() => {
      this.recalculateCounts();
    });
  }
}

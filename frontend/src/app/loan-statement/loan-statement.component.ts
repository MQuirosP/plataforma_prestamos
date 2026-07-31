import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoanService, Loan, Payment, Role, PaymentMethod, PaymentTipo } from '../services/loan.service';
import { ClientService } from '../services/client.service';
import { ToastService } from '../services/toast.service';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-loan-statement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-industrial-black text-white pb-24 font-sans select-none pt-6">
      <main class="max-w-md mx-auto px-4 space-y-6">
      
      <!-- View Mode Toggle (Shown if lastPayment exists) -->
      <div *ngIf="lastPayment" class="flex justify-end mb-2">
        <div class="flex bg-industrial-surface p-1 rounded-xl border border-industrial-border">
          <button (click)="showAsReceipt.set(false)" 
                  [class]="!showAsReceipt() ? 'bg-caterpillar text-industrial-black font-black' : 'text-industrial-muted hover:text-caterpillar font-bold'"
                  class="px-3.5 py-1.5 rounded-lg text-xs transition">
            📄 Estado de Cuenta
          </button>
          <button (click)="showAsReceipt.set(true)" 
                  [class]="showAsReceipt() ? 'bg-caterpillar text-industrial-black font-black' : 'text-industrial-muted hover:text-caterpillar font-bold'"
                  class="px-3.5 py-1.5 rounded-lg text-xs transition">
            🧾 Recibo Último Abono
          </button>
        </div>
      </div>

      <!-- STATEMENT / RECEIPT CARD DOCUMENT AREA -->
      <div id="statement-card" class="bg-industrial-dark border border-industrial-border rounded-2xl p-6 md:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-caterpillar via-industrial-black to-caterpillar bg-[length:30px_8px]"></div>

        <!-- RECEIPT VIEW -->
        <div *ngIf="showAsReceipt() && lastPayment" class="space-y-6">
          <div class="text-center border-b border-industrial-border/60 pb-4 flex flex-col items-center">
            <img src="/assets/images/logo-header.webp" width="160" height="32" class="h-8 w-auto object-contain mb-2" alt="Logo Cat-Loan">
            <h2 class="text-sm text-caterpillar uppercase tracking-widest font-mono font-bold">Comprobante Oficial de Abono</h2>
            <p class="text-[10px] text-industrial-muted uppercase tracking-wider font-mono">
              {{ loanService.settings()?.nombreNegocio || 'CAT-LOAN Credit' }}
            </p>
            <span class="text-xs text-industrial-muted font-mono mt-1">Nº Recibo: {{ lastPayment.numeroRecibo }}</span>
          </div>

          <div class="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span class="text-industrial-muted block font-mono text-[10px]">CLIENTE</span>
              <span class="text-white font-extrabold text-sm block">{{ loan.clienteNombre }}</span>
              <a [href]="'https://wa.me/' + getCleanPhone(loan.clienteTelefono || '')" target="_blank" class="text-industrial-muted hover:text-emerald-400 font-mono text-xs transition duration-150 inline-block mt-0.5">
                {{ loan.clienteTelefono }}
              </a>
            </div>
            <div class="text-right">
              <span class="text-industrial-muted block font-mono text-[10px]">FECHA / HORA</span>
              <span class="text-white font-mono block">{{ lastPayment.fechaPago | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>
          </div>

          <div class="bg-industrial-surface border border-industrial-border p-4 rounded-xl space-y-3">
            <div class="flex justify-between items-center text-xs">
              <span class="text-industrial-muted uppercase font-mono">Monto Abonado:</span>
              <span class="text-semantic-emerald font-black text-base">
                {{ loanService.settings()?.monedaSimbolo || '₡' }} {{ lastPayment.montoAbonado | number:'1.0-0' }}
              </span>
            </div>
            <div class="flex justify-between items-center text-xs">
              <span class="text-industrial-muted uppercase font-mono">Método de Pago:</span>
              <span [class]="'text-[10px] font-bold uppercase rounded px-2 py-0.5 ' + (lastPayment.metodoPago === 'EFECTIVO' ? 'bg-amber-900/50 text-amber-400' : lastPayment.metodoPago === 'SINPE' ? 'bg-blue-900/50 text-blue-400' : 'bg-purple-900/50 text-purple-400')">
                {{ lastPayment.metodoPago }}
              </span>
            </div>
            <div *ngIf="lastPayment.notas" class="flex justify-between items-center text-xs">
              <span class="text-industrial-muted uppercase font-mono">Notas:</span>
              <span class="text-white text-xs font-mono">{{ lastPayment.notas }}</span>
            </div>
            <div class="flex justify-between items-center text-xs pt-2 border-t border-industrial-border/60">
              <span class="text-industrial-muted uppercase font-mono">Balance Restante:</span>
              <span class="text-caterpillar font-black text-sm">
                {{ loanService.settings()?.monedaSimbolo || '₡' }} {{ loan.balancePendiente | number:'1.0-0' }}
              </span>
            </div>
          </div>

          <div class="text-center pt-2 text-xs text-industrial-muted italic">
            ¡Gracias por su abono puntual!
          </div>
        </div>

        <!-- FULL ACCOUNT STATEMENT VIEW -->
        <div *ngIf="!showAsReceipt() || !lastPayment" class="space-y-5">
          <div class="flex items-center justify-between gap-3 border-b border-industrial-border/60 pb-3">
            <div class="flex items-center gap-2.5">
              <img src="/assets/images/logo-header.webp" width="160" height="32" class="h-6 w-auto object-contain" alt="Logo Cat-Loan">
              <div>
                <h2 class="text-[10px] text-caterpillar uppercase tracking-widest font-mono font-black leading-tight">Estado de Cuenta Oficial</h2>
                <p class="text-[8px] text-industrial-muted uppercase tracking-wider font-mono">
                  {{ loanService.settings()?.nombreNegocio || 'CAT-LOAN Credit' }}
                </p>
              </div>
            </div>
            <span class="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-industrial-surface border border-industrial-border text-caterpillar font-mono shrink-0">
              {{ loan.modalidad === 'ALQUILER' ? 'ALQ' : 'TRADIC' }}
            </span>
          </div>

          <!-- CLIENT INFORMATION GRID (Strict 2-column mobile layout for receipt) -->
          <div class="grid grid-cols-2 gap-3 bg-industrial-surface/40 p-3.5 rounded-xl border border-industrial-border text-xs relative">
            <div class="col-span-2">
              <span class="text-industrial-muted font-mono text-[9px] block uppercase">Cliente</span>
              <span class="text-white font-extrabold text-sm leading-tight block">{{ loan.clienteNombre }}</span>
            </div>
            <div>
              <span class="text-industrial-muted font-mono text-[9px] block uppercase">Teléfono</span>
              <span class="text-industrial-muted font-mono text-xs block">{{ loan.clienteTelefono }}</span>
            </div>
            <div>
              <span class="text-industrial-muted font-mono text-[9px] block uppercase">Fecha de Inicio</span>
              <span class="text-white font-mono text-xs block">{{ loan.fechaInicio | date:'dd/MM/yyyy' }}</span>
            </div>
          </div>

          <!-- FINANCIAL SUMMARY CARDS -->
          <div class="grid grid-cols-2 gap-3 text-xs">
            <div class="bg-industrial-surface border border-industrial-border p-3.5 rounded-xl">
              <span class="text-industrial-muted font-mono text-[9px] uppercase block">Monto Préstamo</span>
              <span class="text-white font-black text-sm">
                {{ loanService.settings()?.monedaSimbolo || '₡' }} {{ loan.totalAPagar | number:'1.0-0' }}
              </span>
            </div>

            <div class="bg-industrial-surface border border-industrial-border p-3.5 rounded-xl">
              <span class="text-industrial-muted font-mono text-[9px] uppercase block">Total Abonado</span>
              <span class="text-semantic-emerald font-black text-sm">
                {{ loanService.settings()?.monedaSimbolo || '₡' }} {{ getTotalAbonado() | number:'1.0-0' }}
              </span>
            </div>

            <div class="bg-industrial-surface border border-industrial-border p-3.5 rounded-xl">
              <span class="text-industrial-muted font-mono text-[9px] uppercase block">Multas</span>
              <span [class]="Number(loan.multasAcumuladas || 0) > 0 ? 'text-semantic-red font-black text-sm' : 'text-industrial-muted font-mono text-sm'">
                {{ loanService.settings()?.monedaSimbolo || '₡' }} {{ (loan.multasAcumuladas || 0) | number:'1.0-0' }}
              </span>
            </div>

            <div class="bg-industrial-surface border border-caterpillar/40 p-3.5 rounded-xl bg-gradient-to-br from-industrial-surface to-industrial-dark flex flex-col justify-center">
              <span class="text-caterpillar font-mono text-[9px] uppercase font-bold block">Restante</span>
              <span class="text-caterpillar font-black text-sm">
                {{ loanService.settings()?.monedaSimbolo || '₡' }} {{ loan.balancePendiente | number:'1.0-0' }}
              </span>
            </div>
          </div>

          <!-- CONDONED FINE BANNER (IF ANY) -->
          <div *ngIf="loan.montoCondonado && loan.montoCondonado > 0" 
               class="bg-amber-950/40 border border-amber-500/40 p-3.5 rounded-xl flex items-center justify-between text-xs">
            <div class="flex items-center gap-2">
              <span class="text-base">🎁</span>
              <div>
                <span class="text-amber-400 font-bold block">Mora Condonada Anteriormente</span>
                <span class="text-amber-300/70 text-[10px] font-mono">Exoneración registrada en el historial</span>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-amber-400 font-black text-sm">
                -{{ loanService.settings()?.monedaSimbolo || '₡' }} {{ loan.montoCondonado | number:'1.0-0' }}
              </span>
              <button *ngIf="loanService.currentUser()?.rol !== Role.COBRADOR"
                      (click)="confirmReversarCondonacion()"
                      class="bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500 hover:text-industrial-black px-2 py-1 rounded transition text-[10px] font-bold">
                Reversar
              </button>
            </div>
          </div>

          <!-- PAYMENT PROGRESS BAR -->
          <div class="bg-industrial-surface border border-industrial-border p-4 rounded-xl space-y-2">
            <div class="flex justify-between text-xs font-mono">
              <span class="text-industrial-muted uppercase">Progreso de Cuotas</span>
              <span class="text-white font-bold">Cuota {{ loan.cuotaActual }} de {{ loan.cuotasTotales }}</span>
            </div>
            <div class="w-full bg-industrial-dark h-3 rounded-full overflow-hidden border border-industrial-border">
              <div class="bg-caterpillar h-full rounded-full transition-all duration-300"
                   [style.width.%]="getProgressPercentage()"></div>
            </div>
          </div>

          <!-- MOVEMENTS TABLE -->
          <div class="space-y-3">
            <h3 class="text-xs text-caterpillar uppercase font-mono font-bold tracking-wider">Historial de Movimientos y Abonos</h3>
            
            <div class="border border-industrial-border rounded-xl overflow-hidden bg-industrial-surface/30">
              <div *ngIf="!loan.payments || loan.payments.length === 0" class="text-xs text-industrial-muted text-center py-8">
                No se han registrado abonos ni movimientos para este préstamo.
              </div>

              <div *ngIf="loan.payments && loan.payments.length > 0" class="divide-y divide-industrial-border/60">
                <div *ngFor="let pay of loan.payments" 
                     [class]="'p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs transition ' + (pay.tipoPago === PaymentTipo.CONDONACION_MORA ? 'bg-amber-950/30' : pay.tipoPago === PaymentTipo.PAGO_MORA ? 'bg-rose-950/30' : 'hover:bg-industrial-surface/80')">
                  
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <span class="font-mono text-industrial-muted text-[10px]">{{ pay.numeroRecibo }}</span>
                      <span *ngIf="pay.tipoPago === PaymentTipo.CONDONACION_MORA" 
                            class="text-[9px] font-bold uppercase rounded px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        🎁 Condonación de Mora
                      </span>
                      <span *ngIf="pay.metodoPago && pay.tipoPago !== PaymentTipo.CONDONACION_MORA" 
                        [class]="'text-[9px] font-bold uppercase rounded px-1.5 py-0.5 mt-0.5 inline-block ' + (pay.metodoPago === 'EFECTIVO' ? 'bg-amber-900/50 text-amber-400' : pay.metodoPago === 'SINPE' ? 'bg-blue-900/50 text-blue-400' : 'bg-purple-900/50 text-purple-400')">
                        {{ pay.metodoPago }}
                      </span>
                    </div>
                    <span class="text-[11px] text-white font-mono block">{{ pay.fechaPago | date:'dd/MM/yyyy HH:mm' }}</span>
                    <span *ngIf="pay.notas" class="text-[10px] text-industrial-muted block italic">{{ pay.notas }}</span>
                  </div>

                  <div class="flex items-center gap-4">
                    <span [class]="pay.tipoPago === PaymentTipo.CONDONACION_MORA ? 'text-amber-400 font-black text-sm font-mono' : pay.tipoPago === PaymentTipo.PAGO_MORA ? 'text-rose-400 font-black text-sm font-mono' : 'text-semantic-emerald font-black text-sm font-mono'">
                      {{ pay.tipoPago === PaymentTipo.CONDONACION_MORA ? '-' : pay.tipoPago === PaymentTipo.PAGO_MORA ? '' : '+' }}{{ loanService.settings()?.monedaSimbolo || '₡' }} {{ pay.montoAbonado | number:'1.0-0' }}
                    </span>

                    <div class="flex items-center gap-1.5">
                      <button (click)="viewReceipt(pay)"
                              class="text-caterpillar hover:text-caterpillar-dark p-1.5 rounded-lg hover:bg-industrial-dark transition"
                              title="Ver Recibo Individual">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>

                      <button *ngIf="loanService.currentUser()?.rol !== Role.COBRADOR" 
                              (click)="pay.tipoPago === PaymentTipo.CONDONACION_MORA ? confirmReversarCondonacion(pay.id) : onDeletePayment(pay.id)"
                            class="text-industrial-muted hover:text-semantic-red p-1.5 rounded-lg hover:bg-industrial-dark transition"
                            [title]="pay.tipoPago === PaymentTipo.CONDONACION_MORA ? 'Reversar Condonación' : 'Anular Abono'">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- BOTTOM ACTIONS BAR -->
      <div class="flex items-center justify-between gap-4 pt-2">
        <button (click)="goBack.emit()" 
                class="bg-industrial-surface border border-industrial-border hover:border-caterpillar/40 text-white hover:text-caterpillar text-[10px] font-bold px-6 py-3.5 rounded-xl transition duration-150 uppercase tracking-wider text-center">
          Cerrar y Volver
        </button>

        <button (click)="openExportModal()" 
                class="flex-1 md:flex-initial bg-caterpillar hover:bg-caterpillar-dark text-industrial-black font-black px-6 py-3.5 rounded-xl text-xs uppercase tracking-wider transition shadow-xl flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 10.742l4.63-2.315a1.5 1.5 0 11.536.536l-4.63 2.315a1.5 1.5 0 11-.536-.536zm0 2.516l4.63 2.315a1.5 1.5 0 11-.536.536l-4.63-2.315a1.5 1.5 0 11.536-.536z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 10.742l4.63-2.315a1.5 1.5 0 11.536.536l-4.63 2.315a1.5 1.5 0 11-.536-.536zm0 2.516l4.63 2.315a1.5 1.5 0 11.536.536l-4.63-2.315a1.5 1.5 0 11.536-.536z" />
          </svg>
          Compartir
        </button>
      </div>

      <!-- EXPORT PREVIEW MODAL -->
      <div *ngIf="showExportModal()" class="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
        
        <h3 class="text-white font-black text-sm uppercase tracking-widest mb-4">Vista Previa de Exportación</h3>

        <!-- This is the exact ticket that will be screenshotted -->
        <div id="exportable-statement" class="bg-industrial-dark border border-industrial-border rounded-2xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden mb-6">
          <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-caterpillar via-industrial-black to-caterpillar bg-[length:30px_8px]"></div>
          
          <div class="text-center mb-6">
            <img src="/assets/images/logo-header.webp" class="h-8 mx-auto mb-2" alt="Logo">
            <h3 class="text-caterpillar font-black uppercase tracking-tight text-sm">Estado de Cuenta</h3>
            <p class="text-industrial-muted text-[9px] uppercase font-mono tracking-widest mt-0.5">
              {{ loanService.settings()?.nombreNegocio || 'CAT-LOAN' }}
            </p>
          </div>

          <div class="space-y-4">
            <div class="bg-industrial-surface/50 border border-industrial-border/60 p-3 rounded-xl flex flex-col">
              <span class="text-industrial-muted text-[9px] uppercase font-mono">Cliente</span>
              <span class="text-white font-black text-base">{{ loan.clienteNombre }}</span>
              <span class="text-industrial-muted text-[10px] font-mono">{{ loan.clienteTelefono }}</span>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="bg-industrial-surface border border-industrial-border p-3 rounded-xl">
                <span class="text-industrial-muted font-mono text-[9px] uppercase block">Préstamo</span>
                <span class="text-white font-black text-sm block">
                  {{ loanService.settings()?.monedaSimbolo || '₡' }} {{ loan.totalAPagar | number:'1.0-0' }}
                </span>
              </div>
              <div class="bg-industrial-surface border border-industrial-border p-3 rounded-xl">
                <span class="text-industrial-muted font-mono text-[9px] uppercase block">Abonado</span>
                <span class="text-semantic-emerald font-black text-sm block">
                  {{ loanService.settings()?.monedaSimbolo || '₡' }} {{ getTotalAbonado() | number:'1.0-0' }}
                </span>
              </div>
            </div>

            <div class="bg-caterpillar/10 border border-caterpillar/40 p-4 rounded-xl text-center">
              <span class="text-caterpillar font-mono text-[10px] uppercase font-bold block mb-1">Balance Restante</span>
              <span class="text-caterpillar font-black text-2xl tracking-tight block">
                {{ loanService.settings()?.monedaSimbolo || '₡' }} {{ loan.balancePendiente | number:'1.0-0' }}
              </span>
            </div>
            
            <!-- MOVEMENTS LEDGER (CARDEX) FOR EXPORT -->
            <div *ngIf="loan.payments && loan.payments.length > 0" class="pt-4 border-t border-industrial-border/60 border-dashed mt-2">
              <span class="text-industrial-muted font-mono text-[9px] uppercase font-bold tracking-widest block mb-3 text-center">Últimos Movimientos</span>
              
              <div class="space-y-2">
                <div *ngFor="let pay of loan.payments.slice(0, 5)" class="flex justify-between items-center text-[10px] font-mono border-b border-industrial-surface pb-2">
                  <div class="flex flex-col">
                    <span class="text-white">{{ pay.fechaPago | date:'dd/MM/yyyy' }}</span>
                    <span class="text-industrial-muted text-[8px] uppercase">
                      {{ pay.tipoPago === PaymentTipo.CONDONACION_MORA ? 'Condonación' : pay.tipoPago === PaymentTipo.PAGO_MORA ? 'Pago Mora' : 'Abono Cuota' }}
                      <span *ngIf="pay.metodoPago && pay.tipoPago !== PaymentTipo.CONDONACION_MORA">({{ pay.metodoPago }})</span>
                    </span>
                  </div>
                  <div [class]="pay.tipoPago === PaymentTipo.CONDONACION_MORA ? 'text-amber-400 font-bold' : pay.tipoPago === PaymentTipo.PAGO_MORA ? 'text-rose-400 font-bold' : 'text-semantic-emerald font-bold'">
                    {{ pay.tipoPago === PaymentTipo.CONDONACION_MORA ? '-' : pay.tipoPago === PaymentTipo.PAGO_MORA ? '' : '+' }}{{ loanService.settings()?.monedaSimbolo || '₡' }} {{ pay.montoAbonado | number:'1.0-0' }}
                  </div>
                </div>
              </div>
              
              <div *ngIf="loan.payments.length > 5" class="text-center mt-2 text-[9px] text-industrial-muted italic">
                ... y {{ loan.payments.length - 5 }} movimientos anteriores
              </div>
            </div>
            
            <div class="text-center pt-2">
              <span class="text-[9px] text-industrial-muted font-mono uppercase">Emitido: {{ currentDate | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>
          </div>
        </div>

        <div class="flex gap-3 w-full max-w-sm">
          <button (click)="showExportModal.set(false)" [disabled]="isExporting"
                  class="flex-1 bg-industrial-surface border border-industrial-border hover:border-caterpillar/40 text-white hover:text-caterpillar text-xs font-bold py-3.5 rounded-xl transition duration-150 uppercase tracking-wider">
            Cancelar
          </button>
          <button (click)="exportAndShare('exportable-statement', false)" [disabled]="isExporting"
                  class="flex-[2] bg-caterpillar hover:bg-caterpillar-dark text-industrial-black font-black uppercase text-xs tracking-wider py-3.5 rounded-xl transition shadow-xl flex items-center justify-center gap-2">
            <span *ngIf="isExporting" class="animate-pulse">Generando...</span>
            <ng-container *ngIf="!isExporting">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 10.742l4.63-2.315a1.5 1.5 0 11.536.536l-4.63 2.315a1.5 1.5 0 11-.536-.536zm0 2.516l4.63 2.315a1.5 1.5 0 11-.536.536l-4.63-2.315a1.5 1.5 0 11.536-.536z" />
              </svg>
              Enviar WhatsApp
            </ng-container>
          </button>
        </div>
      </div>

      <!-- RECEIPT OVERLAY MODAL (Individual Payment) -->
      <div *ngIf="viewingReceipt" class="fixed inset-0 z-[150] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
        <div id="receipt-card" class="bg-industrial-dark border border-industrial-border rounded-2xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden">
          <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-caterpillar via-industrial-black to-caterpillar bg-[length:30px_8px]"></div>
          
          <div class="text-center mb-6">
            <img src="/assets/images/logo-header.webp" class="h-10 mx-auto mb-2 opacity-80" alt="Logo">
            <h3 class="text-white font-black uppercase tracking-tight text-lg">Recibo de Abono</h3>
            <p class="text-industrial-muted text-[10px] uppercase font-mono">
              {{ loanService.settings()?.nombreNegocio || 'CAT-LOAN' }}
            </p>
          </div>

          <div class="space-y-3 mb-6">
            <div class="flex justify-between border-b border-industrial-border/30 pb-2">
              <span class="text-industrial-muted text-xs">Recibo:</span>
              <span class="text-white font-mono text-xs">{{ viewingReceipt.numeroRecibo }}</span>
            </div>
            <div class="flex justify-between border-b border-industrial-border/30 pb-2">
              <span class="text-industrial-muted text-xs">Fecha:</span>
              <span class="text-white font-mono text-xs">{{ viewingReceipt.fechaPago | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>
            <div class="flex justify-between border-b border-industrial-border/30 pb-2">
              <span class="text-industrial-muted text-xs">Cliente:</span>
              <span class="text-white font-mono text-xs truncate max-w-[150px]">{{ loan.clienteNombre }}</span>
            </div>
            <div class="flex justify-between pt-2">
              <span class="text-industrial-muted font-bold text-xs uppercase">Monto Recibido:</span>
              <span class="text-caterpillar font-black text-sm">
                {{ loanService.settings()?.monedaSimbolo || '₡' }} {{ viewingReceipt.montoAbonado | number:'1.0-0' }}
              </span>
            </div>
          </div>

          <div class="flex gap-2">
            <button (click)="closeReceipt()" class="flex-1 bg-industrial-surface border border-industrial-border text-white text-xs font-bold py-2.5 rounded-lg uppercase">Cerrar</button>
            <button (click)="exportAndShare('receipt-card', true)" [disabled]="isExporting" class="flex-1 bg-caterpillar text-industrial-black text-xs font-black py-2.5 rounded-lg uppercase">
              {{ isExporting ? 'Generando...' : 'Compartir' }}
            </button>
          </div>
        </div>
      </div>

      <!-- CONFIRMATION MODAL -->
      <div *ngIf="confirmModalConfig()" class="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
        <div class="bg-industrial-dark border border-industrial-border rounded-2xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden">
          <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-caterpillar via-industrial-black to-caterpillar bg-[length:30px_8px]"></div>
          
          <h3 class="text-white font-black uppercase tracking-tight text-lg mt-2 mb-2">
            {{ confirmModalConfig()?.title }}
          </h3>
          <p class="text-industrial-muted text-sm mb-6">
            {{ confirmModalConfig()?.message }}
          </p>
          
          <div class="flex gap-3">
            <button (click)="confirmModalConfig.set(null)" class="flex-1 bg-industrial-surface border border-industrial-border hover:border-caterpillar/40 text-white hover:text-caterpillar text-xs font-bold py-3 rounded-lg transition duration-150 uppercase tracking-wider">
              Cerrar y volver
            </button>
            <button (click)="executeConfirmAction()" [class]="confirmModalConfig()?.danger ? 'bg-semantic-red hover:bg-red-600 text-white' : 'bg-caterpillar hover:bg-caterpillar-dark text-industrial-black'" class="flex-1 font-black uppercase text-xs tracking-wider py-3 rounded-lg transition duration-150">
              Confirmar
            </button>
          </div>
        </div>
      </div>
      </div>
      </main>
    </div>
  `
})
export class LoanStatementComponent {
  viewingReceipt: any = null;
  isExporting = false;

  viewReceipt(pay: any) {
    this.viewingReceipt = pay;
  }

  closeReceipt() {
    this.viewingReceipt = null;
  }

  openExportModal() {
    this.currentDate = new Date();
    this.showExportModal.set(true);
  }

  async exportAndShare(elementId: string, isIndividualReceipt: boolean) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    try {
      this.isExporting = true;
      
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(element, { 
        scale: 2, 
        backgroundColor: '#1E1E1E',
        logging: false
      });
      
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) throw new Error('Failed to create blob');

      const formData = new FormData();
      formData.append('file', blob, 'recibo.jpg');
      formData.append('upload_preset', 'ml_default');

      const uploadRes = await fetch('https://api.cloudinary.com/v1_1/dv74qevjc/image/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!uploadRes.ok) throw new Error('Cloudinary upload failed');
      const data = await uploadRes.json();
      const imageUrl = data.secure_url;
      
      const cleanPhone = this.getCleanPhone(this.loan.clienteTelefono);
      const isReceipt = isIndividualReceipt;
      const msg = isReceipt
        ? `*RECIBO DE ABONO OFICIAL*\nCliente: ${this.loan?.clienteNombre}\nMonto: ${this.loanService.settings()?.monedaSimbolo || '₡'} ${this.viewingReceipt.montoAbonado}\nVer recibo aquí: ${imageUrl}`
        : `Hola ${this.loan.clienteNombre}, adjunto envío tu estado de cuenta actualizado: ${imageUrl}`;

      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
      window.open(whatsappUrl, '_blank');
      this.toastService.success(isReceipt ? 'Recibo enviado a WhatsApp.' : 'Estado de cuenta enviado.');
    } catch (error) {
      console.error('Error sharing:', error);
      this.toastService.error('Error al generar la imagen para compartir');
    } finally {
      this.isExporting = false;
    }
  }

  Role = Role;
  PaymentMethod = PaymentMethod;
  PaymentTipo = PaymentTipo;
  loanService = inject(LoanService);
  clientService = inject(ClientService);
  toastService = inject(ToastService);

  @Input({ required: true }) loan!: Loan;
  @Input() lastPayment: Payment | null = null;
  @Output() goBack = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  showExportModal = signal(false);
  showAsReceipt = signal(false);
  currentDate = new Date();
  isUploadingDoc = false;
  confirmModalConfig = signal<{ title: string; message: string; action: () => void; danger?: boolean } | null>(null);

  Number = Number;

  getCleanPhone(phone: string | undefined | null): string {
    let clean = (phone || '').replace(/\D/g, '');
    if (clean.length === 8) {
      clean = '506' + clean;
    }
    return clean;
  }

  getTotalAbonado(): number {
    const totalAPagar = Number(this.loan.totalAPagar || 0);
    const multas = Number(this.loan.multasAcumuladas || 0);
    const balance = Number(this.loan.balancePendiente || 0);
    return Math.max(0, totalAPagar + multas - balance);
  }

  getProgressPercentage(): number {
    if (!this.loan.cuotasTotales || this.loan.cuotasTotales <= 0) return 0;
    return Math.min(100, Math.round((this.loan.cuotaActual / this.loan.cuotasTotales) * 100));
  }

  confirmReversarCondonacion(paymentId?: string) {
    this.confirmModalConfig.set({
      title: 'Reversar Condonación de Mora',
      message: `¿Está seguro de que desea anular la condonación otorgada a ${this.loan.clienteNombre}? La mora acumulada se recalculará automáticamente.`,
      danger: true,
      action: async () => {
        try {
          const res = await this.loanService.reversarCondonacion(this.loan.id, paymentId);
          this.toastService.success(res.message || 'Condonación reversada correctamente');
          const updated = this.loanService.loans().find(l => l.id === this.loan.id);
          if (updated) {
            this.loan = updated;
          }
        } catch (err: any) {
          this.toastService.error(err.error?.error || 'Error al reversar la condonación');
        }
      }
    });
  }

  async onDeletePayment(paymentId: string) {
    this.confirmModalConfig.set({
      title: 'Eliminar Abono',
      message: '¿Está seguro de que desea eliminar este abono? El saldo se recalculará automáticamente.',
      danger: true,
      action: async () => {
        try {
          await this.loanService.deletePayment(this.loan.id, paymentId);
          this.toastService.success('Abono eliminado correctamente');

          const updated = this.loanService.loans().find(l => l.id === this.loan.id);
          if (updated) {
            this.loan = updated;
            this.lastPayment = null;
          }
        } catch (err: any) {
          this.toastService.error(err.error?.error || 'No se pudo eliminar el abono');
        }
      }
    });
  }

  executeConfirmAction() {
    const action = this.confirmModalConfig()?.action;
    if (action) {
      action();
      this.confirmModalConfig.set(null);
    }
  }


}

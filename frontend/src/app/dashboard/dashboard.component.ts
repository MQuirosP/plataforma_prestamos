import { Component, OnInit, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoanService, Loan, Payment, Role, PaymentMethod, FineFrequency, LoanStatus, LoanModalidad, LoanFrecuencia, PaymentTipo } from '../services/loan.service';
import html2canvas from 'html2canvas';
import { ToastService } from '../services/toast.service';

import { AdminService } from '../services/admin.service';
import { NumericStepperComponent } from '../shared/numeric-stepper/numeric-stepper.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NumericStepperComponent],
  template: `
    <div class="min-h-screen bg-industrial-black text-industrial-light pb-24 font-sans select-none">

      
      <!-- Top Caterpillar Branded Bar -->
      <header class="border-b border-industrial-border px-5 py-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md bg-opacity-95" style="background-color: #111111;">
        <div class="flex items-center gap-2.5">
          <img src="/assets/images/logo-header.webp" width="220" height="44" class="h-11 w-auto object-contain" alt="Cat-Loan Logo">



          <div>
            <h1 class="text-sm font-black text-white leading-none tracking-tight uppercase">
              {{ loanService.settings()?.nombreNegocio || 'CAT-LOAN' }}
            </h1>
            <p class="text-[9px] text-caterpillar uppercase tracking-wider font-mono mt-0.5">CONSOLE</p>
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          <ng-container *ngIf="loanService.currentUser()?.rol !== Role.COBRADOR">
            <!-- Add Loan button — principal action, hidden on mobile (uses FAB instead) -->
            <button (click)="openCreateModal()" 
                    class="hidden md:flex bg-caterpillar hover:bg-caterpillar-dark text-industrial-black px-3 py-2 rounded-lg font-bold transition duration-150 shadow-md items-center gap-1.5 text-xs"
                    title="Agregar Préstamo">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span class="font-black uppercase tracking-tight">Nuevo</span>
            </button>

            <!-- Manage Cobradores button -->
            <button (click)="openCobradoresModal()" 
                    class="bg-industrial-surface border border-industrial-border p-2 rounded-lg text-industrial-muted hover:text-emerald-500 transition duration-150"
                    title="Gestionar Equipo">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
          </ng-container>

          <!-- Settings button -->
          <button (click)="openSettings.emit()" 
                  class="bg-industrial-surface border border-industrial-border p-2 rounded-lg text-industrial-muted hover:text-caterpillar transition duration-150"
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

      <!-- Main Layout container -->
      <main class="max-w-md mx-auto px-4 mt-6">
        
        <!-- KPI Cards Grid -->
        <section class="grid grid-cols-3 gap-3 mb-6">
          <div class="bg-industrial-dark border border-industrial-border p-3 rounded-xl flex flex-col justify-between">
            <span class="text-[10px] text-industrial-muted uppercase font-mono">En la Calle</span>
            <span class="text-sm font-black text-white mt-1">
              {{ loanService.settings()?.monedaSimbolo || '₡' }} {{ capitalEnCalle() | number:'1.0-0' }}
            </span>
          </div>
          <div class="bg-industrial-dark border border-industrial-border p-3 rounded-xl flex flex-col justify-between">
            <span class="text-[10px] text-industrial-muted uppercase font-mono">Esta Semana</span>
            <span class="text-sm font-black text-caterpillar mt-1">
              {{ loanService.settings()?.monedaSimbolo || '₡' }} {{ porCobrarEstaSemana() | number:'1.0-0' }}
            </span>
          </div>
          <div class="bg-industrial-dark border border-industrial-border p-3 rounded-xl flex flex-col justify-between">
            <span class="text-[10px] text-industrial-muted uppercase font-mono">Rendimiento</span>
            <span class="text-sm font-black text-semantic-emerald mt-1">
              {{ loanService.settings()?.monedaSimbolo || '₡' }} {{ rendimientoEstimado() | number:'1.0-0' }}
            </span>
          </div>
        </section>

        <!-- Dynamic Cobranza Wall Selector Tabs (Sleek horizontal chips) -->
        <div (wheel)="onWheelScroll($event)" class="flex items-center gap-2 overflow-x-auto pb-3 pt-1 scrollbar-none whitespace-nowrap">
          <button 
            (click)="activeTab.set('atrasados')"
            [class]="'shrink-0 px-4 py-2 rounded-full text-[11px] font-bold uppercase transition border ' + 
              (activeTab() === 'atrasados' ? 'bg-semantic-red/20 text-semantic-red border-semantic-red/80' : 'bg-industrial-surface/40 text-industrial-muted border-industrial-border/60 hover:text-caterpillar hover:border-caterpillar/30')"
          >
            Atrasados <span class="ml-1 px-1.5 py-0.2 rounded-full bg-industrial-dark text-[9px] font-mono">{{ atrasadosCount() }}</span>
          </button>
          <button 
            (click)="activeTab.set('hoy')"
            [class]="'shrink-0 px-4 py-2 rounded-full text-[11px] font-bold uppercase transition border ' + 
              (activeTab() === 'hoy' ? 'bg-caterpillar/20 text-caterpillar border-caterpillar/80' : 'bg-industrial-surface/40 text-industrial-muted border-industrial-border/60 hover:text-caterpillar hover:border-caterpillar/30')"
          >
            Vencen Hoy <span class="ml-1 px-1.5 py-0.2 rounded-full bg-industrial-dark text-[9px] font-mono">{{ hoyCount() }}</span>
          </button>
          <button 
            (click)="activeTab.set('dia')"
            [class]="'shrink-0 px-4 py-2 rounded-full text-[11px] font-bold uppercase transition border ' + 
              (activeTab() === 'dia' ? 'bg-white text-industrial-black border-white' : 'bg-industrial-surface/40 text-industrial-muted border-industrial-border/60 hover:text-caterpillar hover:border-caterpillar/30')"
          >
            Al Día <span class="ml-1 px-1.5 py-0.2 rounded-full bg-industrial-dark text-white text-[9px] font-mono">{{ alDiaCount() }}</span>
          </button>
        </div>

        <!-- Row 2: Days of the week filter (Sleek horizontal chips, shown only on 'atrasados' or 'dia' tabs) -->
        <div *ngIf="activeTab() !== 'hoy'" (wheel)="onWheelScroll($event)" class="flex items-center gap-2 overflow-x-auto pb-3 pt-1 mb-2 scrollbar-none border-t border-industrial-border/30 pt-3 whitespace-nowrap">
          <button 
            (click)="activeDayFilter.set('TODO')"
            [class]="'shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition border ' + 
              (activeDayFilter() === 'TODO' ? 'bg-white text-industrial-black border-white' : 'bg-industrial-surface/30 text-industrial-muted border-industrial-border/40 hover:text-caterpillar hover:border-caterpillar/30')"
          >
            Todos los Días <span class="ml-1 px-1.5 py-0.2 rounded-full bg-industrial-dark text-white text-[8px] font-mono">{{ getLoansCountForDay('TODO') }}</span>
          </button>
          <button 
            *ngFor="let day of [
              { key: '1', label: 'Lunes' },
              { key: '2', label: 'Martes' },
              { key: '3', label: 'Miércoles' },
              { key: '4', label: 'Jueves' },
              { key: '5', label: 'Viernes' },
              { key: '6', label: 'Sábado' },
              { key: '7', label: 'Domingo' }
            ]"
            (click)="activeDayFilter.set(day.key)"
            [class]="'shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition border ' + 
              (activeDayFilter() === day.key ? 'bg-caterpillar/20 text-caterpillar border-caterpillar/80' : 'bg-industrial-surface/30 text-industrial-muted border-industrial-border/40 hover:text-caterpillar hover:border-caterpillar/30')"
          >
            {{ day.label }} <span class="ml-1 px-1.5 py-0.2 rounded-full bg-industrial-dark text-[8px] font-mono">{{ getLoansCountForDay(day.key) }}</span>
          </button>
        </div>

        <!-- Cobranza Wall List -->
        <section class="space-y-3">
          <div *ngIf="filteredLoans().length === 0" class="text-center py-10 bg-industrial-dark/50 border border-dashed border-industrial-border rounded-xl">
            <p class="text-xs text-industrial-muted">Sin clientes registrados en esta categoría</p>
          </div>

          <div *ngFor="let loan of filteredLoans()" 
               class="bg-industrial-dark border border-industrial-border rounded-xl p-4 transition-all duration-200 hover:border-caterpillar/30">
            <div class="flex justify-between items-start mb-2">
              <div>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <h3 class="font-extrabold text-white text-base leading-tight">{{ loan.clienteNombre }}</h3>
                  <span *ngIf="loan.modalidad === 'ALQUILER'" class="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase font-mono tracking-wider bg-caterpillar/20 text-caterpillar border border-caterpillar/30">Alquiler</span>
                  <span *ngIf="loan.modalidad !== 'ALQUILER'" class="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase font-mono tracking-wider bg-industrial-surface border border-industrial-border text-industrial-muted">Tradicional</span>
                </div>
                <span class="text-xs text-industrial-muted font-mono">{{ loan.clienteTelefono }}</span>
              </div>
              <div class="text-right">
                <span class="text-xs text-industrial-muted font-mono block">{{ loan.modalidad === 'ALQUILER' ? 'Saldo Capital' : 'Pendiente' }}</span>
                <span class="text-sm font-black text-white block">
                  {{ loanService.settings()?.monedaSimbolo || '₡' }} {{ loan.balancePendiente | number:'1.0-0' }}
                </span>
              </div>
            </div>

            <!-- Client Info Meta Grid -->
            <div class="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-industrial-border/60 text-[11px] leading-tight">
              <div>
                <span class="text-industrial-muted block">Progreso:</span>
                <span class="text-white font-bold block">
                  {{ loan.modalidad === 'ALQUILER' ? 'Renta pagadas: ' + loan.cuotaActual : 'Cuota ' + loan.cuotaActual + '/' + loan.cuotasTotales }}
                </span>
              </div>
              <div class="text-center">
                <span class="text-industrial-muted block">Siguiente Abono:</span>
                <span class="text-white font-bold block truncate" [title]="getNextPaymentDate(loan)">
                  {{ getNextPaymentDate(loan) }}
                </span>
              </div>
              <div class="text-right">
                <span class="text-industrial-muted block">
                  Cuota {{ loan.frecuenciaPago === 'SEMANAL' ? 'Semanal' : loan.frecuenciaPago === 'QUINCENAL' ? 'Quincenal' : 'Mensual' }}:
                </span>
                <span class="text-caterpillar font-bold block">
                  {{ loanService.settings()?.monedaSimbolo || '₡' }} {{ loan.cuotaSemanal | number:'1.0-0' }}
                </span>
              </div>
            </div>

            <!-- Action buttons: WhatsApp message, Edit, Delete, Statement Details -->
            <div class="flex items-center gap-2 mt-4">
              <button (click)="openStatement(loan)" 
                      class="flex-1 bg-industrial-surface hover:bg-industrial-border border border-industrial-border text-[11px] text-white py-2 rounded-lg font-bold transition duration-150">
                Estado Cuenta
              </button>
              
              <button (click)="openAbonoModal(loan)" 
                      class="flex-1 bg-caterpillar hover:bg-caterpillar-dark text-industrial-black text-[11px] py-2 rounded-lg font-bold transition duration-150">
                Registrar Abono
              </button>

              <!-- Edit button (Admin Impersonating Only) -->
              <button *ngIf="loanService.currentUser()?.isImpersonating"
                      (click)="openEditLoan.emit(loan)" 
                      title="Editar Préstamo (Admin)"
                      class="w-9 h-9 bg-industrial-surface hover:bg-industrial-border border border-industrial-border text-caterpillar flex items-center justify-center rounded-lg transition duration-150">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>


              <!-- Delete button (Lender-Only) -->
              <button *ngIf="loanService.currentUser()?.rol !== Role.COBRADOR"
                      (click)="performDeleteLoan(loan)" 
                      title="Eliminar Préstamo"
                      class="w-9 h-9 bg-red-950/20 hover:bg-red-900/40 border border-semantic-red/30 text-semantic-red flex items-center justify-center rounded-lg transition duration-150">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.892-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              
              <a [href]="getWhatsappLink(loan)" target="_blank"
                 title="Enviar WhatsApp"
                 class="w-9 h-9 bg-emerald-600/20 hover:bg-emerald-600/40 text-semantic-emerald flex items-center justify-center rounded-lg border border-semantic-emerald/30 transition duration-150">
                <svg class="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.498 1.45 5.429 1.451 5.517 0 10.005-4.486 10.008-10.007.002-2.673-1.037-5.188-2.928-7.081-1.892-1.892-4.408-2.934-7.083-2.935-5.52 0-10.007 4.488-10.01 10.01-.001 1.916.498 3.793 1.448 5.378L1.745 22.25l6.559-1.722L6.647 19.15z"/>
                </svg>
              </a>
            </div>
          </div>
        </section>
      </main>

      <!-- FAB: Floating Action Button (mobile only, hidden for COBRADOR) -->
      <button *ngIf="loanService.currentUser()?.rol !== Role.COBRADOR"
              (click)="openCreateModal()"
              [class]="'fixed right-5 z-40 md:hidden bg-caterpillar hover:bg-caterpillar-dark text-industrial-black w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 active:scale-95 ' + 
                (loanService.currentUser()?.isImpersonating ? 'bottom-32' : 'bottom-6')"
              title="Agregar Préstamo"
              style="box-shadow: 0 4px 24px 0 rgba(255, 193, 7, 0.45);">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <!-- MODAL 2: Add Payment / Abono -->
      <div *ngIf="showAbonoModal()" class="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center backdrop-blur-sm">
        <div class="bg-industrial-dark w-full max-w-md rounded-t-2xl sm:rounded-2xl border-t sm:border border-industrial-border p-6 pb-8">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-black text-white uppercase tracking-tight">Registrar Abono</h2>
            <button (click)="showAbonoModal.set(false)" class="text-industrial-muted hover:text-caterpillar">
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
                <span class="text-caterpillar font-black text-base">
                  {{ loanService.settings()?.monedaSimbolo || '₡' }} {{ selectedLoanForAbono.balancePendiente | number:'1.0-0' }}
                </span>
              </div>
            </div>

            <form (submit)="onSubmitAbono($event)" class="space-y-4">
              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Monto a Abonar</label>
                <app-numeric-stepper [(ngModel)]="abonoMonto" name="abonoMonto" [required]="true" [min]="0" [step]="1000"></app-numeric-stepper>
              </div>

              <!-- Tipo de Abono (Solo para ALQUILER) -->
              <div *ngIf="selectedLoanForAbono?.modalidad === 'ALQUILER'">
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Concepto de Abono</label>
                <div class="grid grid-cols-2 gap-2">
                  <button type="button" (click)="abonoTipoPago = 'CUOTA_RENTA'" 
                          [class]="'py-2 text-xs font-bold rounded-lg border transition-all ' + (abonoTipoPago === 'CUOTA_RENTA' ? 'bg-caterpillar text-industrial-black border-caterpillar' : 'bg-industrial-surface text-industrial-muted border-industrial-border hover:border-caterpillar/50')">🔄 Pago de Renta</button>
                  <button type="button" (click)="abonoTipoPago = 'ABONO_CAPITAL'" 
                          [class]="'py-2 text-xs font-bold rounded-lg border transition-all ' + (abonoTipoPago === 'ABONO_CAPITAL' ? 'bg-caterpillar text-industrial-black border-caterpillar' : 'bg-industrial-surface text-industrial-muted border-industrial-border hover:border-caterpillar/50')">💰 Retorno Capital</button>
                </div>
              </div>
              <!-- Método de Pago -->
              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Método de Pago</label>
                <div class="grid grid-cols-3 gap-2">
                  <button type="button" (click)="abonoMetodoPago = PaymentMethod.EFECTIVO" 
                          [class]="'py-2 text-xs font-bold rounded-lg border transition-all ' + (abonoMetodoPago === PaymentMethod.EFECTIVO ? 'bg-caterpillar text-industrial-black border-caterpillar' : 'bg-industrial-surface text-industrial-muted border-industrial-border hover:border-caterpillar/50')">💵 Efectivo</button>
                  <button type="button" (click)="abonoMetodoPago = PaymentMethod.SINPE" 
                          [class]="'py-2 text-xs font-bold rounded-lg border transition-all ' + (abonoMetodoPago === PaymentMethod.SINPE ? 'bg-caterpillar text-industrial-black border-caterpillar' : 'bg-industrial-surface text-industrial-muted border-industrial-border hover:border-caterpillar/50')">📲 SINPE</button>
                  <button type="button" (click)="abonoMetodoPago = PaymentMethod.TRANSFERENCIA" 
                          [class]="'py-2 text-xs font-bold rounded-lg border transition-all ' + (abonoMetodoPago === PaymentMethod.TRANSFERENCIA ? 'bg-caterpillar text-industrial-black border-caterpillar' : 'bg-industrial-surface text-industrial-muted border-industrial-border hover:border-caterpillar/50')">🏦 Transfer.</button>
                </div>
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

      <!-- MODAL 3: Account Statement / Receipt Visual Pro -->
      <div *ngIf="showStatementModal()" class="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
        <div class="w-full max-w-sm flex flex-col items-center">
          
          <!-- Toggle Selectors (Outside of the screenshot wrapper to keep it clean) -->
          <div *ngIf="lastPayment()" class="flex bg-industrial-surface p-1 rounded-xl border border-industrial-border mb-4 w-full">
            <button (click)="showAsReceipt.set(true)" 
                    [class.bg-industrial-dark]="showAsReceipt()" 
                    [class.text-caterpillar]="showAsReceipt()" 
                    class="flex-1 text-[10px] font-black uppercase py-2.5 rounded-lg transition text-industrial-muted">
              Recibo de Abono
            </button>
            <button (click)="showAsReceipt.set(false)" 
                    [class.bg-industrial-dark]="!showAsReceipt()" 
                    [class.text-caterpillar]="!showAsReceipt()" 
                    class="flex-1 text-[10px] font-black uppercase py-2.5 rounded-lg transition text-industrial-muted">
              Estado de Cuenta
            </button>
          </div>

          <!-- Shared Account Statement / Receipt Card Wrapper -->
          <div *ngIf="selectedStatementLoan; let loan" id="statement-card" class="w-full bg-industrial-dark border border-industrial-border rounded-2xl p-6 shadow-2xl relative overflow-hidden text-industrial-light">
            <!-- Caterpillar Caution Stripe Accent -->
            <div class="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-caterpillar via-industrial-black to-caterpillar bg-[length:30px_8px]"></div>

            <!-- VIEW 1: RECIBO DE ABONO -->
            <div *ngIf="showAsReceipt() && lastPayment()" class="space-y-4">
              <div class="text-center border-b border-industrial-border/60 pb-4 mt-2 mb-4 flex flex-col items-center">
                <img src="/assets/images/logo-header.webp" width="160" height="32" class="h-8 w-auto object-contain mb-2" alt="Logo Cat-Loan">
                <h2 class="text-xs text-caterpillar uppercase tracking-widest font-mono">Recibo de Abono Oficial</h2>
                <p class="text-[9px] text-industrial-muted uppercase tracking-wider font-mono">
                  {{ loanService.settings()?.nombreNegocio || 'CAT-LOAN Credit' }}
                </p>
              </div>


              <!-- Receipt Number and Date -->
              <div class="flex justify-between text-[9px] text-industrial-muted font-mono mb-4">
                <span>Nº Recibo: {{ lastPayment()?.numeroRecibo }}</span>
                <span>{{ lastPayment()?.fechaPago | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>

              <!-- Details Grid -->
              <div class="space-y-2 text-xs border-b border-industrial-border/60 pb-4 mb-4">
                <div class="flex justify-between">
                  <span class="text-industrial-muted">Cliente:</span>
                  <span class="text-white font-extrabold">{{ loan.clienteNombre }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-industrial-muted">Método de Pago:</span>
                  <span class="text-white font-bold">{{ lastPayment()?.metodoPago }}</span>
                </div>
                <div *ngIf="lastPayment()?.notas" class="flex justify-between">
                  <span class="text-industrial-muted">Notas:</span>
                  <span class="text-white italic text-[11px]">{{ lastPayment()?.notas }}</span>
                </div>
              </div>

              <!-- Payment highlight -->
              <div class="bg-industrial-surface border border-industrial-border p-4 rounded-xl text-center mb-4">
                <span class="text-[10px] text-industrial-muted uppercase font-mono block mb-1">Monto Abonado</span>
                <span class="text-2xl text-caterpillar font-black">
                  {{ loanService.settings()?.monedaSimbolo || '₡' }} {{ lastPayment()?.montoAbonado | number:'1.0-0' }}
                </span>
              </div>

              <!-- Remaining Balance -->
              <div class="flex justify-between items-center text-xs font-mono uppercase tracking-wider mb-2">
                <span class="text-industrial-muted">Balance Restante:</span>
                <span class="text-white font-extrabold text-sm">
                  {{ loanService.settings()?.monedaSimbolo || '₡' }} {{ loan.balancePendiente | number:'1.0-0' }}
                </span>
              </div>

              <div class="text-center pt-2 text-[10px] text-industrial-muted italic">
                ¡Gracias por su abono!
              </div>
            </div>

            <!-- VIEW 2: ESTADO DE CUENTA COMPLETO -->
            <div *ngIf="!showAsReceipt() || !lastPayment()" class="space-y-4">
              <div class="text-center border-b border-industrial-border/60 pb-4 mt-2 mb-4 flex flex-col items-center">
                <img src="/assets/images/logo-header.webp" width="160" height="32" class="h-8 w-auto object-contain mb-2" alt="Logo Cat-Loan">
                <h2 class="text-xs text-caterpillar uppercase tracking-widest font-mono">Estado de Cuenta Oficial</h2>
                <p class="text-[9px] text-industrial-muted uppercase tracking-wider font-mono">
                  {{ loanService.settings()?.nombreNegocio || 'CAT-LOAN Credit' }}
                </p>
              </div>


              <!-- Client Metadata -->
              <div class="space-y-1 text-sm mb-4">
                <div class="flex justify-between">
                  <span class="text-industrial-muted">Cliente:</span>
                  <span class="text-white font-extrabold">{{ loan.clienteNombre }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-industrial-muted">Teléfono:</span>
                  <span class="text-white font-mono">{{ loan.clienteTelefono }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-industrial-muted">F. Inicio:</span>
                  <span class="text-white font-mono">{{ loan.fechaInicio | date:'dd/MM/yyyy' }}</span>
                </div>
              </div>

              <!-- Financial Status Box -->
              <div class="bg-industrial-surface border border-industrial-border p-4 rounded-xl space-y-2 mb-4">
                <div class="flex justify-between text-xs">
                  <span class="text-industrial-muted">Monto Original:</span>
                  <span class="text-white font-bold">
                    {{ loanService.settings()?.monedaSimbolo || '₡' }} {{ loan.totalAPagar | number:'1.0-0' }}
                  </span>
                </div>
                <div *ngIf="loan.multasAcumuladas" class="flex justify-between text-xs">
                  <span class="text-semantic-red font-bold">Multas por Mora:</span>
                  <span class="text-semantic-red font-bold">
                    +{{ loanService.settings()?.monedaSimbolo || '₡' }} {{ loan.multasAcumuladas | number:'1.0-0' }}
                  </span>
                </div>
                <div class="flex justify-between text-xs">
                  <span class="text-industrial-muted">Total Abonado:</span>
                  <span class="text-semantic-emerald font-bold">
                    -{{ loanService.settings()?.monedaSimbolo || '₡' }} {{ (loan.totalAPagar || 0) + (loan.multasAcumuladas || 0) - (loan.balancePendiente || 0) | number:'1.0-0' }}
                  </span>
                </div>
                <div class="flex justify-between text-sm pt-2 border-t border-industrial-border/60 font-black">
                  <span class="text-white">BALANCE RESTANTE:</span>
                  <span class="text-caterpillar">
                    {{ loanService.settings()?.monedaSimbolo || '₡' }} {{ loan.balancePendiente | number:'1.0-0' }}
                  </span>
                </div>
              </div>

              <!-- Payment Progress -->
              <div class="space-y-1.5 text-xs mb-4">
                <div class="flex justify-between">
                  <span class="text-industrial-muted">Progreso Cuotas:</span>
                  <span class="text-white font-bold">Cuota {{ loan.cuotaActual }} de {{ loan.cuotasTotales }}</span>
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
                  <div *ngIf="loan.payments.length === 0" class="text-[10px] text-industrial-muted text-center py-4">
                    No se han registrado abonos aún
                  </div>
                  <div *ngFor="let pay of loan.payments" class="text-xs flex justify-between bg-industrial-dark p-2 border border-industrial-border rounded-lg">
                    <div>
                      <span class="text-[9px] text-industrial-muted font-mono block">{{ pay.numeroRecibo }}</span>
                      <span class="text-[9px] text-white block">{{ pay.fechaPago | date:'dd/MM HH:mm' }}</span>
                      <span *ngIf="pay.metodoPago" 
                            [class]="'text-[8px] font-bold uppercase rounded px-1 mt-0.5 inline-block ' + (pay.metodoPago === 'EFECTIVO' ? 'bg-amber-900/50 text-amber-400' : pay.metodoPago === 'SINPE' ? 'bg-blue-900/50 text-blue-400' : 'bg-purple-900/50 text-purple-400')">
                        {{ pay.metodoPago }}
                      </span>
                    </div>
                    <div class="flex flex-col items-end justify-between">
                      <div class="flex items-center gap-1.5">
                        <span class="text-white font-black">
                          {{ loanService.settings()?.monedaSimbolo || '₡' }} {{ pay.montoAbonado | number:'1.0-0' }}
                        </span>
                        <!-- Trash Icon for Deletion (Visible only if current user is not COBRADOR) -->
                        <button *ngIf="loanService.currentUser()?.rol !== Role.COBRADOR" 
                                (click)="onDeletePayment(pay.id)"
                                class="text-semantic-red hover:text-red-400 p-0.5"
                                title="Anular Abono">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      <span class="text-[8px] text-industrial-muted block" *ngIf="pay.notas">{{ pay.notas }}</span>
                    </div>
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
              Compartir Comprobante
            </button>
            <button (click)="showStatementModal.set(false)" 
                    class="bg-industrial-surface border border-industrial-border hover:bg-industrial-border text-white text-xs font-bold px-4 py-3 rounded-lg transition duration-150">
              Cerrar
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL 4: Gestionar Cobradores -->
      <div *ngIf="showCobradoresModal()" class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
        <div class="bg-industrial-dark w-full max-w-md rounded-2xl border border-industrial-border p-6 shadow-2xl relative overflow-hidden">
          <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-caterpillar via-industrial-black to-caterpillar bg-[length:30px_8px]"></div>
          
          <div class="flex justify-between items-center mb-4 mt-2">
            <h2 class="text-lg font-black text-white uppercase tracking-tight">Gestión de Equipo</h2>
            <button (click)="showCobradoresModal.set(false)" class="text-industrial-muted hover:text-caterpillar">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Existing Team -->
          <div class="mb-6 max-h-40 overflow-y-auto space-y-2">
            <h3 class="text-xs text-industrial-muted uppercase font-mono mb-2 border-b border-industrial-border/50 pb-1">Cobradores Actuales</h3>
            <div *ngIf="cobradores().length === 0" class="text-[10px] text-industrial-muted text-center py-2">
              Aún no tienes cobradores en tu equipo.
            </div>
            <div *ngFor="let cobrador of cobradores()" class="flex justify-between items-center bg-industrial-surface p-2.5 rounded-lg border border-industrial-border">
              <div>
                <span class="text-white font-bold text-sm block">{{ cobrador.nombre }}</span>
                <span class="text-caterpillar text-[10px] font-mono block">&#64;{{ cobrador.username }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-[9px] text-industrial-muted font-mono">{{ cobrador.telefono }}</span>
                
                <!-- Impersonate button (Only shown if we are an admin currently impersonating a lender) -->
                <button *ngIf="isImpersonatingLender"
                        (click)="impersonateCobrador(cobrador)"
                        title="Impersonar Cobrador"
                        class="bg-caterpillar hover:bg-caterpillar-dark text-industrial-black text-[10px] font-black uppercase px-2.5 py-1.5 rounded transition">
                  🕵️ Impersonar
                </button>
              </div>
            </div>
          </div>

          <!-- Add New Member Form -->
          <form (submit)="onCreateCobrador($event)" class="space-y-3 bg-industrial-surface/30 p-3 rounded-xl border border-industrial-border border-dashed">
            <h3 class="text-xs text-caterpillar uppercase font-mono mb-2">Crear Nuevo Cobrador</h3>
            
            <input type="text" [(ngModel)]="newCobradorData.nombre" name="nombre" placeholder="Nombre completo" required 
                   class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-2.5 text-white text-xs focus:border-caterpillar outline-none">
            
            <input type="text" [(ngModel)]="newCobradorData.username" (input)="newCobradorData.username = newCobradorData.username.toLowerCase()" name="username" placeholder="Nombre de usuario (login)" required 
                   class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-2.5 text-white text-xs focus:border-caterpillar outline-none">
            
            <input type="text" [(ngModel)]="newCobradorData.password" name="password" placeholder="Contraseña de acceso" required 
                   class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-2.5 text-white text-xs focus:border-caterpillar outline-none">
            
            <input type="text" [(ngModel)]="newCobradorData.telefono" name="telefono" placeholder="Teléfono (+506...)" required 
                   class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-2.5 text-white text-xs focus:border-caterpillar outline-none">
            
            <button type="submit" [disabled]="loadingCobrador()"
                    class="w-full bg-caterpillar hover:bg-caterpillar-dark text-industrial-black py-2.5 rounded-lg font-black uppercase tracking-wider text-xs transition mt-2">
              {{ loadingCobrador() ? 'Guardando...' : '+ Agregar Cobrador' }}
            </button>
          </form>
        </div>
      </div>

      <!-- Confirmation Modal -->
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
            <button (click)="closeConfirmModal()" class="flex-1 bg-industrial-surface border border-industrial-border hover:bg-industrial-border text-white text-xs font-bold py-3 rounded-lg transition duration-150">
              Cancelar
            </button>
            <button (click)="executeConfirmAction()" [ngClass]="confirmModalConfig()?.danger ? 'bg-semantic-red hover:bg-red-600 text-white' : 'bg-caterpillar hover:bg-caterpillar-dark text-industrial-black'" class="flex-1 font-black uppercase text-xs tracking-wider py-3 rounded-lg transition duration-150">
              Confirmar
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
  Role = Role;
  PaymentMethod = PaymentMethod;
  FineFrequency = FineFrequency;
  LoanStatus = LoanStatus;
  LoanModalidad = LoanModalidad;
  LoanFrecuencia = LoanFrecuencia;
  PaymentTipo = PaymentTipo;
  loanService = inject(LoanService);
  toastService = inject(ToastService);
  adminService = inject(AdminService);

  @Output() openSettings = new EventEmitter<void>();
  @Output() openCreateLoan = new EventEmitter<void>();
  @Output() openEditLoan = new EventEmitter<Loan>();


  // States
  activeTab = signal<'atrasados' | 'hoy' | 'dia'>('hoy');
  activeDayFilter = signal<string>('TODO');
  showEditModal = signal<boolean>(false);
  showAbonoModal = signal<boolean>(false);
  showStatementModal = signal<boolean>(false);
  showCobradoresModal = signal<boolean>(false);
  confirmModalConfig = signal<{ title: string; message: string; danger?: boolean; action: () => void } | null>(null);

  get isImpersonatingLender(): boolean {
    return !!localStorage.getItem('admin_backup_token');
  }

  // Receipt and Account Statement toggles
  showAsReceipt = signal<boolean>(false);
  lastPayment = signal<Payment | null>(null);

  cobradores = signal<any[]>([]);
  loadingCobrador = signal<boolean>(false);
  newCobradorData = { nombre: '', username: '', password: '', telefono: '+506 ' };

  // Selected entities
  selectedLoanForAbono: Loan | null = null;
  selectedStatementLoan: Loan | null = null;
  editLoanData = {
    id: '',
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
    hasPayments: false
  };
  abonoMonto: number | null = null;
  abonoNotas: string = '';
  abonoMetodoPago: PaymentMethod = PaymentMethod.EFECTIVO;
  abonoTipoPago: 'CUOTA_RENTA' | 'ABONO_CAPITAL' = 'CUOTA_RENTA';

  // Get current weekday mapped to 1-7 based on tenant's timezone
  get currentWeekday(): number {
    const tz = this.loanService.settings()?.timezone || 'America/Costa_Rica';
    try {
      const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' });
      const dayName = formatter.format(new Date());
      const mapping: Record<string, number> = { 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 7 };
      return mapping[dayName] || 1;
    } catch {
      const day = new Date().getDay();
      return day === 0 ? 7 : day;
    }
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
      if (l.estado === LoanStatus.PAID) return;

      const isAlquiler = l.modalidad === LoanModalidad.ALQUILER;
      const freq = l.frecuenciaPago || LoanFrecuencia.SEMANAL;
      const daysPerPeriod = freq === LoanFrecuencia.SEMANAL ? 7 : freq === LoanFrecuencia.QUINCENAL ? 15 : 30;
      
      const periodsActive = Math.max(0, Math.floor((Date.now() - new Date(l.fechaInicio).getTime()) / (daysPerPeriod * 24 * 60 * 60 * 1000)));
      let isAtrasado = false;

      if (isAlquiler) {
        const rentPaymentsTotal = l.payments.filter(p => p.tipoPago === PaymentTipo.CUOTA_RENTA).reduce((sum, p) => sum + Number(p.montoAbonado), 0);
        isAtrasado = rentPaymentsTotal < (Number(l.cuotaSemanal) * periodsActive);
      } else {
        const paymentsTotal = l.payments.reduce((sum, p) => sum + Number(p.montoAbonado), 0);
        isAtrasado = paymentsTotal < (Number(l.cuotaSemanal) * periodsActive);
      }

      if (isAtrasado) {
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

  getLoansCountForDay(dayKey: string): number {
    const list = this.loans();
    if (dayKey === 'TODO') return list.filter(l => l.estado !== LoanStatus.PAID).length;
    const dayNum = Number(dayKey);
    return list.filter(l => l.estado !== LoanStatus.PAID && l.diaCobro === dayNum).length;
  }

  getNextPaymentDate(loan: any): string {
    const startDate = new Date(loan.fechaInicio);
    startDate.setHours(0, 0, 0, 0);

    const isAlquiler = loan.modalidad === LoanModalidad.ALQUILER;
    const freq = loan.frecuenciaPago || LoanFrecuencia.SEMANAL;
    const daysPerPeriod = freq === LoanFrecuencia.SEMANAL ? 7 : freq === LoanFrecuencia.QUINCENAL ? 15 : 30;

    let dayOffset = 0;
    if (freq === LoanFrecuencia.SEMANAL) {
      const jsDayCobro = loan.diaCobro === 7 ? 0 : loan.diaCobro;
      dayOffset = jsDayCobro - startDate.getDay();
      if (dayOffset < 0) {
        dayOffset += 7;
      }

      const diasMinimos = this.loanService.settings()?.diasMinimosPrimerCobro ?? 3;
      if (dayOffset < diasMinimos) {
        dayOffset += 7;
      }
    } else {
      dayOffset = daysPerPeriod;
    }

    const current = new Date(startDate);
    current.setDate(current.getDate() + dayOffset);

    let numCuotasAbonadas = 0;
    let totalCuotasEstimadas = 999999;

    if (isAlquiler) {
      const totalAbonadoRenta = (loan.payments || []).filter((p: any) => p.tipoPago === PaymentTipo.CUOTA_RENTA).reduce((sum: number, p: any) => sum + Number(p.montoAbonado), 0);
      numCuotasAbonadas = Math.floor(totalAbonadoRenta / Number(loan.cuotaSemanal));
    } else {
      const totalAbonado = (loan.payments || []).reduce((sum: number, p: any) => sum + Number(p.montoAbonado), 0);
      numCuotasAbonadas = Math.floor(totalAbonado / Number(loan.cuotaSemanal));
      totalCuotasEstimadas = Math.ceil(Number(loan.totalAPagar) / Number(loan.cuotaSemanal));
    }

    const targetIdx = Math.max(0, Math.min(numCuotasAbonadas, totalCuotasEstimadas - 1));
    const targetDate = new Date(current);
    if (freq === LoanFrecuencia.MENSUAL) {
      targetDate.setMonth(current.getMonth() + targetIdx);
    } else {
      targetDate.setDate(current.getDate() + targetIdx * daysPerPeriod);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
    let result = targetDate.toLocaleDateString('es-ES', options);
    result = result.replace(/\./g, '');
    result = result.charAt(0).toUpperCase() + result.slice(1);

    if (diffDays === 0) {
      return `Hoy (${result})`;
    }
    if (diffDays === 1) {
      return `Mañana (${result})`;
    }
    if (diffDays < 0) {
      return `Vencido (${result})`;
    }
    return result;
  }

  filteredLoans(): Loan[] {
    const list = this.loans();
    const today = this.currentWeekday;
    const dayF = this.activeDayFilter();

    return list.filter(l => {
      if (l.estado === LoanStatus.PAID) return false;

      // Filter by day of week if specified (and tab is not 'hoy')
      if (this.activeTab() !== 'hoy' && dayF !== 'TODO' && l.diaCobro !== Number(dayF)) {
        return false;
      }

      const isAlquiler = l.modalidad === LoanModalidad.ALQUILER;
      const freq = l.frecuenciaPago || LoanFrecuencia.SEMANAL;
      const daysPerPeriod = freq === LoanFrecuencia.SEMANAL ? 7 : freq === LoanFrecuencia.QUINCENAL ? 15 : 30;
      
      const periodsActive = Math.max(0, Math.floor((Date.now() - new Date(l.fechaInicio).getTime()) / (daysPerPeriod * 24 * 60 * 60 * 1000)));
      let isAtrasado = false;

      if (isAlquiler) {
        const rentPaymentsTotal = l.payments.filter(p => p.tipoPago === PaymentTipo.CUOTA_RENTA).reduce((sum, p) => sum + Number(p.montoAbonado), 0);
        isAtrasado = rentPaymentsTotal < (Number(l.cuotaSemanal) * periodsActive);
      } else {
        const paymentsTotal = l.payments.reduce((sum, p) => sum + Number(p.montoAbonado), 0);
        isAtrasado = paymentsTotal < (Number(l.cuotaSemanal) * periodsActive);
      }

      const isHoy = l.diaCobro === today;

      if (this.activeTab() === 'atrasados') {
        return isAtrasado;
      }
      if (this.activeTab() === 'hoy') {
        return !isAtrasado && isHoy;
      }
      return !isAtrasado && !isHoy;
    });
  }

  onWheelScroll(event: WheelEvent) {
    if (event.deltaY !== 0) {
      const container = event.currentTarget as HTMLElement;
      const isAtLeft = container.scrollLeft <= 0 && event.deltaY < 0;
      const isAtRight = container.scrollLeft + container.clientWidth >= container.scrollWidth - 1 && event.deltaY > 0;
      if (!isAtLeft && !isAtRight) {
        event.preventDefault();
        container.scrollBy({ left: event.deltaY > 0 ? 120 : -120, behavior: 'smooth' });
      }
    }
  }


  getProgressPercentage(): number {
    if (!this.selectedStatementLoan) return 0;
    const isAlquiler = this.selectedStatementLoan.modalidad === 'ALQUILER';
    if (isAlquiler) {
      const totalAbonadoCapital = this.selectedStatementLoan.payments
        .filter(p => p.tipoPago === 'ABONO_CAPITAL')
        .reduce((sum, p) => sum + Number(p.montoAbonado), 0);
      return Math.min(100, Math.round((totalAbonadoCapital / Number(this.selectedStatementLoan.montoOriginal)) * 100));
    }
    const paid = Number(this.selectedStatementLoan.totalAPagar) - Number(this.selectedStatementLoan.balancePendiente);
    return Math.min(100, Math.round((paid / Number(this.selectedStatementLoan.totalAPagar)) * 100));
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

  getWhatsappLink(loan: Loan): string {
    const settings = this.loanService.settings();
    const template = settings?.plantillaWhatsapp || "Hola {cliente}, te escribo para recordarte que tu balance pendiente es de {moneda}{saldo}. Tu cuota programada es de {moneda}{cuota}. Favor de enviar el abono a la brevedad. ¡Gracias!";
    const formattedMsg = template
      .replace('{cliente}', loan.clienteNombre)
      .replace('{saldo}', String(loan.balancePendiente))
      .replace('{cuota}', String(loan.cuotaSemanal))
      .replace(/\{moneda\}/g, settings?.monedaSimbolo || '₡');

    let cleanPhone = loan.clienteTelefono.replace(/\D/g, '');
    if (cleanPhone.length === 8) {
      cleanPhone = '506' + cleanPhone;
    }
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(formattedMsg)}`;
  }

  openCreateModal() {
    this.openCreateLoan.emit();
  }

  openEditModal(loan: Loan) {
    this.editLoanData = {
      id: loan.id,
      clienteNombre: loan.clienteNombre,
      clienteTelefono: loan.clienteTelefono,
      montoOriginal: Number(loan.montoOriginal),
      cuotaSemanal: Number(loan.cuotaSemanal),
      diaCobro: Number(loan.diaCobro),
      porcentaje: 50,
      creationMode: 'monto_fijo',
      totalAPagarDirect: Number(loan.totalAPagar),
      fineAmount: loan.fineAmount ? Number(loan.fineAmount) : null,
      fineFrequency: (loan.fineFrequency || FineFrequency.DAILY) as FineFrequency,
      graceDays: Number(loan.graceDays || 0),
      hasFine: !!loan.fineAmount,
      hasPayments: (loan.payments || []).length > 0
    };
    this.showEditModal.set(true);
  }

  async submitEditLoan() {
    if (!this.editLoanData.clienteNombre || !this.editLoanData.clienteTelefono) {
      this.toastService.error('Nombre y Teléfono son requeridos');
      return;
    }

    try {
      const payload: any = {
        clienteNombre: this.editLoanData.clienteNombre,
        clienteTelefono: this.editLoanData.clienteTelefono,
        diaCobro: Number(this.editLoanData.diaCobro),
        hasFine: this.editLoanData.hasFine,
        fineAmount: this.editLoanData.hasFine && this.editLoanData.fineAmount ? Number(this.editLoanData.fineAmount) : null,
        fineFrequency: this.editLoanData.hasFine ? this.editLoanData.fineFrequency : null,
        graceDays: this.editLoanData.hasFine ? Number(this.editLoanData.graceDays) : 0
      };

      if (!this.editLoanData.hasPayments) {
        payload.montoOriginal = Number(this.editLoanData.montoOriginal);
        payload.cuotaSemanal = Number(this.editLoanData.cuotaSemanal);
        payload.totalAPagarDirect = this.editLoanData.creationMode === 'monto_fijo' ? Number(this.editLoanData.totalAPagarDirect) : null;
        payload.porcentaje = this.editLoanData.creationMode === 'porcentaje' ? Number(this.editLoanData.porcentaje) : null;
      }

      await this.loanService.updateLoan(this.editLoanData.id, payload);
      this.showEditModal.set(false);
      this.recalculateCounts();
      this.toastService.success('Préstamo actualizado correctamente');
    } catch (err) {
      this.toastService.error('Error al actualizar el préstamo');
    }
  }

  closeConfirmModal() {
    this.confirmModalConfig.set(null);
  }

  executeConfirmAction() {
    const action = this.confirmModalConfig()?.action;
    if (action) {
      action();
      this.closeConfirmModal();
    }
  }

  performDeleteLoan(loan: Loan) {
    this.confirmModalConfig.set({
      title: 'Eliminar Préstamo',
      message: `¿Está seguro que desea eliminar permanentemente el préstamo de ${loan.clienteNombre} y todos sus abonos asociados? Esta acción no se puede deshacer.`,
      danger: true,
      action: async () => {
        try {
          await this.loanService.deleteLoan(loan.id);
          this.recalculateCounts();
          this.toastService.success('Préstamo eliminado correctamente');
        } catch (err) {
          this.toastService.error('Error al eliminar el préstamo');
        }
      }
    });
  }

  openAbonoModal(loan: Loan) {
    this.selectedLoanForAbono = loan;
    this.abonoMonto = Number(loan.cuotaSemanal);
    this.abonoNotas = '';
    this.abonoMetodoPago = PaymentMethod.EFECTIVO;
    this.abonoTipoPago = loan.modalidad === 'ALQUILER' ? 'CUOTA_RENTA' : 'ABONO_CAPITAL';
    this.showAbonoModal.set(true);
  }

  async onSubmitAbono(event: Event) {
    event.preventDefault();
    if (!this.selectedLoanForAbono || !this.abonoMonto || this.abonoMonto <= 0) {
      this.toastService.error('Ingrese un abono válido');
      return;
    }

    try {
      const newPayment = await this.loanService.addPayment(
        this.selectedLoanForAbono.id,
        this.abonoMonto,
        this.abonoNotas,
        this.abonoMetodoPago,
        this.selectedLoanForAbono.modalidad === 'ALQUILER' ? (this.abonoTipoPago as any) : undefined
      );
      this.showAbonoModal.set(false);
      this.recalculateCounts();
      this.toastService.success('Abono registrado correctamente');

      const updated = this.loans().find(l => l.id === this.selectedLoanForAbono?.id);
      if (updated) {
        this.selectedStatementLoan = updated;
        this.lastPayment.set(newPayment);
        this.showAsReceipt.set(true);
        this.showStatementModal.set(true);
      }
    } catch (err: any) {
      this.toastService.error(err.error?.error || 'No se pudo aplicar el abono');
    }
  }

  openStatement(loan: Loan) {
    this.selectedStatementLoan = loan;
    this.lastPayment.set(null); // No payment context, so we don't show the Receipt toggle option
    this.showAsReceipt.set(false);
    this.showStatementModal.set(true);
  }

  async onDeletePayment(paymentId: string) {
    if (!this.selectedStatementLoan) return;
    this.confirmModalConfig.set({
      title: 'Eliminar Abono',
      message: '¿Está seguro de que desea eliminar este abono? El saldo se recalculará automáticamente.',
      danger: true,
      action: async () => {
        try {
          await this.loanService.deletePayment(this.selectedStatementLoan!.id, paymentId);
          this.toastService.success('Abono eliminado correctamente');

          // Refresh selection to show updated values
          const updated = this.loans().find(l => l.id === this.selectedStatementLoan?.id);
          if (updated) {
            this.selectedStatementLoan = updated;
            this.lastPayment.set(null);
          } else {
            this.showStatementModal.set(false);
          }
          this.recalculateCounts();
        } catch (err: any) {
          this.toastService.error(err.error?.error || 'No se pudo eliminar el abono');
        }
      }
    });
  }

  async exportAndShare() {
    const element = document.getElementById('statement-card');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#121212',
        scale: 2
      });

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const formData = new FormData();
        formData.append('file', blob);
        formData.append('upload_preset', 'loans_cat');

        try {
          const uploadRes = await fetch('https://api.cloudinary.com/v1_1/dv74qevjc/image/upload', {
            method: 'POST',
            body: formData
          });

          if (!uploadRes.ok) {
            throw new Error('Cloudinary upload failed');
          }

          const uploadData = await uploadRes.json();
          const imageUrl = uploadData.secure_url;

          const loan = this.selectedStatementLoan;
          if (!loan) return;

          let cleanPhone = loan.clienteTelefono.replace(/\D/g, '');
          if (cleanPhone.length === 8) {
            cleanPhone = '506' + cleanPhone;
          }

          const isReceipt = this.showAsReceipt() && this.lastPayment();
          const msg = isReceipt
            ? `Hola ${loan.clienteNombre}, adjunto envío tu comprobante de abono: ${imageUrl}`
            : `Hola ${loan.clienteNombre}, adjunto envío tu estado de cuenta digital: ${imageUrl}`;

          const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;

          window.open(whatsappUrl, '_blank');
          this.toastService.success(isReceipt ? 'Recibo enviado a WhatsApp.' : 'Estado de cuenta enviado.');
        } catch (uploadErr) {
          this.downloadFallback(canvas);
        }
      }, 'image/png');

    } catch (err) {
      this.toastService.error('Error al exportar el estado de cuenta');
    }
  }

  downloadFallback(canvas: HTMLCanvasElement) {
    const isReceipt = this.showAsReceipt() && this.lastPayment();
    const namePrefix = isReceipt ? 'Recibo' : 'EstadoCuenta';
    const link = document.createElement('a');
    link.download = `${namePrefix}_${this.selectedStatementLoan?.clienteNombre}.png`;
    link.href = canvas.toDataURL();
    link.click();
    this.toastService.success(isReceipt ? 'Recibo exportado como imagen.' : 'Estado de cuenta exportado.');
  }

  async openCobradoresModal() {
    this.showCobradoresModal.set(true);
    try {
      const list = await this.loanService.getCobradores();
      this.cobradores.set(list);
    } catch (err) {
      this.toastService.error('Error al cargar equipo');
    }
  }

  async onCreateCobrador(event: Event) {
    event.preventDefault();
    if (!this.newCobradorData.nombre || !this.newCobradorData.username || !this.newCobradorData.password) return;

    this.newCobradorData.username = this.newCobradorData.username.trim().toLowerCase();
    this.loadingCobrador.set(true);
    try {
      await this.loanService.createCobrador(this.newCobradorData);
      this.toastService.success('Cobrador agregado al equipo');
      this.newCobradorData = { nombre: '', username: '', password: '', telefono: '+506 ' };

      const list = await this.loanService.getCobradores();
      this.cobradores.set(list);
    } catch (err: any) {
      this.toastService.error(err.error?.error || 'Error al crear cobrador');
    } finally {
      this.loadingCobrador.set(false);
    }
  }

  toggleSub() {
    this.loanService.toggleSubscription().then(() => {
      this.recalculateCounts();
    });
  }

  logout() {
    this.loanService.logout();
  }

  async impersonateCobrador(cobrador: any) {
    try {
      this.toastService.success(`Iniciando suplantación de ${cobrador.nombre}...`);
      await this.adminService.impersonateCobrador(cobrador.id);
    } catch (err) {
      this.toastService.error('Error al suplantar al cobrador');
    }
  }
}

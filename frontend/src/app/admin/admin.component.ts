import { Component, OnInit, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, Tenant, SaaSStats, SaaSLog, SaaSPlanConfig, SaasGlobalConfig } from '../services/admin.service';
import { ToastService } from '../services/toast.service';
import { LoanService } from '../services/loan.service';
import { AuditLogListComponent, AuditLogEntry, formatEventType } from '../shared/audit-log-list/audit-log-list.component';
import html2canvas from 'html2canvas';

import { DateFieldComponent } from '../shared/date-field/date-field.component';
import { NumericStepperComponent } from '../shared/numeric-stepper/numeric-stepper.component';
import { trigger, state, style, animate, transition } from '@angular/animations';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, AuditLogListComponent, DateFieldComponent, NumericStepperComponent],
  animations: [
    trigger('expandCollapse', [
      state('void', style({ maxHeight: '0', opacity: '0', overflow: 'hidden', transform: 'translateY(-6px)' })),
      state('*', style({ maxHeight: '2000px', opacity: '1', overflow: 'hidden', transform: 'translateY(0)' })),
      transition('void => *', animate('220ms cubic-bezier(0.4, 0, 0.2, 1)')),
      transition('* => void', animate('180ms cubic-bezier(0.4, 0, 0.6, 1)'))
    ])
  ],
  template: `
    <div class="min-h-full flex-grow bg-industrial-black text-industrial-light pb-24 font-sans select-none">
      
      <!-- Header -->
      <header class="border-b border-industrial-border px-5 py-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md bg-opacity-95" style="background-color: #111111;">
        <div class="flex items-center gap-2.5">
          <img src="/assets/images/logo-header.webp" width="220" height="44" class="h-11 w-auto object-contain" alt="Cat-Loan Logo">



          <div>
            <h1 class="text-sm font-black text-white leading-none tracking-tight uppercase">PANEL DE CONTROL</h1>
            <p class="text-[9px] text-caterpillar uppercase tracking-wider font-mono mt-0.5">CAT-LOAN · PANEL ADMIN</p>
          </div>
        </div>

        <div class="flex gap-2">
          <!-- Gear icon opens the admin settings panel -->
          <button (click)="showSettingsPanel.set(true)" title="Configuración" class="bg-industrial-surface border border-industrial-border p-2 rounded-lg text-industrial-muted hover:text-caterpillar hover:border-caterpillar transition duration-150">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button (click)="logout()" class="bg-industrial-surface border border-industrial-border p-2 rounded-lg text-industrial-muted hover:text-semantic-red transition duration-150">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      <!-- Main Layout -->
      <main class="max-w-4xl mx-auto px-4 mt-6">
        <!-- Stats Row (Interactive KPIs - Skeleton Loader while loading) -->
        <section *ngIf="loadingStats()" class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 animate-pulse">
          <div *ngFor="let item of [1, 2, 3, 4]" class="bg-industrial-dark border border-industrial-border p-3.5 rounded-xl flex flex-col justify-between h-16">
            <div class="h-2.5 w-20 bg-industrial-surface rounded"></div>
            <div class="h-5 w-28 bg-industrial-surface rounded mt-2"></div>
          </div>
        </section>

        <!-- Stats Row (Interactive KPIs) -->
        <section class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6" *ngIf="!loadingStats() && stats()">
          
          <!-- Card 1: Prestamistas -->
          <div (click)="activeTab.set('tenants'); activeSubFilter.set('TODO')"
               title="Ver todos los prestamistas"
               class="bg-industrial-dark border border-industrial-border p-3.5 rounded-xl cursor-pointer hover:border-caterpillar transition duration-150 group">
            <div class="flex items-center justify-between">
              <span class="text-[9px] text-industrial-muted uppercase font-mono group-hover:text-caterpillar transition">Prestamistas</span>
              <svg class="w-3.5 h-3.5 text-industrial-muted group-hover:text-caterpillar transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </div>
            <div class="flex items-baseline justify-between mt-1">
              <span class="text-xl font-black text-white">{{ stats()?.totalPrestamistas }}</span>
              <div class="flex flex-col items-end text-[10px] font-mono font-bold leading-tight">
                <span (click)="$event.stopPropagation(); activeTab.set('tenants'); activeSubFilter.set('ACTIVO')" class="text-semantic-emerald hover:underline cursor-pointer">● {{ getTenantCount('ACTIVO') }} Activos</span>
                <span *ngIf="getTenantCount('TRIAL') > 0" (click)="$event.stopPropagation(); activeTab.set('tenants'); activeSubFilter.set('TRIAL')" class="text-caterpillar hover:underline cursor-pointer">⚡ {{ getTenantCount('TRIAL') }} Demos</span>
                <span *ngIf="getTenantCount('SUSPENDIDO') > 0" (click)="$event.stopPropagation(); activeTab.set('tenants'); activeSubFilter.set('SUSPENDIDO')" class="text-semantic-red hover:underline cursor-pointer">● {{ getTenantCount('SUSPENDIDO') }} Suspendidos</span>
              </div>
            </div>
          </div>

          <!-- Card 2: Alertas de Cobro SaaS (Reemplaza Volumen) -->
          <div (click)="activeTab.set('tenants'); activeSubFilter.set('POR_VENCER')"
               title="Ver clientes por vencer / vencidos"
               class="bg-industrial-dark border border-industrial-border p-3.5 rounded-xl cursor-pointer hover:border-caterpillar transition duration-150 group">
            <div class="flex items-center justify-between">
              <span class="text-[9px] text-industrial-muted uppercase font-mono group-hover:text-caterpillar transition">Alertas Cobro</span>
              <svg class="w-3.5 h-3.5 text-caterpillar" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
            </div>
            <div class="flex items-baseline gap-2 mt-1">
              <span class="text-[11px] font-bold text-caterpillar">⚡ {{ stats()?.alertasCobro?.porVencer || 0 }} por vencer</span>
              <span class="text-[11px] font-bold text-semantic-red">🚨 {{ stats()?.alertasCobro?.vencidos || 0 }} vencidos</span>
            </div>
          </div>

          <!-- Card 3: Ingreso Recurrente SaaS (MRR) -->
          <div (click)="showSettingsPanel.set(true)"
               title="Ver Precios e Ingresos Recurrentes"
               class="bg-industrial-dark border border-industrial-border p-3.5 rounded-xl cursor-pointer hover:border-caterpillar transition duration-150 group">
            <div class="flex items-center justify-between">
              <span class="text-[9px] text-industrial-muted uppercase font-mono group-hover:text-caterpillar transition">MRR Est. SaaS</span>
              <svg class="w-3.5 h-3.5 text-semantic-emerald" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div class="flex items-baseline justify-between mt-1">
              <span class="text-lg font-black text-caterpillar">₡{{ (stats()?.mrrEstimado ?? 0) | number:'1.0-0' }}</span>
              <span class="text-[9px] text-industrial-muted font-mono">/mes</span>
            </div>

          </div>

          <!-- Card 4: Distribución de Planes -->
          <div (click)="activeTab.set('tenants'); activeSubFilter.set('TODO')"
               title="Ver prestamistas por plan"
               class="bg-industrial-dark border border-industrial-border p-3.5 rounded-xl cursor-pointer hover:border-caterpillar transition duration-150 group">
            <span class="text-[9px] text-industrial-muted uppercase font-mono block mb-1 group-hover:text-caterpillar transition">Planes SaaS</span>
            <div class="flex items-center gap-1 text-[10px] font-mono flex-wrap">
              <span class="px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-400 border border-amber-500/20">BR:{{ stats()?.planes?.bronce }}</span>
              <span class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-600/30">PL:{{ stats()?.planes?.plata }}</span>
              <span class="px-1.5 py-0.5 rounded bg-yellow-950/40 text-caterpillar border border-caterpillar/30">OR:{{ stats()?.planes?.oro }}</span>
              <span class="px-1.5 py-0.5 rounded bg-purple-950/40 text-purple-400 border border-purple-500/30">PT:{{ stats()?.planes?.platino }}</span>
              <span class="px-1.5 py-0.5 rounded bg-cyan-950/40 text-cyan-400 border border-cyan-500/30">DM:{{ stats()?.planes?.diamante }}</span>
            </div>
          </div>

        </section>


        <!-- Tabs -->
        <div class="flex border-b border-industrial-border mb-6">
          <button (click)="activeTab.set('tenants')" [class.text-caterpillar]="activeTab() === 'tenants'" [class.border-caterpillar]="activeTab() === 'tenants'" [class.text-industrial-muted]="activeTab() !== 'tenants'" class="px-4 py-2 text-xs font-black uppercase border-b-2 border-transparent hover:text-caterpillar transition">Prestamistas</button>
          <button (click)="activeTab.set('create')" [class.text-caterpillar]="activeTab() === 'create'" [class.border-caterpillar]="activeTab() === 'create'" [class.text-industrial-muted]="activeTab() !== 'create'" class="px-4 py-2 text-xs font-black uppercase border-b-2 border-transparent hover:text-caterpillar transition">Nuevo Cliente</button>
          <button (click)="activeTab.set('logs')" [class.text-caterpillar]="activeTab() === 'logs'" [class.border-caterpillar]="activeTab() === 'logs'" [class.text-industrial-muted]="activeTab() !== 'logs'" class="px-4 py-2 text-xs font-black uppercase border-b-2 border-transparent hover:text-caterpillar transition">Auditoría</button>
        </div>


        <!-- Tenants Tab -->
        <section *ngIf="activeTab() === 'tenants'" class="space-y-4">
          <div class="relative mb-2">
            <input type="text" [(ngModel)]="searchTerm" placeholder="Buscar prestamista..." class="w-full bg-industrial-surface border border-industrial-border rounded-xl p-3.5 pl-10 text-white text-xs focus:outline-none focus:border-caterpillar">
          </div>

          <!-- Horizontal Scrollable Chips -->
          <div (wheel)="onWheelScroll($event)" class="flex items-center gap-2 overflow-x-auto pb-3 pt-1 scrollbar-none whitespace-nowrap">
            <button 
              (click)="activeSubFilter.set('TODO')"
              [class]="'shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition border ' + 
                (activeSubFilter() === 'TODO' ? 'bg-white text-industrial-black border-white' : 'bg-industrial-surface/40 text-industrial-muted border-industrial-border/60 hover:text-caterpillar hover:border-caterpillar/30')"
            >
              Todos <span class="ml-1 px-1.5 py-0.2 rounded-full bg-industrial-dark text-white text-[9px] font-mono">{{ getTenantCount('TODO') }}</span>
            </button>
            <button 
              (click)="activeSubFilter.set('ACTIVO')"
              [class]="'shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition border ' + 
                (activeSubFilter() === 'ACTIVO' ? 'bg-semantic-emerald/20 text-semantic-emerald border-semantic-emerald/80' : 'bg-industrial-surface/40 text-industrial-muted border-industrial-border/60 hover:text-caterpillar hover:border-caterpillar/30')"
            >
              Activos <span class="ml-1 px-1.5 py-0.2 rounded-full bg-industrial-dark text-[9px] font-mono">{{ getTenantCount('ACTIVO') }}</span>
            </button>
            <button 
              (click)="activeSubFilter.set('POR_VENCER')"
              [class]="'shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition border ' + 
                (activeSubFilter() === 'POR_VENCER' ? 'bg-caterpillar/20 text-caterpillar border-caterpillar/80' : 'bg-industrial-surface/40 text-industrial-muted border-industrial-border/60 hover:text-caterpillar hover:border-caterpillar/30')"
            >
              Por Vencer <span class="ml-1 px-1.5 py-0.2 rounded-full bg-industrial-dark text-[9px] font-mono">{{ getTenantCount('POR_VENCER') }}</span>
            </button>
            <button 
              (click)="activeSubFilter.set('VENCIDO')"
              [class]="'shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition border ' + 
                (activeSubFilter() === 'VENCIDO' ? 'bg-semantic-red/20 text-semantic-red border-semantic-red/80' : 'bg-industrial-surface/40 text-industrial-muted border-industrial-border/60 hover:text-caterpillar hover:border-caterpillar/30')"
            >
              Vencidos <span class="ml-1 px-1.5 py-0.2 rounded-full bg-industrial-dark text-[9px] font-mono">{{ getTenantCount('VENCIDO') }}</span>
            </button>
            <button 
              (click)="activeSubFilter.set('SUSPENDIDO')"
              [class]="'shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition border ' + 
                (activeSubFilter() === 'SUSPENDIDO' ? 'bg-industrial-surface border-industrial-border text-industrial-muted' : 'bg-industrial-surface/40 text-industrial-muted border-industrial-border/60 hover:text-caterpillar hover:border-caterpillar/30')"
            >
              Suspendidos <span class="ml-1 px-1.5 py-0.2 rounded-full bg-industrial-dark text-[9px] font-mono">{{ getTenantCount('SUSPENDIDO') }}</span>
            </button>
            <button 
              (click)="activeSubFilter.set('TRIAL')"
              [class]="'shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition border ' + 
                (activeSubFilter() === 'TRIAL' ? 'bg-blue-500/10 text-blue-400 border-blue-500/50' : 'bg-industrial-surface/40 text-industrial-muted border-industrial-border/60 hover:text-caterpillar hover:border-caterpillar/30')"
            >
              Demos/Trials <span class="ml-1 px-1.5 py-0.2 rounded-full bg-industrial-dark text-[9px] font-mono">{{ getTenantCount('TRIAL') }}</span>
            </button>
          </div>

          <!-- Skeleton Loader List for Tenants -->
          <div *ngIf="loadingTenants()" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div *ngFor="let item of [1, 2, 3]" class="bg-industrial-dark border border-industrial-border rounded-xl p-4 space-y-3 animate-pulse">
              <div class="flex items-center justify-between">
                <div class="h-4 w-28 bg-industrial-surface rounded"></div>
                <div class="h-3 w-16 bg-industrial-surface/60 rounded"></div>
              </div>
              <div class="h-3 w-20 bg-industrial-surface/40 rounded"></div>
              <div class="h-10 w-full bg-industrial-surface/50 rounded-xl"></div>
              <div class="h-8 w-full bg-industrial-surface/60 rounded-lg"></div>
            </div>
          </div>

          <div *ngIf="!loadingTenants()" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div *ngFor="let tenant of filteredTenants()" class="bg-industrial-dark border border-industrial-border rounded-xl p-4 transition hover:border-caterpillar/30">

              <!-- Row 1: Name + Status + Activity Icon -->
              <div class="flex items-start justify-between gap-2 mb-2">
                <div class="min-w-0">
                  <h3 class="font-extrabold text-white text-sm leading-tight truncate">{{ tenant.nombre }}</h3>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span class="text-[10px] text-caterpillar font-mono">&#64;{{ tenant.username }}</span>
                    <button
                      (click)="viewTenantActivity(tenant)"
                      title="Ver Bitácora de Actividad"
                      class="text-industrial-muted hover:text-caterpillar transition p-0.5 rounded hover:bg-industrial-surface"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002 2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                      </svg>
                    </button>
                  </div>
                </div>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <span [class]="tenant.suspendido ? 'bg-semantic-red/10 text-semantic-red border-semantic-red/30' : (tenant.isTrial && !tenant.paymentDate ? 'bg-amber-950/40 text-caterpillar border-caterpillar/40' : 'bg-semantic-emerald/10 text-semantic-emerald border-semantic-emerald/30')"
                        class="shrink-0 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border">
                    {{ tenant.suspendido ? 'SUSPENDIDO' : (tenant.isTrial && !tenant.paymentDate ? 'TRIAL ⚡' : 'ACTIVO') }}
                  </span>
                </div>
              </div>


              <!-- Row 2: Phone + Email -->
              <div class="flex items-center gap-2 flex-wrap mb-3 relative">
                <button (click)="togglePhoneDropdown(tenant.id, $event)" class="hover:text-semantic-emerald flex items-center gap-1 text-[11px] text-industrial-muted font-mono transition focus:outline-none">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                  {{ tenant.telefono }}
                </button>
                <span *ngIf="tenant.email" class="text-[10px] text-industrial-muted font-mono truncate">{{ tenant.email }}</span>
                <span *ngIf="isExpiringSoon(tenant)" class="text-[9px] bg-semantic-red/20 text-semantic-red px-1.5 py-0.5 rounded border border-semantic-red/30 animate-pulse">
                  ¡Vence en {{ getDaysLeft(tenant) }} días!
                </span>

                <!-- Phone dropdown -->
                <div *ngIf="activePhoneDropdown() === tenant.id" class="absolute top-full left-0 mt-1 w-56 bg-industrial-surface border border-industrial-border rounded shadow-lg z-50 py-1 flex flex-col">
                  <button (click)="sharePaymentReminder(tenant)" class="text-left px-3 py-2 text-[10px] text-white hover:bg-industrial-dark transition flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-caterpillar shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Enviar Recordatorio 
                  </button>
                  <button (click)="shareCustomMessage(tenant, $event)" class="text-left px-3 py-2 text-[10px] text-white hover:bg-industrial-dark transition flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-industrial-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                    Mensaje Personalizado
                  </button>
                  <button (click)="openEditPhoneModal(tenant, $event)" class="text-left px-3 py-2 text-[10px] text-white hover:bg-industrial-dark transition flex items-center gap-2 border-t border-industrial-border/60">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-semantic-emerald shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Cambiar número
                  </button>

                </div>
              </div>

              <!-- Row 3: Stats strip -->
              <div class="flex items-center justify-around bg-industrial-surface/50 border border-industrial-border/60 rounded-xl p-3 mb-3">
                <div class="flex items-center gap-2">
                  <span class="text-[9px] text-industrial-muted uppercase font-mono">Clientes</span>
                  <span class="text-sm font-black text-white leading-none">{{ tenant._count?.loans || 0 }}</span>
                </div>
                <div class="w-px h-4 bg-industrial-border/50"></div>
                <div class="flex items-center gap-2">
                  <span class="text-[9px] text-industrial-muted uppercase font-mono">Cobradores</span>
                  <span class="text-sm font-black text-white leading-none">{{ tenant._count?.cobradores || 0 }}</span>
                </div>
              </div>



              <!-- Row 5: Vencimiento + Plan + Actions -->
              <div class="flex flex-col gap-2 pt-3 border-t border-industrial-border/50">
                <!-- Vencimiento row -->
                <div class="flex items-center justify-between bg-industrial-surface/40 rounded-lg px-3 py-2 border border-industrial-border/30">
                  <div>
                    <p class="text-[9px] text-industrial-muted uppercase font-mono">
                      {{ tenant.isTrial && !tenant.paymentDate ? 'Fin de Trial' : 'Vencimiento' }}
                    </p>
                    <p class="text-xs font-bold" [class]="isPaymentOverdue(tenant) ? 'text-semantic-red' : 'text-white'">
                      {{ getPaymentDateDisplay(tenant) }}
                    </p>
                  </div>

                  <div class="flex items-center gap-1.5 shrink-0">
                    <!-- Subtle Date Picker Trigger Icon for Trial -->
                    <div *ngIf="tenant.isTrial && !tenant.paymentDate" class="shrink-0">
                      <app-date-field mode="single"
                                      [iconOnly]="true"
                                      [ngModel]="tenant.fechaPruebaFin ? (tenant.fechaPruebaFin | date:'yyyy-MM-dd') : ''"
                                      (ngModelChange)="onTrialDateChanged(tenant, $event)">
                      </app-date-field>
                    </div>

                    <button *ngIf="tenant.isTrial && !tenant.paymentDate" (click)="extendTrial(tenant, 7)" title="Atajo: Extender 7 días" class="bg-amber-950/40 border border-caterpillar/40 text-caterpillar text-[9px] font-black uppercase px-2 py-1.5 rounded hover:bg-caterpillar hover:text-industrial-black transition">
                      +7 Días
                    </button>
                  </div>
                </div>

                <!-- Plan + Suspend + Impersonate -->
                <div class="space-y-3">
                  <div>
                    <label class="block text-[9px] text-industrial-muted uppercase font-mono mb-1">Plan</label>
                    <div class="group relative flex items-stretch rounded-lg overflow-hidden border border-industrial-border focus-within:border-caterpillar transition-colors duration-150 bg-industrial-surface w-full">
                      <select [ngModel]="tenant.plan" (ngModelChange)="changePlan(tenant.id, $event)"
                              class="w-full bg-transparent text-white text-xs px-2.5 py-2 pr-10 focus:outline-none appearance-none cursor-pointer">
                        <option value="BRONCE">BRONCE</option>
                        <option value="PLATA">PLATA</option>
                        <option value="ORO">ORO</option>
                        <option value="PLATINO">PLATINO</option>
                        <option value="DIAMANTE">DIAMANTE</option>
                      </select>
                      <div class="absolute inset-y-0 right-0 flex items-center justify-center w-8 bg-industrial-dark text-caterpillar border-l border-industrial-border pointer-events-none select-none group-hover:bg-caterpillar group-hover:text-industrial-black transition-colors duration-150">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div class="flex gap-2 w-full">
                    <button (click)="toggleSuspend(tenant)" class="flex-1 bg-industrial-surface border border-industrial-border text-xs py-2 px-3 rounded text-white hover:border-caterpillar transition">
                      {{ tenant.suspendido ? 'Activar' : 'Suspender' }}
                    </button>
                    <button (click)="impersonate(tenant)" class="flex-1 bg-caterpillar text-industrial-black font-black text-xs py-2 px-3 rounded uppercase shadow hover:bg-caterpillar-dark transition text-center">
                      Ingresar
                    </button>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </section>

        <!-- Create Tenant Tab -->
        <section *ngIf="activeTab() === 'create'" class="bg-industrial-dark border border-industrial-border p-6 rounded-xl">
          <form (submit)="createTenant($event)" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Nombre Completo / Negocio</label>
                <input type="text" [(ngModel)]="newTenant.nombre" name="nombre" required class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:border-caterpillar">
              </div>
              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Nombre de Usuario (Login)</label>
                <input type="text" [(ngModel)]="newTenant.username" (input)="newTenant.username = newTenant.username.toLowerCase()" name="username" required class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:border-caterpillar">
              </div>
              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Contraseña Inicial</label>
                <input type="text" [(ngModel)]="newTenant.password" name="password" required class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:border-caterpillar">
              </div>
              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Teléfono (WhatsApp)</label>
                <input type="tel" [(ngModel)]="newTenant.telefono" name="telefono" required class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:border-caterpillar">
              </div>
              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Correo Electrónico (Opcional)</label>
                <input type="email" [(ngModel)]="newTenant.email" name="email" class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:border-caterpillar">
              </div>
              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Plan Inicial</label>
                <div class="group relative flex items-stretch rounded-lg overflow-hidden border border-industrial-border focus-within:border-caterpillar transition-colors duration-150 bg-industrial-surface">
                  <select [(ngModel)]="newTenant.plan" name="plan"
                          class="w-full bg-transparent text-white text-sm px-3 py-3 pr-12 focus:outline-none appearance-none cursor-pointer">
                    <option *ngFor="let conf of planConfigs()" [value]="conf.plan">{{ conf.plan }}</option>
                  </select>
                  <div class="absolute inset-y-0 right-0 flex items-center justify-center w-9 bg-industrial-dark text-caterpillar border-l border-industrial-border pointer-events-none select-none group-hover:bg-caterpillar group-hover:text-industrial-black transition-colors duration-150">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <button type="submit" [disabled]="loading()" class="w-full bg-caterpillar text-industrial-black font-black uppercase text-xs py-3.5 rounded-lg mt-4 hover:bg-caterpillar-dark transition">
              {{ loading() ? 'Creando...' : 'Crear Prestamista' }}
            </button>
          </form>
        </section>

        <!-- Logs Tab -->
        <section *ngIf="activeTab() === 'logs'" class="space-y-4">
        <!-- Filtros de Auditoría -->
          <div class="bg-industrial-dark border border-industrial-border rounded-xl p-4 flex flex-col md:flex-row gap-3 items-end">
            <div class="flex-1 w-full">
              <label class="block text-[10px] text-industrial-muted uppercase font-mono mb-1">Tipo de Actividad</label>
              <div class="group relative flex items-stretch rounded-lg overflow-hidden border border-industrial-border focus-within:border-caterpillar transition-colors duration-150 bg-industrial-surface">
                <select [ngModel]="filterTipoEvento()" (ngModelChange)="onFilterTipoEventoChange($event)"
                        class="w-full bg-transparent text-white text-xs px-3 py-2.5 pr-12 focus:outline-none appearance-none cursor-pointer">
                  <option value="">Todos los eventos</option>
                  <option *ngFor="let ev of eventTypes" [value]="ev">{{ formatEventType(ev) }}</option>
                </select>

                <div class="absolute inset-y-0 right-0 flex items-center justify-center w-9 bg-industrial-dark text-caterpillar border-l border-industrial-border pointer-events-none select-none group-hover:bg-caterpillar group-hover:text-industrial-black transition-colors duration-150">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
            </div>
            <div class="flex-1 w-full">
              <label class="block text-[10px] text-industrial-muted uppercase font-mono mb-1">Prestamista</label>
              <div class="group relative flex items-stretch rounded-lg overflow-hidden border border-industrial-border focus-within:border-caterpillar transition-colors duration-150 bg-industrial-surface">
                <select [ngModel]="filterPrestamistaId()" (ngModelChange)="onFilterPrestamistaIdChange($event)"
                        class="w-full bg-transparent text-white text-xs px-3 py-2.5 pr-12 focus:outline-none appearance-none cursor-pointer">
                  <option value="">Todos los prestamistas</option>
                  <option *ngFor="let t of tenants()" [value]="t.id">{{ t.nombre }}</option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center justify-center w-9 bg-industrial-dark text-caterpillar border-l border-industrial-border pointer-events-none select-none group-hover:bg-caterpillar group-hover:text-industrial-black transition-colors duration-150">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
            </div>
            <div class="flex-1 w-full min-w-[240px]">
              <app-date-field
                mode="range"
                label="Rango de Fechas"
                placeholder="Filtrar fechas"
                [ngModel]="dateRangeValue()"
                (ngModelChange)="onDateRangeChange($event)">
              </app-date-field>
            </div>

            <button (click)="clearLogsFilters()" class="w-full md:w-auto bg-industrial-surface border border-industrial-border hover:bg-industrial-border text-industrial-light text-xs font-bold px-4 py-2.5 rounded-lg transition shrink-0 self-end">
              Limpiar
            </button>
          </div>


          <app-audit-log-list
            [logs]="logsForDisplay()"
            [loading]="false"
            [page]="logsPage()"
            [totalPages]="logsTotalPages()"
            [total]="logsTotal()"
            [showMeta]="true"
            (pageChange)="changeLogsPage($event)">
          </app-audit-log-list>

        </section>

      </main>

      <!-- Confirmation Modal -->
      <div *ngIf="confirmModalConfig()" class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
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
            <button (click)="executeConfirmAction()" [ngClass]="confirmModalConfig()?.danger ? 'bg-semantic-red hover:bg-red-600' : 'bg-caterpillar hover:bg-caterpillar-dark text-industrial-black'" class="flex-1 font-black uppercase text-xs tracking-wider py-3 rounded-lg transition duration-150">
              Confirmar
            </button>
          </div>
        </div>
      </div>

      <!-- Admin Settings Panel (slide-in from right) -->
      <div *ngIf="showSettingsPanel()" class="fixed inset-0 z-50 flex">
        <!-- Backdrop -->
        <div class="flex-1 bg-black/60 backdrop-blur-sm" (click)="showSettingsPanel.set(false)"></div>

        <!-- Panel -->
        <div class="w-full max-w-lg bg-industrial-dark border-l border-industrial-border flex flex-col shadow-2xl overflow-y-auto">
          <!-- Panel Header -->
          <div class="flex justify-between items-center px-6 py-4 border-b border-industrial-border sticky top-0 bg-industrial-dark z-10">
            <div class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-caterpillar" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h3 class="text-white font-black uppercase tracking-tight">Configuración General</h3>
            </div>
            <button (click)="showSettingsPanel.set(false)" class="text-industrial-muted hover:text-caterpillar focus:outline-none transition">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <!-- Section: Configuración de Sistema -->
          <div class="px-6 py-4 border-b border-industrial-border/60">
            <div class="flex items-center justify-between py-1">
              <div class="flex items-center gap-2">
                <span class="text-[10px] text-caterpillar uppercase font-mono tracking-widest font-black">Configuración de Sistema</span>
              </div>
              <button (click)="toggleSettingsSection('saasGlobal')" 
                      title="Desplegar configuración de sistema"
                      class="p-1 text-industrial-muted hover:text-caterpillar focus:outline-none transition rounded-md hover:bg-industrial-surface">
                <svg xmlns="http://www.w3.org/2000/svg" [class.rotate-180]="expandedSaasGlobalConfigs()" class="h-4 w-4 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            <div *ngIf="expandedSaasGlobalConfigs()" @expandCollapse class="space-y-4 bg-industrial-surface border border-industrial-border p-4 rounded-lg mt-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-[9px] text-industrial-muted uppercase font-mono mb-1">Días de Prueba por Defecto</label>
                  <app-numeric-stepper [(ngModel)]="saasGlobalConfig.defaultTrialDays" [min]="1" [max]="90" [step]="1"></app-numeric-stepper>
                  <span class="text-[8px] text-industrial-muted block mt-1">Días de prueba iniciales asignados a nuevos registros de demostración</span>
                </div>
                <div>
                  <label class="block text-[9px] text-industrial-muted uppercase font-mono mb-1">Días de Gracia Post-Vencimiento</label>
                  <app-numeric-stepper [(ngModel)]="saasGlobalConfig.graceDays" [min]="0" [max]="30" [step]="1"></app-numeric-stepper>
                  <span class="text-[8px] text-industrial-muted block mt-1">Días adicionales permitidos antes del bloqueo definitivo</span>
                </div>
              </div>

              <div>
                <label class="block text-[9px] text-industrial-muted uppercase font-mono mb-1">WhatsApp de Soporte Oficial</label>
                <input type="text" [(ngModel)]="saasGlobalConfig.supportWhatsappNumber" placeholder="Ej: 50672666369" class="w-full bg-industrial-dark border border-industrial-border rounded p-2 text-white text-xs focus:border-caterpillar outline-none">
                <span class="text-[8px] text-industrial-muted block mt-1">Número internacional al que serán dirigidos los enlaces de soporte</span>
              </div>

              <button (click)="saveSaasGlobalConfig()" 
                      [disabled]="!isSaasConfigChanged() || savingSaasConfig()" 
                      class="w-full bg-caterpillar text-industrial-black font-black py-2 rounded text-xs uppercase hover:bg-caterpillar-dark transition mt-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-caterpillar">
                {{ savingSaasConfig() ? 'Guardando...' : 'Guardar Configuración' }}
              </button>
            </div>
          </div>

          <!-- Section: Planes y Límites -->
          <div class="px-6 py-4 border-b border-industrial-border/60">
            <div class="flex items-center justify-between py-1">
              <div class="flex items-center gap-2">
                <span class="text-[10px] text-caterpillar uppercase font-mono tracking-widest font-black">Planes y Límites</span>
              </div>
              <button (click)="toggleSettingsSection('plans')" 
                      title="Desplegar planes y límites"
                      class="p-1 text-industrial-muted hover:text-caterpillar focus:outline-none transition rounded-md hover:bg-industrial-surface">
                <svg xmlns="http://www.w3.org/2000/svg" [class.rotate-180]="expandedPlansConfigs()" class="h-4 w-4 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            <div *ngIf="expandedPlansConfigs()" @expandCollapse class="space-y-4 mt-4">
              <div *ngFor="let config of planConfigs()" class="bg-industrial-surface border border-industrial-border p-4 rounded-lg">
                <div class="flex justify-between items-center mb-3 pb-2 border-b border-industrial-border/50">
                  <h4 class="text-caterpillar font-black text-sm">{{ config.plan }}</h4>
                  <button (click)="savePlanConfig(config)" 
                          [disabled]="!isPlanConfigChanged(config) || savingPlan(config.plan)" 
                          class="bg-caterpillar text-industrial-black px-3 py-1 rounded text-[9px] uppercase font-bold hover:bg-caterpillar-dark transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-caterpillar">
                    {{ savingPlan(config.plan) ? 'Guardando...' : 'Guardar' }}
                  </button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-[9px] text-industrial-muted uppercase font-mono mb-1">Máx Clientes</label>
                    <app-numeric-stepper [(ngModel)]="config.maxClientes" [min]="-1" [step]="1"></app-numeric-stepper>
                    <span class="text-[8px] text-industrial-muted block mt-1">-1 = ilimitado</span>
                  </div>
                  <div>
                    <label class="block text-[9px] text-industrial-muted uppercase font-mono mb-1">Máx Cobradores</label>
                    <app-numeric-stepper [(ngModel)]="config.maxCobradores" [min]="-1" [step]="1"></app-numeric-stepper>
                    <span class="text-[8px] text-industrial-muted block mt-1">-1 = ilimitado</span>
                  </div>
                  <div>
                    <label class="block text-[9px] text-industrial-muted uppercase font-mono mb-1">Precio (₡)</label>
                    <app-numeric-stepper [(ngModel)]="config.precioMensual" [min]="0" [step]="500"></app-numeric-stepper>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Section: Cambiar Contraseña -->
          <div class="px-6 py-4 border-b border-industrial-border/60">
            <div class="flex items-center justify-between py-1">
              <div class="flex items-center gap-2">
                <span class="text-[10px] text-caterpillar uppercase font-mono tracking-widest font-black">Cambiar Contraseña</span>
              </div>
              <button (click)="toggleSettingsSection('password')" 
                      title="Desplegar cambiar contraseña"
                      class="p-1 text-industrial-muted hover:text-caterpillar focus:outline-none transition rounded-md hover:bg-industrial-surface">
                <svg xmlns="http://www.w3.org/2000/svg" [class.rotate-180]="expandedChangePassword()" class="h-4 w-4 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            
            <div *ngIf="expandedChangePassword()" @expandCollapse class="space-y-3 bg-industrial-surface border border-industrial-border p-4 rounded-lg mt-4">
              <div>
                <label class="block text-[9px] text-industrial-muted uppercase font-mono mb-1">Contraseña Actual</label>
                <input type="password" [(ngModel)]="oldPassword" class="w-full bg-industrial-dark border border-industrial-border rounded p-1.5 text-white text-xs focus:border-caterpillar outline-none">
              </div>
              <div>
                <label class="block text-[9px] text-industrial-muted uppercase font-mono mb-1">Nueva Contraseña</label>
                <input type="password" [(ngModel)]="newPassword" class="w-full bg-industrial-dark border border-industrial-border rounded p-1.5 text-white text-xs focus:border-caterpillar outline-none">
              </div>
              <div>
                <label class="block text-[9px] text-industrial-muted uppercase font-mono mb-1">Confirmar Nueva Contraseña</label>
                <input type="password" [(ngModel)]="confirmPassword" class="w-full bg-industrial-dark border border-industrial-border rounded p-1.5 text-white text-xs focus:border-caterpillar outline-none">
              </div>
              <button (click)="changeAdminPassword()" [disabled]="changingPassword()" class="w-full bg-caterpillar text-industrial-black font-black py-2 rounded text-xs uppercase hover:bg-caterpillar-dark transition mt-2">
                {{ changingPassword() ? 'Cambiando...' : 'Cambiar Contraseña' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Hidden DOM Element for Image Generation -->
      <div *ngIf="selectedTenantForReminder()" class="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none w-[400px]">
        <div id="reminder-card" class="bg-industrial-dark border border-industrial-border p-6 font-sans">
          <div class="flex justify-between items-start mb-6 border-b border-industrial-border pb-4">
            <div>
              <img src="/assets/images/logo-header.webp" width="160" height="32" class="h-8 w-auto mb-2 opacity-90" alt="Cat-Loan">

              <h2 class="text-white font-black uppercase text-lg leading-tight tracking-tight">Estado de Suscripción</h2>
              <p class="text-[10px] text-industrial-muted font-mono uppercase tracking-wider">CAT-LOAN</p>
            </div>
          </div>
          
          <div class="space-y-4 mb-6">
            <div>
              <p class="text-[9px] text-industrial-muted uppercase font-mono">Cliente</p>
              <p class="text-sm text-white font-bold">{{ selectedTenantForReminder()?.nombre }}</p>
            </div>
            <div class="flex justify-between">
              <div>
                <p class="text-[9px] text-industrial-muted uppercase font-mono">Plan Actual</p>
                <p class="text-lg text-caterpillar font-black">{{ selectedTenantForReminder()?.plan }}</p>
              </div>
              <div class="text-right">
                <p class="text-[9px] text-industrial-muted uppercase font-mono">Vencimiento</p>
                <p class="text-sm text-white font-bold">{{ getReminderPaymentDate(selectedTenantForReminder()) }}</p>
              </div>
            </div>
            <div class="bg-industrial-surface p-4 rounded-lg border border-industrial-border/50">
              <p class="text-[9px] text-industrial-muted uppercase font-mono mb-1">Costo de Renovación</p>
              <p class="text-2xl text-white font-black">₡{{ getPlanPrice(selectedTenantForReminder()?.plan) | number:'1.0-0' }}</p>
            </div>
          </div>

          <div class="bg-caterpillar/10 border border-caterpillar/30 p-3 rounded text-center">
            <p class="text-[10px] text-caterpillar font-bold">{{ getPromoMessage(selectedTenantForReminder()?.plan || '') }}</p>
          </div>
        </div>
      </div>

    
  <!-- EDIT PHONE MODAL -->
  <div *ngIf="showEditPhoneModal()" class="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
    <div class="bg-industrial-dark border border-industrial-border rounded-2xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden">
      <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-caterpillar via-industrial-black to-caterpillar bg-[length:30px_8px]"></div>
      
      <h3 class="text-white font-black uppercase tracking-tight text-lg mt-2 mb-2">
        Cambiar Número de Teléfono
      </h3>
      <p class="text-industrial-muted text-sm mb-4">
        Modifica el teléfono asociado a este prestamista.
      </p>

      <div class="mb-6" *ngIf="editPhoneData()">
        <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Teléfono (WhatsApp)</label>
        <div class="relative flex items-center">
          <span class="absolute left-3 text-industrial-muted text-sm">+506</span>
          <input type="tel" 
                 [ngModel]="editPhoneData()?.telefono?.replace('+506', '')?.trim()"
                 (ngModelChange)="editPhoneData.set({id: editPhoneData()!.id, telefono: '+506 ' + $event})"
                 placeholder="88888888"
                 class="w-full bg-industrial-surface border border-industrial-border rounded-lg py-3 pl-12 pr-3 text-white text-sm focus:outline-none focus:border-caterpillar transition-colors">
        </div>
      </div>
      
      <div class="flex gap-3">
        <button (click)="closeEditPhoneModal()" [disabled]="isSavingPhone()" class="flex-1 bg-industrial-surface border border-industrial-border hover:border-caterpillar/40 text-white hover:text-caterpillar text-xs font-bold py-3 rounded-lg transition duration-150 uppercase tracking-wider">
          Cerrar
        </button>
        <button (click)="submitEditPhone()" [disabled]="isSavingPhone()" class="flex-1 bg-caterpillar hover:bg-caterpillar-dark text-industrial-black font-black uppercase text-xs tracking-wider py-3 rounded-lg transition duration-150">
          {{ isSavingPhone() ? 'Guardando...' : 'Guardar Cambios' }}
        </button>
      </div>
    </div>
  </div>

</div>
  `
})
export class AdminComponent implements OnInit {
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (this.activePhoneDropdown()) {
      this.activePhoneDropdown.set(null);
    }
  }

  showEditPhoneModal = signal<boolean>(false);
  editPhoneData = signal<{ id: string, telefono: string } | null>(null);

  openEditPhoneModal(tenant: any, event: Event) {
    event.stopPropagation();
    this.activePhoneDropdown.set(null);
    this.editPhoneData.set({ id: tenant.id, telefono: tenant.telefono });
    this.showEditPhoneModal.set(true);
  }

  closeEditPhoneModal() {
    this.showEditPhoneModal.set(false);
    this.editPhoneData.set(null);
  }

  isSavingPhone = signal<boolean>(false);

  submitEditPhone() {
    const data = this.editPhoneData();
    if (!data || !data.telefono || data.telefono.trim().length < 8) {
      this.toastService.error('Ingrese un número válido');
      return;
    }

    this.isSavingPhone.set(true);
    this.adminService.updateTenantPhone(data.id, data.telefono).subscribe({
      next: (res: any) => {
        this.toastService.success('Teléfono actualizado correctamente');
        const updatedList = this.tenants().map(t => {
          if (t.id === data.id) {
            return { ...t, telefono: res.telefono };
          }
          return t;
        });
        this.tenants.set(updatedList);
        this.closeEditPhoneModal();
        this.isSavingPhone.set(false);
      },
      error: (err: any) => {
        this.toastService.error(err.error?.error || 'Error al actualizar el teléfono');
        this.isSavingPhone.set(false);
      }
    });
  }

  adminService = inject(AdminService);
  loanService = inject(LoanService);
  toastService = inject(ToastService);

  oldPassword = '';
  newPassword = '';
  confirmPassword = '';
  changingPassword = signal(false);

  async changeAdminPassword() {
    if (!this.oldPassword || !this.newPassword || !this.confirmPassword) {
      this.toastService.error('Todos los campos son requeridos');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.toastService.error('Las contraseñas nuevas no coinciden');
      return;
    }
    this.changingPassword.set(true);
    try {
      await this.loanService.changePassword(this.oldPassword, this.newPassword);
      this.toastService.success('Contraseña cambiada exitosamente');
      this.oldPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
      this.showSettingsPanel.set(false);
    } catch (err: any) {
      this.toastService.error(err.error?.error || 'Error al cambiar contraseña');
    } finally {
      this.changingPassword.set(false);
    }
  }

  activeTab = signal<'tenants' | 'create' | 'logs'>('tenants');
  activeSubFilter = signal<string>('TODO');

  tenants = signal<Tenant[]>([]);
  stats = signal<SaaSStats | null>(null);
  logs = signal<SaaSLog[]>([]);
  planConfigs = signal<SaaSPlanConfig[]>([]);

  // Section collapse state
  expandedPlansConfigs = signal<boolean>(false);
  expandedSaasGlobalConfigs = signal<boolean>(false);
  expandedChangePassword = signal<boolean>(false);

  // SaaS Global Config State
  saasGlobalConfig: SaasGlobalConfig = {
    id: 'global',
    defaultTrialDays: 14,
    supportWhatsappNumber: '50672666369',
    graceDays: 0
  };
  originalSaasGlobalConfig: SaasGlobalConfig = { ...this.saasGlobalConfig };
  savingSaasConfig = signal<boolean>(false);

  // Original Plan Configs State for pristine comparison
  originalPlanConfigs = signal<Record<string, SaaSPlanConfig>>({});
  savingPlanState = signal<Record<string, boolean>>({});

  /** Maps SaaSLog[] to AuditLogEntry[] for the shared component. */
  logsForDisplay = computed<AuditLogEntry[]>(() =>
    this.logs().map(l => ({
      id: l.id,
      tipoEvento: l.tipoEvento,
      descripcion: l.descripcion,
      fecha: l.fecha,
      ip: l.ip,
      prestamistaId: l.prestamistaId
    }))
  );

  // Logs filters & pagination state
  filterTipoEvento = signal<string>('');
  filterStartDate = signal<string>('');
  filterEndDate = signal<string>('');
  filterPrestamistaId = signal<string>('');
  logsPage = signal<number>(1);
  logsTotalPages = signal<number>(1);
  logsTotal = signal<number>(0);
  logsLimit = 20;

  eventTypes = [
    'CREAR_TENANT',
    'SUSPENDER_TENANT',
    'ACTIVAR_TENANT',
    'CAMBIO_PLAN',
    'ACTUALIZAR_VENCIMIENTO',
    'EXTENDER_TRIAL',
    'IMPERSONATE',
    'IMPERSONATE_COBRADOR',
    'UPDATE_SAAS_CONFIG',
    'ACTUALIZAR_PLAN',
    'CREAR_COBRADOR',
    'CREAR_LOAN',
    'EDITAR_LOAN',
    'ELIMINAR_LOAN',
    'CONDONAR_MORA',
    'CREAR_PAGO',
    'AGREGAR_PAGO',
    'ELIMINAR_PAGO',
    'ACTUALIZAR_SETTINGS'
  ];


  searchTerm = '';
  loading = signal(false);
  loadingStats = signal(true);
  loadingTenants = signal(true);

  formatEventType(event: string): string {
    return formatEventType(event);
  }


  showSettingsPanel = signal(false);
  activePhoneDropdown = signal<string | null>(null);
  selectedTenantForReminder = signal<Tenant | null>(null);
  isGeneratingImage = signal(false);

  newTenant = {
    nombre: '',
    username: '',
    password: '',
    email: '',
    telefono: '+506 ',
    plan: 'BRONCE'
  };

  confirmModalConfig = signal<{ title: string; message: string; danger?: boolean; action: () => void } | null>(null);

  ngOnInit() {
    this.applyImpersonationFilter();
    this.loadData();
  }

  /** If the admin is currently impersonating a tenant (or cobrador), pre-filter logs to that tenant. */
  applyImpersonationFilter() {
    const user = this.loanService.currentUser();
    if (!user?.isImpersonating) return;
    // When impersonating a PRESTAMISTA, user.id IS the tenant
    // When impersonating a COBRADOR, user.prestamistaId is the tenant
    const tenantId = user.rol === 'COBRADOR' ? user.prestamistaId : user.id;
    if (tenantId) {
      this.filterPrestamistaId.set(tenantId);
    }
  }

  async loadData() {
    // Load independently so a failure in one doesn't block the others
    this.loadingTenants.set(true);
    try {
      this.tenants.set(await this.adminService.getTenants());
    } catch (err) {
      this.toastService.error('Error cargando prestamistas');
    } finally {
      this.loadingTenants.set(false);
    }

    this.loadingStats.set(true);
    try {
      this.stats.set(await this.adminService.getStats());
    } catch (_) {
    } finally {
      this.loadingStats.set(false);
    }

    await this.loadLogs();

    try {
      const config = await this.adminService.getSaasConfig();
      if (config) {
        this.saasGlobalConfig = { ...config };
        this.originalSaasGlobalConfig = { ...config };
      }
    } catch (_) { }

    const FALLBACK_PLANS: SaaSPlanConfig[] = [
      { plan: 'BRONCE', maxClientes: 10, maxCobradores: 0, precioMensual: 5000 },
      { plan: 'PLATA', maxClientes: 20, maxCobradores: 1, precioMensual: 7500 },
      { plan: 'ORO', maxClientes: 35, maxCobradores: 2, precioMensual: 10000 },
      { plan: 'PLATINO', maxClientes: 50, maxCobradores: 5, precioMensual: 20000 },
      { plan: 'DIAMANTE', maxClientes: -1, maxCobradores: -1, precioMensual: 30000 }
    ];

    try {
      const p = await this.adminService.getPlanConfigs();
      const loadedPlans = p && p.length > 0 ? p : FALLBACK_PLANS;
      this.planConfigs.set(JSON.parse(JSON.stringify(loadedPlans)));
      this.setOriginalPlans(loadedPlans);
    } catch (_) {
      this.planConfigs.set(JSON.parse(JSON.stringify(FALLBACK_PLANS)));
      this.setOriginalPlans(FALLBACK_PLANS);
    }
  }

  async loadLogs() {
    try {
      const res = await this.adminService.getLogs({
        page: this.logsPage(),
        limit: this.logsLimit,
        tipoEvento: this.filterTipoEvento() || undefined,
        startDate: this.filterStartDate() || undefined,
        endDate: this.filterEndDate() || undefined,
        prestamistaId: this.filterPrestamistaId() || undefined
      });
      this.logs.set(res.data);
      this.logsTotalPages.set(res.meta.totalPages);
      this.logsTotal.set(res.meta.total);
    } catch (_) {
      this.toastService.error('Error al cargar logs de auditoría');
    }
  }

  async onFilterTipoEventoChange(val: string) {
    this.filterTipoEvento.set(val);
    this.logsPage.set(1);
    await this.loadLogs();
  }

  dateRangeValue = computed(() => ({
    start: this.filterStartDate(),
    end: this.filterEndDate()
  }));

  async onDateRangeChange(range: { start: string; end: string }) {
    const newStart = range?.start || '';
    const newEnd = range?.end || '';
    if (newStart === this.filterStartDate() && newEnd === this.filterEndDate()) {
      return;
    }
    this.filterStartDate.set(newStart);
    this.filterEndDate.set(newEnd);
    this.logsPage.set(1);
    await this.loadLogs();
  }


  async viewTenantActivity(tenant: Tenant) {
    this.filterPrestamistaId.set(tenant.id);
    this.activeTab.set('logs');
    this.logsPage.set(1);
    await this.loadLogs();
  }

  async onFilterPrestamistaIdChange(val: string) {
    this.filterPrestamistaId.set(val);
    this.logsPage.set(1);
    await this.loadLogs();
  }

  async clearLogsFilters() {
    this.filterTipoEvento.set('');
    this.filterStartDate.set('');
    this.filterEndDate.set('');
    this.filterPrestamistaId.set('');
    this.logsPage.set(1);
    await this.loadLogs();
  }

  async changeLogsPage(page: number) {
    if (page < 1 || page > this.logsTotalPages()) return;
    this.logsPage.set(page);
    await this.loadLogs();
  }

  getPlanPrice(plan?: string): number {
    if (!plan) return 0;
    const config = this.planConfigs().find(c => c.plan === plan);
    return config ? config.precioMensual : 0;
  }

  getPromoMessage(plan: string) {
    const configs = this.planConfigs();
    const plata = configs.find(c => c.plan === 'PLATA');
    const oro = configs.find(c => c.plan === 'ORO');
    const platino = configs.find(c => c.plan === 'PLATINO');
    const diamante = configs.find(c => c.plan === 'DIAMANTE');

    if (plan === 'BRONCE') {
      const price = plata ? plata.precioMensual : 7500;
      const clientes = plata ? plata.maxClientes : 20;
      const cobradores = plata ? plata.maxCobradores : 1;
      return `Pásate a PLATA por ₡${price.toLocaleString()} y obtén hasta ${clientes} clientes y ${cobradores} cobrador${cobradores > 1 ? 'es' : ''}.`;
    }
    if (plan === 'PLATA') {
      const price = oro ? oro.precioMensual : 10000;
      const clientes = oro ? oro.maxClientes : 35;
      const cobradores = oro ? oro.maxCobradores : 2;
      return `Pásate a ORO por ₡${price.toLocaleString()} y obtén hasta ${clientes} clientes y ${cobradores} cobrador${cobradores > 1 ? 'es' : ''}.`;
    }
    if (plan === 'ORO') {
      const price = platino ? platino.precioMensual : 20000;
      const clientes = platino ? platino.maxClientes : 50;
      const cobradores = platino ? platino.maxCobradores : 5;
      return `Pásate a PLATINO por ₡${price.toLocaleString()} y obtén hasta ${clientes} clientes y ${cobradores} cobrador${cobradores > 1 ? 'es' : ''}.`;
    }
    if (plan === 'PLATINO') {
      const price = diamante ? diamante.precioMensual : 30000;
      return `Pásate a DIAMANTE por ₡${price.toLocaleString()} y maneja clientes ilimitados.`;
    }
    return "¡Gracias por ser cliente DIAMANTE!";
  }

  getTenantCount(filterKey: string): number {
    const list = this.tenants();
    if (filterKey === 'TODO') return list.length;
    if (filterKey === 'ACTIVO') return list.filter(t => !t.suspendido && !this.isPaymentOverdue(t) && (!t.isTrial || !!t.paymentDate)).length;
    if (filterKey === 'POR_VENCER') return list.filter(t => !t.suspendido && this.isExpiringSoon(t)).length;
    if (filterKey === 'VENCIDO') return list.filter(t => !t.suspendido && this.isPaymentOverdue(t)).length;
    if (filterKey === 'SUSPENDIDO') return list.filter(t => t.suspendido).length;
    if (filterKey === 'TRIAL') {
      return list.filter(t => !t.suspendido && !!t.isTrial && !t.paymentDate).length;
    }
    return 0;
  }

  filteredTenants(): Tenant[] {
    const term = this.searchTerm.toLowerCase();
    let list = this.tenants();

    const sf = this.activeSubFilter();
    if (sf === 'ACTIVO') {
      list = list.filter(t => !t.suspendido && !this.isPaymentOverdue(t) && (!t.isTrial || !!t.paymentDate));
    } else if (sf === 'POR_VENCER') {
      list = list.filter(t => !t.suspendido && this.isExpiringSoon(t));
    } else if (sf === 'VENCIDO') {
      list = list.filter(t => !t.suspendido && this.isPaymentOverdue(t));
    } else if (sf === 'SUSPENDIDO') {
      list = list.filter(t => t.suspendido);
    } else if (sf === 'TRIAL') {
      list = list.filter(t => !t.suspendido && !!t.isTrial && !t.paymentDate);
    }

    if (!term) return list;
    return list.filter(t =>
      t.nombre.toLowerCase().includes(term) ||
      t.username.toLowerCase().includes(term) ||
      (t.email && t.email.toLowerCase().includes(term)) ||
      t.telefono.includes(term)
    );
  }

  async extendTrial(tenant: Tenant, days: number = 7) {
    try {
      const newFechaFin = await this.adminService.extendTrial(tenant.id, days);
      this.toastService.success(`Período de prueba de ${tenant.nombre} extendido por ${days} días.`);
      tenant.fechaPruebaFin = newFechaFin;
      tenant.isTrial = true;
      await this.loadData();
    } catch (err: any) {
      this.toastService.error('Error al extender prueba');
    }
  }

  async onTrialDateChanged(tenant: Tenant, newDate: string) {
    if (!newDate) return;
    try {
      const newFechaFin = await this.adminService.extendTrial(tenant.id, { targetDate: newDate });
      this.toastService.success(`Fin de prueba de ${tenant.nombre} actualizado al ${newDate}.`);
      tenant.fechaPruebaFin = newFechaFin;
      tenant.isTrial = true;
      await this.loadData();
    } catch (err: any) {
      this.toastService.error('Error al actualizar fecha de prueba');
    }
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


  isExpiringSoon(tenant: Tenant): boolean {
    const expiry = this.getEffectiveExpiryDate(tenant).getTime();
    const now = new Date().getTime();
    const daysLeft = (expiry - now) / (1000 * 60 * 60 * 24);
    return daysLeft > 0 && daysLeft <= 7;
  }

  getDaysLeft(tenant: Tenant): number {
    const expiry = this.getEffectiveExpiryDate(tenant).getTime();
    const now = new Date().getTime();
    return Math.max(0, Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)));
  }

  getEffectiveExpiryDate(tenant: Tenant): Date {
    const dateStr = tenant.paymentDate || tenant.fechaPruebaFin;
    if (!dateStr) {
      const base = tenant.createdAt ? new Date(tenant.createdAt) : new Date();
      const fallback = new Date(base);
      fallback.setMonth(fallback.getMonth() + 1);
      return fallback;
    }
    return new Date(dateStr);
  }

  isPaymentOverdue(tenant: Tenant): boolean {
    const expiry = this.getEffectiveExpiryDate(tenant).getTime();
    const now = new Date().getTime();
    return expiry < now;
  }

  getPaymentDateDisplay(tenant: Tenant): string {
    const expiry = this.getEffectiveExpiryDate(tenant);
    return expiry.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  canRenew(tenant: Tenant): boolean {
    const expiry = this.getEffectiveExpiryDate(tenant).getTime();
    const now = new Date().getTime();
    const daysLeft = (expiry - now) / (1000 * 60 * 60 * 24);
    return daysLeft <= 7;
  }

  async renewTenant(tenant: Tenant) {
    let currentBase = new Date();
    const expiry = this.getEffectiveExpiryDate(tenant);
    if (expiry.getTime() > currentBase.getTime()) {
      currentBase = expiry;
    }
    const newDate = new Date(currentBase);
    newDate.setMonth(newDate.getMonth() + 1);

    try {
      const updatedDate = await this.adminService.updatePaymentDate(tenant.id, newDate.toISOString());
      this.tenants.update(curr => curr.map(t => t.id === tenant.id ? { ...t, paymentDate: updatedDate || undefined } : t));
      this.toastService.success(`Suscripción de @${tenant.username} renovada por 1 mes`);
    } catch (err) {
      this.toastService.error('Error al renovar la suscripción');
    }
  }

  getReminderPaymentDate(tenant: Tenant | null): string {
    if (!tenant) return 'N/A';
    const expiry = this.getEffectiveExpiryDate(tenant);
    return expiry.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  formatWhatsappNumber(phone: string): string {
    let clean = phone.replace(/\D/g, '');
    if (clean.length === 8) {
      clean = '506' + clean;
    }
    return clean;
  }

  togglePhoneDropdown(id: string, event: Event) {
    event.stopPropagation();
    this.activePhoneDropdown.set(this.activePhoneDropdown() === id ? null : id);
  }

  async sharePaymentReminder(tenant: Tenant) {
    this.selectedTenantForReminder.set(tenant);
    this.activePhoneDropdown.set(null);
    this.isGeneratingImage.set(true);

    setTimeout(async () => {
      const element = document.getElementById('reminder-card');
      if (!element) {
        this.isGeneratingImage.set(false);
        return;
      }

      try {
        const canvas = await html2canvas(element, { backgroundColor: '#121212', scale: 2 });
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

            const isExpiring = this.isExpiringSoon(tenant);
            const cleanPhone = this.formatWhatsappNumber(tenant.telefono);
            let text = `Hola ${tenant.nombre}, te saludamos de CAT-LOAN. Adjuntamos tu estado de suscripción: ${imageUrl}`;

            if (isExpiring) {
              const expiry = this.getEffectiveExpiryDate(tenant);
              const date = expiry.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
              text = `Hola ${tenant.nombre}, te recordamos que tu plan ${tenant.plan} en CAT-LOAN expira el próximo ${date}. Adjuntamos tu recordatorio de renovación: ${imageUrl}`;
            }

            const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
            if (navigator.share && navigator.canShare && navigator.canShare({ url: whatsappUrl })) {
              try {
                await navigator.share({
                  title: `Recordatorio a ${tenant.nombre}`,
                  text: text,
                  url: whatsappUrl
                });
                this.toastService.success('Recordatorio compartido');
              } catch (err) {
                window.open(whatsappUrl, '_blank');
                this.toastService.success('Recordatorio enviado a WhatsApp');
              }
            } else {
              window.open(whatsappUrl, '_blank');
              this.toastService.success('Recordatorio enviado a WhatsApp');
            }
          } catch (uploadErr) {
            this.fallbackClipboard(blob, tenant);
          }
        }, 'image/png');
      } catch (err) {
        this.toastService.error('Error al generar la imagen');
      } finally {
        this.isGeneratingImage.set(false);
        setTimeout(() => this.selectedTenantForReminder.set(null), 500);
      }
    }, 100);
  }

  async fallbackClipboard(blob: Blob, tenant: Tenant) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      this.toastService.success('Imagen copiada al portapapeles. Pégala en WhatsApp.');
      window.open(this.getWhatsappLink(tenant, true), '_blank');
    } catch (e) {
      this.toastService.error('No se pudo copiar la imagen al portapapeles');
    }
  }

async shareCustomMessage(tenant: Tenant, event: Event) {
    event.stopPropagation();
    this.activePhoneDropdown.set(null);
    const cleanPhone = this.formatWhatsappNumber(tenant.telefono);
    const whatsappUrl = `https://wa.me/${cleanPhone}`;
    
    if (navigator.share && navigator.canShare && navigator.canShare({ url: whatsappUrl })) {
      try {
        await navigator.share({
          title: `Mensaje a ${tenant.nombre}`,
          url: whatsappUrl
        });
      } catch (err) {
        window.open(whatsappUrl, '_blank');
      }
    } else {
      window.open(whatsappUrl, '_blank');
    }
  }

  getWhatsappLink(tenant: Tenant, skipText = false): string {
    const isExpiring = this.isExpiringSoon(tenant);
    const cleanPhone = this.formatWhatsappNumber(tenant.telefono);
    if (skipText) return `https://wa.me/${cleanPhone}`;

    let text = `Hola ${tenant.nombre}, te saludamos de CAT-LOAN.`;

    if (isExpiring) {
      const expiry = this.getEffectiveExpiryDate(tenant);
      const date = expiry.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
      text = `Hola ${tenant.nombre}, te recordamos que tu plan ${tenant.plan} en CAT-LOAN expira el próximo ${date}. Por favor, renueva tu suscripción pronto para evitar interrupciones.`;
    }

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  }

  async createTenant(e: Event) {
    e.preventDefault();
    if (!this.newTenant.nombre || !this.newTenant.username || !this.newTenant.password) return;
    this.newTenant.username = this.newTenant.username.trim().toLowerCase();

    this.loading.set(true);
    try {
      await this.adminService.createTenant(this.newTenant);
      this.toastService.success('Prestamista creado exitosamente');
      this.newTenant = { nombre: '', username: '', password: '', email: '', telefono: '+506 ', plan: 'BRONCE' };
      this.activeTab.set('tenants');
      await this.loadData();
    } catch (err: any) {
      this.toastService.error(err.error?.error || 'Error al crear prestamista');
    } finally {
      this.loading.set(false);
    }
  }

  toggleSuspend(tenant: Tenant) {
    const isSuspending = !tenant.suspendido;
    this.confirmModalConfig.set({
      title: isSuspending ? 'Suspender Cliente' : 'Activar Cliente',
      message: `¿Seguro que deseas ${isSuspending ? 'suspender' : 'activar'} la cuenta de @${tenant.username}?`,
      danger: isSuspending,
      action: async () => {
        try {
          const nuevoEstado = await this.adminService.toggleSuspend(tenant.id);
          this.tenants.update(curr => curr.map(t => t.id === tenant.id ? { ...t, suspendido: nuevoEstado } : t));
          this.toastService.success(`Cliente ${nuevoEstado ? 'suspendido' : 'activado'}`);
        } catch (err) {
          this.toastService.error('Error al cambiar estado');
        }
      }
    });
  }

  async changePlan(id: string, plan: string) {
    try {
      const newPlan = await this.adminService.changePlan(id, plan);
      this.tenants.update(curr => curr.map(t => t.id === id ? { ...t, plan: newPlan as any } : t));
      this.toastService.success(`Plan actualizado a ${newPlan}`);
    } catch (err) {
      this.toastService.error('Error al cambiar plan');
    }
  }

  toggleSettingsSection(section: 'plans' | 'saasGlobal' | 'password') {
    if (section === 'plans') this.expandedPlansConfigs.update(v => !v);
    if (section === 'saasGlobal') this.expandedSaasGlobalConfigs.update(v => !v);
    if (section === 'password') this.expandedChangePassword.update(v => !v);
  }

  setOriginalPlans(plans: SaaSPlanConfig[]) {
    const map: Record<string, SaaSPlanConfig> = {};
    plans.forEach(p => {
      map[p.plan] = { ...p };
    });
    this.originalPlanConfigs.set(map);
  }

  isSaasConfigChanged(): boolean {
    return (
      this.saasGlobalConfig.defaultTrialDays !== this.originalSaasGlobalConfig.defaultTrialDays ||
      this.saasGlobalConfig.supportWhatsappNumber !== this.originalSaasGlobalConfig.supportWhatsappNumber ||
      this.saasGlobalConfig.graceDays !== this.originalSaasGlobalConfig.graceDays
    );
  }

  isPlanConfigChanged(config: SaaSPlanConfig): boolean {
    const original = this.originalPlanConfigs()[config.plan];
    if (!original) return false;
    return (
      config.maxClientes !== original.maxClientes ||
      config.maxCobradores !== original.maxCobradores ||
      config.precioMensual !== original.precioMensual
    );
  }

  savingPlan(plan: string): boolean {
    return !!this.savingPlanState()[plan];
  }

  async saveSaasGlobalConfig() {
    this.savingSaasConfig.set(true);
    try {
      const updated = await this.adminService.updateSaasConfig(this.saasGlobalConfig);
      this.saasGlobalConfig = { ...updated };
      this.originalSaasGlobalConfig = { ...updated };
      this.toastService.success('Configuración guardada exitosamente');
    } catch (err: any) {
      this.toastService.error('Error al guardar configuración');
    } finally {
      this.savingSaasConfig.set(false);
    }
  }

  async savePlanConfig(config: SaaSPlanConfig) {
    this.savingPlanState.update(curr => ({ ...curr, [config.plan]: true }));
    try {
      const updated = await this.adminService.updatePlanConfig(config);
      this.toastService.success(`Plan ${config.plan} actualizado`);
      this.planConfigs.update(curr => curr.map(c => c.plan === config.plan ? { ...updated } : c));
      this.originalPlanConfigs.update(curr => ({ ...curr, [config.plan]: { ...updated } }));
    } catch (err) {
      this.toastService.error(`Error actualizando plan ${config.plan}`);
    } finally {
      this.savingPlanState.update(curr => ({ ...curr, [config.plan]: false }));
    }
  }

  impersonate(tenant: Tenant) {
    this.confirmModalConfig.set({
      title: 'Suplantar Identidad',
      message: `Vas a ingresar al panel de @${tenant.username} con sus privilegios. Las acciones quedarán registradas bajo tu autoría.`,
      action: async () => {
        try {
          await this.adminService.impersonate(tenant.id);
        } catch (err) {
          this.toastService.error('No se pudo suplantar la identidad');
        }
      }
    });
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

  logout() {
    this.loanService.logout();
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, Tenant, SaaSStats, SaaSLog, SaaSPlanConfig } from '../services/admin.service';
import { ToastService } from '../services/toast.service';
import { LoanService } from '../services/loan.service';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-industrial-black text-industrial-light pb-24 font-sans select-none">
      
      <!-- Header -->
      <header class="border-b border-industrial-border px-5 py-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md bg-opacity-95" style="background-color: #111111;">
        <div class="flex items-center gap-2.5">
          <img src="/assets/images/logo-header.webp" class="h-8 w-auto object-contain" alt="Cat-Loan Logo">
          <div>
            <h1 class="text-sm font-black text-white leading-none tracking-tight uppercase">PANEL DE CONTROL</h1>
            <p class="text-[9px] text-caterpillar uppercase tracking-wider font-mono mt-0.5">CAT-LOAN SAAS ADMIN</p>
          </div>
        </div>

        <div class="flex gap-2">
          <button (click)="showPlanModal.set(true)" class="bg-industrial-surface border border-industrial-border px-3 py-1.5 rounded-lg text-white hover:border-caterpillar text-[10px] font-bold uppercase transition">
            Configurar Planes
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
        
        <!-- Stats Row -->
        <section class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6" *ngIf="stats()">
          <div class="bg-industrial-dark border border-industrial-border p-3.5 rounded-xl">
            <span class="text-[9px] text-industrial-muted uppercase font-mono">Prestamistas</span>
            <span class="text-xl font-black text-white block mt-1">{{ stats()?.totalPrestamistas }}</span>
          </div>
          <div class="bg-industrial-dark border border-industrial-border p-3.5 rounded-xl">
            <span class="text-[9px] text-industrial-muted uppercase font-mono">Cobradores</span>
            <span class="text-xl font-black text-white block mt-1">{{ stats()?.totalCobradores }}</span>
          </div>
          <div class="bg-industrial-dark border border-industrial-border p-3.5 rounded-xl">
            <span class="text-[9px] text-industrial-muted uppercase font-mono">Volumen SaaS</span>
            <span class="text-xl font-black text-caterpillar block mt-1">₡{{ stats()?.volumenTransaccional | number:'1.0-0' }}</span>
          </div>
          <div class="bg-industrial-dark border border-industrial-border p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <span class="text-[9px] text-industrial-muted uppercase font-mono">Planes</span>
              <div class="text-[10px] text-white mt-1">
                BR: {{ stats()?.planes?.bronce }} | PL: {{ stats()?.planes?.plata }} | OR: {{ stats()?.planes?.oro }} | PT: {{ stats()?.planes?.platino }} | DM: {{ stats()?.planes?.diamante }}
              </div>
            </div>
          </div>
        </section>

        <!-- Tabs -->
        <div class="flex border-b border-industrial-border mb-6">
          <button (click)="activeTab.set('tenants')" [class.text-caterpillar]="activeTab() === 'tenants'" [class.border-caterpillar]="activeTab() === 'tenants'" class="px-4 py-2 text-xs font-bold uppercase border-b-2 border-transparent text-industrial-muted hover:text-white transition">Prestamistas</button>
          <button (click)="activeTab.set('create')" [class.text-caterpillar]="activeTab() === 'create'" [class.border-caterpillar]="activeTab() === 'create'" class="px-4 py-2 text-xs font-bold uppercase border-b-2 border-transparent text-industrial-muted hover:text-white transition">Nuevo Cliente</button>
          <button (click)="activeTab.set('logs')" [class.text-caterpillar]="activeTab() === 'logs'" [class.border-caterpillar]="activeTab() === 'logs'" class="px-4 py-2 text-xs font-bold uppercase border-b-2 border-transparent text-industrial-muted hover:text-white transition">Auditoría</button>
        </div>

        <!-- Tenants Tab -->
        <section *ngIf="activeTab() === 'tenants'" class="space-y-4">
          <div class="relative mb-4">
            <input type="text" [(ngModel)]="searchTerm" placeholder="Buscar prestamista..." class="w-full bg-industrial-surface border border-industrial-border rounded-xl p-3.5 pl-10 text-white text-xs focus:outline-none focus:border-caterpillar">
          </div>

          <div *ngFor="let tenant of filteredTenants()" class="bg-industrial-dark border border-industrial-border rounded-xl p-4 transition hover:border-caterpillar/30">
            <div class="flex flex-col gap-3 mb-4 pb-4 border-b border-industrial-border/50">
              <div class="flex justify-between items-start">
                <div class="flex-[2]">
                  <h3 class="font-extrabold text-white text-sm">
                    {{ tenant.nombre }} 
                    <span class="text-[10px] text-caterpillar ml-2">&#64;{{ tenant.username }}</span>
                  </h3>
                  <div class="text-[11px] text-industrial-muted font-mono mt-1 flex items-center gap-2 relative">
                    <button (click)="togglePhoneDropdown(tenant.id)" class="hover:text-semantic-emerald flex items-center gap-1 transition focus:outline-none">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                      {{ tenant.telefono }}
                    </button>
                    <!-- Dropdown Phone Options -->
                    <div *ngIf="activePhoneDropdown() === tenant.id" class="absolute top-full left-0 mt-1 w-56 bg-industrial-surface border border-industrial-border rounded shadow-lg z-50 py-1 flex flex-col">
                      <button (click)="sharePaymentReminder(tenant)" class="text-left px-3 py-2 text-[10px] text-white hover:bg-industrial-dark transition flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-caterpillar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        Enviar Recordatorio (Imagen)
                      </button>
                      <a [href]="getWhatsappLink(tenant)" target="_blank" (click)="activePhoneDropdown.set(null)" class="text-left px-3 py-2 text-[10px] text-white hover:bg-industrial-dark transition flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-industrial-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                        Mensaje Personalizado
                      </a>
                    </div>

                    <span *ngIf="tenant.email" class="ml-2">| {{ tenant.email }}</span>
                    <span *ngIf="isExpiringSoon(tenant.fechaPruebaFin)" class="text-[9px] bg-semantic-red/20 text-semantic-red px-1.5 py-0.5 rounded border border-semantic-red/30 animate-pulse ml-2">
                      ¡Vence en {{ getDaysLeft(tenant.fechaPruebaFin) }} días!
                    </span>
                  </div>
                </div>

                <div class="flex gap-6 px-4 items-start flex-[1.5] justify-center border-x border-industrial-border/30">
                  <div class="flex flex-col items-center text-center">
                    <span class="text-[9px] text-industrial-muted uppercase font-mono mb-1">Clientes Activos</span>
                    <span class="text-sm font-black text-white leading-none">{{ tenant._count?.loans || 0 }}</span>
                  </div>
                  <div class="flex flex-col items-center text-center">
                    <span class="text-[9px] text-industrial-muted uppercase font-mono mb-1">Cobradores</span>
                    <span class="text-sm font-black text-white leading-none">{{ tenant._count?.cobradores || 0 }}</span>
                  </div>
                </div>

                <div class="text-right flex-[1] flex justify-end">
                  <span [class]="tenant.suspendido ? 'bg-semantic-red/10 text-semantic-red border-semantic-red/30' : 'bg-semantic-emerald/10 text-semantic-emerald border-semantic-emerald/30'" class="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border">
                    {{ tenant.suspendido ? 'SUSPENDIDO' : 'ACTIVO' }}
                  </span>
                </div>
              </div>

              <!-- Cobradores list -->
              <div *ngIf="tenant.cobradores?.length" class="flex flex-wrap gap-2 w-full mt-1">
                <div *ngFor="let cob of tenant.cobradores" class="text-[9px] text-industrial-muted bg-industrial-surface px-2 py-1 rounded border border-industrial-border">
                  <span class="font-bold text-white">&#64;{{ cob.username }}</span> ({{ cob.nombre }})
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-center mt-4">
              <div>
                <label class="block text-[9px] text-industrial-muted uppercase mb-1">Plan Actual</label>
                <select [ngModel]="tenant.plan" (ngModelChange)="changePlan(tenant.id, $event)" class="bg-industrial-surface border border-industrial-border text-white text-xs rounded p-2 w-full focus:outline-none">
                  <option *ngFor="let conf of planConfigs()" [value]="conf.plan">{{ conf.plan }}</option>
                </select>
              </div>
              
              <div class="flex gap-2 md:col-span-2 justify-end items-end h-full mt-2 md:mt-0">
                <button (click)="toggleSuspend(tenant)" class="flex-1 md:flex-none bg-industrial-surface border border-industrial-border text-xs py-2 px-4 rounded text-white hover:border-caterpillar transition">
                  {{ tenant.suspendido ? 'Activar' : 'Suspender' }}
                </button>
                <button (click)="impersonate(tenant)" class="flex-1 md:flex-none bg-caterpillar text-industrial-black font-black text-xs py-2 px-4 rounded uppercase shadow hover:bg-caterpillar-dark transition">
                  Ingresar Como
                </button>
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
                <input type="text" [(ngModel)]="newTenant.username" name="username" required class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:border-caterpillar">
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
                <select [(ngModel)]="newTenant.plan" name="plan" class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:border-caterpillar">
                  <option *ngFor="let conf of planConfigs()" [value]="conf.plan">{{ conf.plan }}</option>
                </select>
              </div>
            </div>
            <button type="submit" [disabled]="loading()" class="w-full bg-caterpillar text-industrial-black font-black uppercase text-xs py-3.5 rounded-lg mt-4 hover:bg-caterpillar-dark transition">
              {{ loading() ? 'Creando...' : 'Crear Prestamista' }}
            </button>
          </form>
        </section>

        <!-- Logs Tab -->
        <section *ngIf="activeTab() === 'logs'" class="space-y-3">
          <div *ngFor="let log of logs()" class="bg-industrial-surface border border-industrial-border rounded-lg p-3 text-xs">
            <div class="flex justify-between items-start mb-1">
              <span class="font-bold text-white">{{ log.tipoEvento }}</span>
              <span class="text-[10px] text-industrial-muted font-mono">{{ log.fecha | date:'dd/MM HH:mm:ss' }}</span>
            </div>
            <p class="text-industrial-muted">{{ log.descripcion }}</p>
            <div class="mt-1 flex gap-3 text-[9px] text-industrial-muted font-mono opacity-70">
              <span>IP: {{ log.ip }}</span>
              <span *ngIf="log.prestamistaId">Cliente ID: {{ log.prestamistaId }}</span>
            </div>
          </div>
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

      <!-- Plan Config Modal -->
      <div *ngIf="showPlanModal()" class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
        <div class="bg-industrial-dark border border-industrial-border rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-white font-black uppercase tracking-tight text-lg">Configuración de Planes</h3>
            <button (click)="showPlanModal.set(false)" class="text-industrial-muted hover:text-white focus:outline-none">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          <div class="space-y-6">
            <div *ngFor="let config of planConfigs()" class="bg-industrial-surface border border-industrial-border p-4 rounded-lg">
              <div class="flex justify-between items-center mb-4 border-b border-industrial-border pb-2">
                <h4 class="text-caterpillar font-black text-lg">{{ config.plan }}</h4>
                <button (click)="savePlanConfig(config)" class="bg-caterpillar text-industrial-black px-3 py-1.5 rounded text-[10px] uppercase font-bold hover:bg-caterpillar-dark transition">
                  Guardar
                </button>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label class="block text-[10px] text-industrial-muted uppercase font-mono mb-1">Máx Clientes</label>
                  <input type="number" [(ngModel)]="config.maxClientes" class="w-full bg-industrial-dark border border-industrial-border rounded p-2 text-white text-sm focus:border-caterpillar outline-none">
                  <span class="text-[8px] text-industrial-muted mt-0.5 block">(-1 para ilimitado)</span>
                </div>
                <div>
                  <label class="block text-[10px] text-industrial-muted uppercase font-mono mb-1">Máx Cobradores</label>
                  <input type="number" [(ngModel)]="config.maxCobradores" class="w-full bg-industrial-dark border border-industrial-border rounded p-2 text-white text-sm focus:border-caterpillar outline-none">
                </div>
                <div>
                  <label class="block text-[10px] text-industrial-muted uppercase font-mono mb-1">Precio Mensual (₡)</label>
                  <input type="number" [(ngModel)]="config.precioMensual" class="w-full bg-industrial-dark border border-industrial-border rounded p-2 text-white text-sm focus:border-caterpillar outline-none">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Hidden DOM Element for Image Generation -->
      <div *ngIf="selectedTenantForReminder()" class="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none w-[400px]">
        <div id="reminder-card" class="bg-industrial-dark border border-industrial-border p-6 font-sans">
          <div class="flex justify-between items-start mb-6 border-b border-industrial-border pb-4">
            <div>
              <img src="/assets/images/logo-header.webp" class="h-8 w-auto mb-2 opacity-90" alt="Cat-Loan">
              <h2 class="text-white font-black uppercase text-lg leading-tight tracking-tight">Estado de Suscripción</h2>
              <p class="text-[10px] text-industrial-muted font-mono uppercase tracking-wider">CAT-LOAN SAAS</p>
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
                <p class="text-sm text-white font-bold">{{ selectedTenantForReminder()?.fechaPruebaFin ? (selectedTenantForReminder()?.fechaPruebaFin | date:'dd/MM/yyyy') : 'N/A' }}</p>
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

    </div>
  `
})
export class AdminComponent implements OnInit {
  adminService = inject(AdminService);
  loanService = inject(LoanService);
  toastService = inject(ToastService);

  activeTab = signal<'tenants' | 'create' | 'logs'>('tenants');
  
  tenants = signal<Tenant[]>([]);
  stats = signal<SaaSStats | null>(null);
  logs = signal<SaaSLog[]>([]);
  planConfigs = signal<SaaSPlanConfig[]>([]);
  
  searchTerm = '';
  loading = signal(false);

  showPlanModal = signal(false);
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
    this.loadData();
  }

  async loadData() {
    try {
      const [t, s, l, p] = await Promise.all([
        this.adminService.getTenants(),
        this.adminService.getStats(),
        this.adminService.getLogs(),
        this.adminService.getPlanConfigs()
      ]);
      this.tenants.set(t);
      this.stats.set(s);
      this.logs.set(l);
      this.planConfigs.set(p);
    } catch (err) {
      this.toastService.error('Error al cargar datos del SaaS');
    }
  }

  getPlanPrice(plan?: string): number {
    if (!plan) return 0;
    const config = this.planConfigs().find(c => c.plan === plan);
    return config ? config.precioMensual : 0;
  }

  getPromoMessage(plan: string) {
    if (plan === 'BRONCE') return "Pásate a PLATA por ₡7,500 y obtén hasta 20 clientes y 1 cobrador.";
    if (plan === 'PLATA') return "Pásate a ORO por ₡10,000 y obtén hasta 35 clientes y 2 cobradores.";
    if (plan === 'ORO') return "Pásate a PLATINO por ₡20,000 y obtén hasta 50 clientes y 5 cobradores.";
    if (plan === 'PLATINO') return "Pásate a DIAMANTE por ₡30,000 y maneja clientes ilimitados.";
    return "¡Gracias por ser cliente DIAMANTE!";
  }

  filteredTenants(): Tenant[] {
    const term = this.searchTerm.toLowerCase();
    if (!term) return this.tenants();
    return this.tenants().filter(t => 
      t.nombre.toLowerCase().includes(term) || 
      t.username.toLowerCase().includes(term) ||
      (t.email && t.email.toLowerCase().includes(term)) ||
      t.telefono.includes(term)
    );
  }

  isExpiringSoon(fechaPruebaFin?: string): boolean {
    if (!fechaPruebaFin) return false;
    const expiry = new Date(fechaPruebaFin).getTime();
    const now = new Date().getTime();
    const daysLeft = (expiry - now) / (1000 * 60 * 60 * 24);
    return daysLeft > 0 && daysLeft <= 7;
  }

  getDaysLeft(fechaPruebaFin?: string): number {
    if (!fechaPruebaFin) return 0;
    const expiry = new Date(fechaPruebaFin).getTime();
    const now = new Date().getTime();
    return Math.max(0, Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)));
  }

  togglePhoneDropdown(id: string) {
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

          const file = new File([blob], `Recordatorio_${tenant.nombre}.png`, { type: 'image/png' });
          const text = `Hola ${tenant.nombre}, te adjuntamos el recordatorio de tu suscripción a CAT-LOAN.`;

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({ files: [file], title: 'Recordatorio de Pago', text });
            } catch (shareErr) {
              this.fallbackClipboard(blob, tenant);
            }
          } else {
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

  getWhatsappLink(tenant: Tenant, skipText = false): string {
    const isExpiring = this.isExpiringSoon(tenant.fechaPruebaFin);
    const cleanPhone = tenant.telefono.replace(/\D/g, '');
    if (skipText) return `https://wa.me/${cleanPhone}`;
    
    let text = `Hola ${tenant.nombre}, te saludamos de CAT-LOAN.`;
    
    if (isExpiring && tenant.fechaPruebaFin) {
      const date = new Date(tenant.fechaPruebaFin).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
      text = `Hola ${tenant.nombre}, te recordamos que tu plan ${tenant.plan} en CAT-LOAN expira el próximo ${date}. Por favor, renueva tu suscripción pronto para evitar interrupciones.`;
    }

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  }

  async createTenant(e: Event) {
    e.preventDefault();
    if (!this.newTenant.nombre || !this.newTenant.username || !this.newTenant.password) return;
    
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

  async savePlanConfig(config: SaaSPlanConfig) {
    try {
      const updated = await this.adminService.updatePlanConfig(config);
      this.toastService.success(`Plan ${config.plan} actualizado`);
      this.planConfigs.update(curr => curr.map(c => c.plan === config.plan ? updated : c));
    } catch (err) {
      this.toastService.error(`Error actualizando plan ${config.plan}`);
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

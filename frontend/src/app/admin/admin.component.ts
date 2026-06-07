import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, Tenant, SaaSStats, SaaSLog } from '../services/admin.service';
import { ToastService } from '../services/toast.service';
import { LoanService } from '../services/loan.service';

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

        <button (click)="logout()" class="bg-industrial-surface border border-industrial-border p-2 rounded-lg text-industrial-muted hover:text-semantic-red transition duration-150">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
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
            <div class="flex justify-between items-start mb-3">
              <div>
                <h3 class="font-extrabold text-white text-sm">{{ tenant.nombre }} <span class="text-[10px] text-caterpillar ml-2">&#64;{{ tenant.username }}</span></h3>
                <span class="text-[11px] text-industrial-muted font-mono block mt-1">{{ tenant.telefono }} {{ tenant.email ? '| ' + tenant.email : '' }}</span>
              </div>
              <div class="text-right">
                <span [class]="tenant.suspendido ? 'bg-semantic-red/10 text-semantic-red border-semantic-red/30' : 'bg-semantic-emerald/10 text-semantic-emerald border-semantic-emerald/30'" class="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border">
                  {{ tenant.suspendido ? 'SUSPENDIDO' : 'ACTIVO' }}
                </span>
              </div>
            </div>

            <!-- Stats & Cobradores info -->
            <div class="my-3 py-3 border-y border-industrial-border/50 grid grid-cols-2 gap-4">
              <div>
                <span class="text-[9px] text-industrial-muted uppercase font-mono block mb-1">Clientes Activos</span>
                <span class="text-sm font-black text-white">{{ tenant._count?.loans || 0 }}</span>
              </div>
              <div>
                <span class="text-[9px] text-industrial-muted uppercase font-mono block mb-1">Equipo (Cobradores: {{ tenant._count?.cobradores || 0 }})</span>
                <div *ngIf="tenant.cobradores?.length; else noCobradores" class="flex flex-col gap-1 mt-1">
                  <div *ngFor="let cob of tenant.cobradores" class="text-[10px] text-industrial-muted bg-industrial-surface p-1.5 rounded border border-industrial-border">
                    <span class="font-bold text-white">&#64;{{ cob.username }}</span><br>
                    {{ cob.nombre }} | {{ cob.telefono }}
                  </div>
                </div>
                <ng-template #noCobradores>
                  <span class="text-[10px] text-industrial-muted italic mt-1 block">Sin cobradores asignados</span>
                </ng-template>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-center mt-4">
              <div>
                <label class="block text-[9px] text-industrial-muted uppercase mb-1">Plan Actual</label>
                <select [ngModel]="tenant.plan" (ngModelChange)="changePlan(tenant.id, $event)" class="bg-industrial-surface border border-industrial-border text-white text-xs rounded p-2 w-full focus:outline-none">
                  <option value="BRONCE">BRONCE (10 Clientes)</option>
                  <option value="PLATA">PLATA (20 Clientes)</option>
                  <option value="ORO">ORO (35 Clientes)</option>
                  <option value="PLATINO">PLATINO (50 Clientes)</option>
                  <option value="DIAMANTE">DIAMANTE (Ilimitado)</option>
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
                  <option value="BRONCE">BRONCE</option>
                  <option value="PLATA">PLATA</option>
                  <option value="ORO">ORO</option>
                  <option value="PLATINO">PLATINO</option>
                  <option value="DIAMANTE">DIAMANTE</option>
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
              <span *ngIf="log.prestamistaId">Tenant: {{ log.prestamistaId }}</span>
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
  
  searchTerm = '';
  loading = signal(false);

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
      const [t, s, l] = await Promise.all([
        this.adminService.getTenants(),
        this.adminService.getStats(),
        this.adminService.getLogs()
      ]);
      this.tenants.set(t);
      this.stats.set(s);
      this.logs.set(l);
    } catch (err) {
      this.toastService.error('Error al cargar datos del SaaS');
    }
  }

  filteredTenants(): Tenant[] {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) return this.tenants();

    return this.tenants().filter(t => 
      t.nombre.toLowerCase().includes(term) ||
      t.username.toLowerCase().includes(term) ||
      (t.email && t.email.toLowerCase().includes(term)) ||
      t.telefono.includes(term)
    );
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
          this.toastService.success(`Tenant ${nuevoEstado ? 'suspendido' : 'activado'}`);
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

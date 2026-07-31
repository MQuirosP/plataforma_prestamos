import { Component, OnInit, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoanService, Role } from '../services/loan.service';
import { AdminService } from '../services/admin.service';
import { ToastService } from '../services/toast.service';
import { formatEventType } from '../shared/audit-log-list/audit-log-list.component';

@Component({
  selector: 'app-team-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Main Content Column -->
    <main class="max-w-md md:max-w-xl mx-auto px-4 pb-24 pt-6">
      
      <div class="bg-industrial-dark border border-industrial-border rounded-2xl p-5 space-y-4 shadow-2xl relative overflow-hidden mb-6">
        <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-caterpillar via-industrial-black to-caterpillar bg-[length:30px_6px]"></div>
        
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 pb-3 border-b border-industrial-border/60">
            <div>
              <h1 class="text-lg font-bold text-white leading-tight tracking-tight uppercase">GESTIÓN DE EQUIPO</h1>
              <p class="text-[10px] text-caterpillar uppercase tracking-wider font-mono">COBRADORES Y ASIGNACIONES</p>
            </div>
            
            <div class="flex items-center gap-2">
              <button (click)="openAddModal()" 
                      class="hidden md:flex bg-caterpillar hover:bg-caterpillar-dark text-industrial-black px-3.5 py-2 rounded-lg font-bold transition duration-150 shadow-md items-center gap-1.5 text-xs whitespace-nowrap">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
                </svg>
                <span class="font-black uppercase tracking-tight">Agregar</span>
              </button>
              <button type="button" (click)="goBack.emit()"
                      class="bg-industrial-surface border border-industrial-border hover:border-caterpillar/40 text-white hover:text-caterpillar text-[10px] font-bold py-2 px-4 rounded-lg transition duration-150 uppercase tracking-wider whitespace-nowrap">
                Cerrar y volver
              </button>
            </div>
        </div>

        <!-- Header status card -->
        <div class="bg-industrial-surface border border-industrial-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <span class="text-[10px] text-industrial-muted uppercase font-mono block">Miembros en Equipo</span>
            <span *ngIf="!loadingTeam()" class="text-xl font-black text-white mt-0.5 block">{{ cobradores().length }} Cobrador(es)</span>
            <div *ngIf="loadingTeam()" class="h-6 w-24 bg-industrial-surface rounded animate-pulse mt-1"></div>
          </div>
          <div class="w-10 h-10 rounded-lg bg-caterpillar/10 border border-caterpillar/30 flex items-center justify-center text-caterpillar">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>

        <!-- Premium Skeleton Loader List (Show while loading team) -->
        <div *ngIf="loadingTeam()" class="space-y-3">
          <div *ngFor="let item of [1, 2]" class="bg-industrial-dark border border-industrial-border rounded-xl p-4 space-y-3 animate-pulse">
            <div class="flex items-center justify-between">
              <div class="space-y-2">
                <div class="h-4 w-36 bg-industrial-surface rounded-md"></div>
                <div class="h-3 w-20 bg-industrial-surface/60 rounded-md"></div>
              </div>
              <div class="h-8 w-24 bg-industrial-surface rounded-lg"></div>
            </div>
            <div class="pt-2 border-t border-industrial-border/60 flex items-center gap-2">
              <div class="h-3 w-28 bg-industrial-surface/40 rounded-md"></div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div *ngIf="!loadingTeam() && cobradores().length === 0" class="text-center py-12 bg-industrial-dark/50 border border-dashed border-industrial-border rounded-xl px-4">
          <svg class="w-12 h-12 text-industrial-muted mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
          </svg>
          <p class="text-sm font-semibold text-white">No tienes cobradores registrados</p>
          <p class="text-xs text-industrial-muted mt-1 mb-4">Agrega miembros a tu equipo para delegar el cobro de rutas en la calle.</p>
          <button (click)="openAddModal()" class="bg-caterpillar hover:bg-caterpillar-dark text-industrial-black px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-tight">
            + Agregar Primer Cobrador
          </button>
        </div>

        <!-- Cobradores List (Show when done loading) -->
        <div *ngIf="!loadingTeam()">
          <div *ngFor="let cobrador of cobradores()" class="bg-industrial-dark border border-industrial-border rounded-xl p-4 space-y-3 relative overflow-hidden transition-all duration-200 hover:border-caterpillar/30 mb-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="font-extrabold text-white text-base leading-tight">{{ cobrador.nombre }}</h3>
                    <!-- Icon button to view collector activity logs -->
                    <button (click)="openCobradorLogs(cobrador)"
                            title="Ver actividad del cobrador"
                            class="p-1 rounded-md text-industrial-muted hover:text-caterpillar hover:bg-industrial-surface border border-transparent hover:border-industrial-border transition duration-150">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </div>
                  <p class="text-xs text-caterpillar font-mono mt-0.5">&#64;{{ cobrador.username }}</p>
                </div>
              </div>

              <button (click)="impersonateCobrador(cobrador)" 
                      class="bg-caterpillar hover:bg-caterpillar-dark text-industrial-black px-3 py-2 rounded-lg text-xs font-black uppercase flex items-center gap-1.5 transition shadow-sm">
                <span>🦺 Impersonar</span>
              </button>
            </div>

            <!-- Phone linked directly to WhatsApp -->
            <div *ngIf="cobrador.telefono" class="pt-2 border-t border-industrial-border/60 flex items-center gap-2 text-xs font-mono">
              <a [href]="getWhatsappLink(cobrador.telefono)" target="_blank" 
                 class="text-industrial-muted hover:text-emerald-400 transition duration-150">
                {{ cobrador.telefono }}
              </a>
            </div>
          </div>
        </div>

      </div>

      <!-- FAB Mobile Add Button (Circular Floating Action Button) -->
      <button (click)="openAddModal()" 
              [class]="'fixed right-5 z-40 md:hidden bg-caterpillar hover:bg-caterpillar-dark text-industrial-black w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 active:scale-95 ' + 
                (loanService.currentUser()?.isImpersonating ? 'bottom-32' : 'bottom-6')"
              title="Agregar Cobrador"
              style="box-shadow: 0 4px 24px 0 rgba(255, 193, 7, 0.45);">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <!-- Modal para ACTIVIDAD DEL COBRADOR -->
      <div *ngIf="showLogsModal()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div class="bg-industrial-dark border border-industrial-border rounded-xl max-w-md w-full overflow-hidden shadow-2xl relative">
          
          <div class="h-1 bg-caterpillar"></div>

          <div class="p-5 space-y-4">
            <div class="flex items-center justify-between border-b border-industrial-border/60 pb-3">
              <div>
                <h3 class="text-base font-black text-white uppercase tracking-tight">ACTIVIDAD: {{ selectedCobradorLogs?.nombre }}</h3>
                <p class="text-[10px] text-caterpillar font-mono uppercase">&#64;{{ selectedCobradorLogs?.username }}</p>
              </div>
              <button (click)="showLogsModal.set(false)" class="text-industrial-muted hover:text-white p-1 rounded-lg transition">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <!-- Logs list -->
            <div class="max-h-80 overflow-y-auto space-y-2 pr-1">
              <!-- Activity Logs Premium Skeleton -->
              <div *ngIf="loadingLogs()" class="space-y-2">
                <div *ngFor="let item of [1, 2, 3]" class="bg-industrial-surface border border-industrial-border p-3 rounded-lg space-y-2 animate-pulse">
                  <div class="flex justify-between items-center">
                    <div class="h-3 w-20 bg-industrial-dark rounded"></div>
                    <div class="h-3 w-24 bg-industrial-dark rounded"></div>
                  </div>
                  <div class="h-3 w-3/4 bg-industrial-dark rounded"></div>
                </div>
              </div>

              <div *ngIf="!loadingLogs() && filteredLogs().length === 0" class="text-center py-8 text-xs text-industrial-muted border border-dashed border-industrial-border/60 rounded-lg">
                No hay actividades registradas para este cobrador.
              </div>

              <div *ngIf="!loadingLogs()">
                <div *ngFor="let log of filteredLogs()" class="bg-industrial-surface border border-industrial-border p-3 rounded-lg text-xs space-y-1 mb-2">
                  <div class="flex items-center justify-between text-[10px] text-industrial-muted font-mono">
                    <span class="px-1.5 py-0.5 rounded bg-caterpillar/10 text-caterpillar font-bold border border-caterpillar/20">{{ formatEventType(log.tipoEvento) }}</span>
                    <span>{{ log.fecha | date:'dd/MM/yyyy HH:mm' }}</span>
                  </div>
                  <p class="text-white font-medium text-xs leading-relaxed pt-0.5">{{ log.descripcion }}</p>
                </div>
              </div>
            </div>

            <div class="pt-2">
              <button (click)="showLogsModal.set(false)" class="w-full bg-industrial-surface border border-industrial-border hover:bg-industrial-border text-white font-bold py-2.5 px-4 rounded-lg text-xs uppercase tracking-tight transition">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal para AGREGAR NUEVO COBRADOR -->
      <div *ngIf="showAddModal()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div class="bg-industrial-dark border border-industrial-border rounded-xl max-w-md w-full overflow-hidden shadow-2xl relative">
          
          <!-- Top Caterpillar Yellow Accent Bar -->
          <div class="h-1 bg-gradient-to-r from-caterpillar via-industrial-black to-caterpillar"></div>

          <div class="p-5 space-y-4">
            <div class="flex items-center justify-between border-b border-industrial-border/60 pb-3">
              <div>
                <h3 class="text-base font-black text-white uppercase tracking-tight">CREAR NUEVO COBRADOR</h3>
                <p class="text-[10px] text-caterpillar font-mono uppercase">AGREGAR INTEGRANTE AL EQUIPO</p>
              </div>
              <button (click)="showAddModal.set(false)" class="text-industrial-muted hover:text-white p-1 rounded-lg transition">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <form (submit)="onCreateCobrador($event)" class="space-y-4 pt-1">
              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Nombre completo</label>
                <input type="text" [(ngModel)]="newCobradorData.nombre" name="nombre" required placeholder="Ej: Andrés Mora"
                       class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar">
              </div>

              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Nombre de usuario (login)</label>
                <input type="text" [(ngModel)]="newCobradorData.username" name="username" required placeholder="Ej: andres"
                       class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar">
              </div>

              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Contraseña de acceso</label>
                <input type="password" [(ngModel)]="newCobradorData.password" name="password" required placeholder="••••••••"
                       class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar">
              </div>

              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Teléfono</label>
                <input type="text" [(ngModel)]="newCobradorData.telefono" name="telefono" placeholder="+506 86746041"
                       class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar">
              </div>

              <div class="flex gap-3 pt-2">
                <button type="button" (click)="showAddModal.set(false)" 
                        class="flex-1 bg-industrial-surface border border-industrial-border hover:border-caterpillar/40 text-white hover:text-caterpillar font-bold py-3 px-4 rounded-lg text-xs uppercase tracking-tight transition">
                  Cerrar y volver
                </button>
                <button type="submit" [disabled]="loadingCobrador()" 
                        class="flex-1 bg-caterpillar hover:bg-caterpillar-dark text-industrial-black font-black py-3 px-4 rounded-lg text-xs uppercase tracking-tight transition shadow-lg disabled:opacity-50">
                  {{ loadingCobrador() ? 'Guardando...' : 'Crear Cobrador' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  `,
  styles: []
})
export class TeamManagementComponent implements OnInit {
  @Output() goBack = new EventEmitter<void>();

  formatEventType = formatEventType;
  loanService = inject(LoanService);
  adminService = inject(AdminService);
  toastService = inject(ToastService);

  cobradores = signal<any[]>([]);
  loadingTeam = signal<boolean>(true);
  showAddModal = signal<boolean>(false);
  loadingCobrador = signal<boolean>(false);

  // Activity logs modal states
  showLogsModal = signal<boolean>(false);
  loadingLogs = signal<boolean>(false);
  logs = signal<any[]>([]);
  selectedCobradorLogs: any = null;

  newCobradorData = {
    nombre: '',
    username: '',
    password: '',
    telefono: '+506 '
  };

  async ngOnInit() {
    await this.loadCobradores();
  }

  async loadCobradores() {
    this.loadingTeam.set(true);
    try {
      const list = await this.loanService.getCobradores();
      this.cobradores.set(list);
    } catch (err) {
      this.toastService.error('Error al cargar equipo de cobradores');
    } finally {
      this.loadingTeam.set(false);
    }
  }

  getWhatsappLink(telefono: string): string {
    if (!telefono) return '#';
    let clean = telefono.replace(/\D/g, '');
    if (clean.length === 8) {
      clean = '506' + clean;
    }
    return `https://wa.me/${clean}`;
  }

  async openCobradorLogs(cobrador: any) {
    this.selectedCobradorLogs = cobrador;
    this.showLogsModal.set(true);
    this.loadingLogs.set(true);

    try {
      const allLogs = await this.loanService.getTenantLogs();
      this.logs.set(allLogs || []);
    } catch (err) {
      this.toastService.error('Error al cargar la bitácora de actividades');
    } finally {
      this.loadingLogs.set(false);
    }
  }

  filteredLogs() {
    if (!this.selectedCobradorLogs) return [];
    const targetName = this.selectedCobradorLogs.nombre.toLowerCase();
    const targetUsername = this.selectedCobradorLogs.username.toLowerCase();

    return this.logs().filter(log => {
      const desc = (log.descripcion || '').toLowerCase();
      return desc.includes(targetName) || desc.includes(targetUsername);
    });
  }

  openAddModal() {
    this.newCobradorData = { nombre: '', username: '', password: '', telefono: '+506 ' };
    this.showAddModal.set(true);
  }

  async onCreateCobrador(event: Event) {
    event.preventDefault();
    if (!this.newCobradorData.nombre || !this.newCobradorData.username || !this.newCobradorData.password) {
      this.toastService.error('Por favor complete todos los campos obligatorios');
      return;
    }

    this.newCobradorData.username = this.newCobradorData.username.trim().toLowerCase();
    this.loadingCobrador.set(true);
    try {
      await this.loanService.createCobrador(this.newCobradorData);
      this.toastService.success('Cobrador agregado al equipo exitosamente');
      this.showAddModal.set(false);
      await this.loadCobradores();
    } catch (err: any) {
      this.toastService.error(err.error?.error || 'Error al crear cobrador');
    } finally {
      this.loadingCobrador.set(false);
    }
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

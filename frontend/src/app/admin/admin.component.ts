import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoanService, Subscriber } from '../services/loan.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-industrial-black text-industrial-light pb-24 font-sans select-none">
      
      <!-- Top Caterpillar Branded Bar -->
      <header class="bg-industrial-dark border-b border-industrial-border px-5 py-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-caterpillar rounded-lg flex items-center justify-center font-extrabold text-industrial-black text-lg">
            A
          </div>
          <div>
            <h1 class="text-sm font-black text-white leading-none tracking-tight uppercase">
              PANEL DE CONTROL
            </h1>
            <p class="text-[9px] text-caterpillar uppercase tracking-wider font-mono mt-0.5">CAT-LOAN SAAS ADMIN</p>
          </div>
        </div>

        <!-- Logout button -->
        <button (click)="logout()" 
                class="bg-industrial-surface border border-industrial-border p-2 rounded-lg text-industrial-muted hover:text-semantic-red transition duration-150"
                title="Cerrar Sesión">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </header>

      <!-- Main Layout container -->
      <main class="max-w-md mx-auto px-4 mt-6">
        
        <!-- Search bar -->
        <section class="mb-6">
          <div class="relative">
            <input type="text" [(ngModel)]="searchTerm" placeholder="Buscar por nombre, correo o cel..."
                   class="w-full bg-industrial-surface border border-industrial-border rounded-xl p-3.5 pl-10 text-white text-xs focus:outline-none focus:border-caterpillar transition duration-150">
            <div class="absolute left-3.5 top-4 text-industrial-muted">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </section>

        <!-- KPI Header -->
        <section class="grid grid-cols-2 gap-3 mb-6">
          <div class="bg-industrial-dark border border-industrial-border p-3.5 rounded-xl">
            <span class="text-[9px] text-industrial-muted uppercase font-mono">Prestamistas Totales</span>
            <span class="text-xl font-black text-white block mt-1">
              {{ subscribers().length }}
            </span>
          </div>
          <div class="bg-industrial-dark border border-industrial-border p-3.5 rounded-xl">
            <span class="text-[9px] text-industrial-muted uppercase font-mono">Activos / Trial</span>
            <span class="text-xl font-black text-caterpillar block mt-1">
              {{ activeSubscribersCount() }}
            </span>
          </div>
        </section>

        <!-- Subscribers list -->
        <section class="space-y-4">
          <div class="text-xs text-industrial-muted uppercase font-mono tracking-wider mb-2">Clientes Suscritos</div>

          <div *ngIf="filteredSubscribers().length === 0" class="text-center py-10 bg-industrial-dark/50 border border-dashed border-industrial-border rounded-xl">
            <p class="text-xs text-industrial-muted">Ningún prestamista encontrado</p>
          </div>

          <div *ngFor="let sub of filteredSubscribers()" 
               class="bg-industrial-dark border border-industrial-border rounded-xl p-4 transition-all duration-200 hover:border-caterpillar/30">
            
            <div class="flex justify-between items-start mb-2">
              <div>
                <h3 class="font-extrabold text-white text-sm">{{ sub.nombre }}</h3>
                <span class="text-[11px] text-industrial-muted font-mono block">{{ sub.email }}</span>
                <span class="text-[11px] text-industrial-muted font-mono block">{{ sub.telefono }}</span>
              </div>
              <div class="text-right">
                <!-- Status Badge -->
                <span [class]="'inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ' + getStatusClass(sub)">
                  {{ sub.subscriptionType }}
                </span>
                <span class="text-[10px] text-industrial-muted font-mono block mt-1">
                  {{ sub.diasRestantes > 0 ? (sub.diasRestantes + ' días rest.') : 'Vencido' }}
                </span>
              </div>
            </div>

            <!-- Expiration Date -->
            <div class="text-[11px] text-industrial-muted font-mono mt-1 flex justify-between items-center bg-industrial-surface/50 p-2.5 rounded-lg border border-industrial-border/60">
              <span>Vence el:</span>
              <span class="text-white font-bold">{{ sub.validUntil | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>

            <!-- Action buttons for subscription renewal -->
            <div class="grid grid-cols-2 gap-2.5 mt-4">
              <button (click)="renew(sub.userId, 30)" 
                      class="bg-caterpillar hover:bg-caterpillar-dark text-industrial-black text-[11px] py-2.5 rounded-lg font-black uppercase transition duration-150 shadow-md">
                +30 Días Activo
              </button>
              <button (click)="renew(sub.userId, 0)" 
                      class="bg-industrial-surface border border-industrial-border hover:border-semantic-red text-industrial-muted hover:text-white text-[11px] py-2.5 rounded-lg font-black uppercase transition duration-150">
                Suspender
              </button>
            </div>

          </div>
        </section>

      </main>
    </div>
  `
})
export class AdminComponent implements OnInit {
  loanService = inject(LoanService);

  subscribers = signal<Subscriber[]>([]);
  searchTerm = '';

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    try {
      const data = await this.loanService.getSubscribers();
      this.subscribers.set(data);
    } catch (err) {
      alert('Error al cargar la lista de prestamistas');
    }
  }

  activeSubscribersCount(): number {
    return this.subscribers().filter(s => s.subscriptionType === 'ACTIVE' || s.subscriptionType === 'TRIAL').length;
  }

  filteredSubscribers(): Subscriber[] {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) return this.subscribers();

    return this.subscribers().filter(s => 
      s.nombre.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term) ||
      s.telefono.includes(term)
    );
  }

  getStatusClass(sub: Subscriber): string {
    if (sub.subscriptionType === 'ACTIVE') {
      return 'bg-semantic-emerald/10 text-semantic-emerald border border-semantic-emerald/30';
    }
    if (sub.subscriptionType === 'TRIAL') {
      return 'bg-caterpillar/10 text-caterpillar border border-caterpillar/30';
    }
    return 'bg-semantic-red/10 text-semantic-red border border-semantic-red/30';
  }

  async renew(userId: string, days: number) {
    const actionText = days > 0 ? `¿Renovar suscripción por ${days} días?` : '¿Suspender suscripción ahora?';
    if (!confirm(actionText)) return;

    try {
      await this.loanService.renewSubscription(userId, days);
      alert('Suscripción actualizada correctamente');
      this.loadData();
    } catch (err) {
      alert('Error al actualizar la suscripción');
    }
  }

  logout() {
    this.loanService.logout();
  }
}

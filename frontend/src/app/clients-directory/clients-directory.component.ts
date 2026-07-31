import { Component, EventEmitter, OnInit, Output, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientService } from '../services/client.service';
import { LoanService, Client } from '../services/loan.service';

@Component({
  selector: 'app-clients-directory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-industrial-black text-industrial-light pb-24 font-sans select-none pt-6">
      
      <main class="max-w-6xl mx-auto px-4">
        
        <div class="bg-industrial-dark border border-industrial-border rounded-xl p-5 shadow-2xl relative overflow-hidden mb-8">
          <!-- Industrial stripe -->
          <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-caterpillar via-industrial-black to-caterpillar bg-[length:30px_6px]"></div>

          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 pb-3 border-b border-industrial-border/60">
            <div>
              <h1 class="text-lg font-bold text-white leading-tight tracking-tight uppercase">DIRECTORIO DE CLIENTES</h1>
              <p class="text-[10px] text-caterpillar uppercase tracking-wider font-mono">GESTIÓN INTEGRAL DE EXPEDIENTES</p>
            </div>
            
            <button type="button" (click)="goBack.emit()"
                    class="bg-industrial-surface border border-industrial-border hover:border-caterpillar/40 text-white hover:text-caterpillar text-[10px] font-bold py-2 px-4 rounded-lg transition duration-150 uppercase tracking-wider whitespace-nowrap">
              Cerrar y volver
            </button>
          </div>
        </div>

      <!-- Search Bar -->
      <div class="bg-industrial-dark border border-industrial-border rounded-2xl p-4 mb-8 shadow-2xl relative overflow-hidden">
        <!-- Glow Effect -->
        <div class="absolute -top-10 -right-10 w-32 h-32 bg-caterpillar/10 rounded-full blur-3xl"></div>
        <div class="relative flex items-center">
          <svg class="w-5 h-5 text-industrial-muted ml-3 absolute" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" [(ngModel)]="searchQuery" (ngModelChange)="searchQuery.set($event)" placeholder="Buscar por nombre, cédula o teléfono..." 
                 class="w-full bg-industrial-surface border border-industrial-border rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-caterpillar transition-colors placeholder-industrial-muted font-mono">
        </div>
      </div>

      <!-- Empty State / Loading -->
      <div *ngIf="clientService.loading()" class="flex flex-col items-center justify-center py-20">
        <svg class="animate-spin h-10 w-10 text-caterpillar mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="text-industrial-muted font-mono uppercase text-sm">Cargando clientes...</span>
      </div>
      
      <div *ngIf="!clientService.loading() && filteredClients().length === 0" class="bg-industrial-dark border border-industrial-border rounded-2xl p-10 text-center flex flex-col items-center justify-center shadow-xl">
        <div class="w-16 h-16 bg-industrial-surface rounded-full flex items-center justify-center border border-industrial-border mb-4">
           <svg class="w-8 h-8 text-industrial-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
           </svg>
        </div>
        <h3 class="text-lg font-bold text-white mb-2">No se encontraron clientes</h3>
        <p class="text-sm text-industrial-muted font-mono">No hay registros que coincidan con tu búsqueda.</p>
      </div>

      <!-- Grid de Clientes -->
      <div *ngIf="!clientService.loading() && filteredClients().length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div *ngFor="let client of filteredClients()" class="group relative bg-industrial-dark border border-industrial-border hover:border-caterpillar/50 rounded-2xl p-5 shadow-xl transition-all duration-300 hover:shadow-caterpillar/5 flex flex-col h-full">
          <div class="flex items-start justify-between mb-4">
            <div class="flex-grow pr-4">
              <h3 class="text-lg font-bold text-white truncate group-hover:text-caterpillar transition-colors">{{ client.nombre }}</h3>
              <p class="text-xs text-industrial-muted font-mono flex items-center gap-1.5 mt-1">
                <svg class="w-3 h-3 text-caterpillar/70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                {{ client.telefono }}
              </p>
            </div>
            <!-- Indicator for Docs -->
            <div class="flex items-center gap-1.5 bg-industrial-surface border border-industrial-border px-2.5 py-1.5 rounded-lg shrink-0">
               <svg class="w-3.5 h-3.5" [ngClass]="client.documents && client.documents.length > 0 ? 'text-semantic-green' : 'text-industrial-muted'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
               </svg>
               <span class="text-xs font-mono font-bold" [ngClass]="client.documents && client.documents.length > 0 ? 'text-white' : 'text-industrial-muted'">
                 {{ client.documents?.length || 0 }}
               </span>
            </div>
          </div>
          
          <div class="mt-auto pt-4 border-t border-industrial-border/50 grid grid-cols-2 gap-3">
             <div class="flex flex-col">
                <span class="text-[10px] uppercase font-mono text-industrial-muted mb-0.5">ID / Cédula</span>
                <span class="text-xs font-mono text-white truncate">{{ client.numeroIdentificacion || 'NO REGISTRADA' }}</span>
             </div>
             <div class="flex flex-col items-end">
                <span class="text-[10px] uppercase font-mono text-industrial-muted mb-0.5">Préstamos</span>
                <span class="text-xs font-mono text-white font-bold">{{ getLoanCount(client.id) }}</span>
             </div>
          </div>

          <!-- Overlay View Button -->
          <button (click)="openClientEvent.emit(client)" class="mt-4 w-full bg-industrial-surface text-caterpillar border border-industrial-border py-2.5 rounded-xl font-black uppercase text-xs hover:bg-caterpillar hover:text-industrial-black transition-colors flex items-center justify-center gap-2">
            Ver Expediente
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
          </button>
        </div>
      </div>
      </main>
    </div>
  `
})
export class ClientsDirectoryComponent implements OnInit {
  @Output() goBack = new EventEmitter<void>();
  @Output() openClientEvent = new EventEmitter<Client>();

  clientService = inject(ClientService);
  loanService = inject(LoanService);

  searchQuery = signal<string>('');

  filteredClients = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const all = this.clientService.clients();
    if (!q) return all;
    return all.filter(c => 
      c.nombre.toLowerCase().includes(q) || 
      c.telefono.toLowerCase().includes(q) || 
      (c.numeroIdentificacion && c.numeroIdentificacion.toLowerCase().includes(q))
    );
  });

  ngOnInit() {
    // Only load if not loaded or if we want to ensure freshness
    if (this.clientService.clients().length === 0) {
      this.clientService.loadClients();
    }
  }

  getLoanCount(clientId: string): number {
    return this.loanService.loans().filter(l => l.clientId === clientId).length;
  }
}

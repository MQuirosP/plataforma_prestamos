import { Component, EventEmitter, Input, Output, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientService } from '../services/client.service';
import { LoanService, Client, Loan, LoanStatus } from '../services/loan.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-client-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe],
  template: `
    <div class="min-h-screen bg-industrial-black text-industrial-light pb-24 font-sans select-none pt-6">
      
      <!-- Content Column -->
      <main class="max-w-md mx-auto px-4">
        
        <div class="bg-industrial-dark border border-industrial-border rounded-xl p-5 shadow-2xl relative overflow-hidden">
          
          <!-- Industrial stripe -->
          <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-caterpillar via-industrial-black to-caterpillar bg-[length:30px_6px]"></div>

          <!-- Form Title Inside Card (No back button) -->
          <div class="pt-2 pb-3 border-b border-industrial-border/60 mb-5">
            <h1 class="text-lg font-bold text-white leading-tight tracking-tight uppercase">EXPEDIENTE DEL CLIENTE</h1>
            <p class="text-[10px] text-caterpillar uppercase tracking-wider font-mono">{{ client.id }}</p>
          </div>

          <!-- Navigation Tabs -->
          <div class="flex gap-2 p-1 bg-industrial-surface border border-industrial-border rounded-lg mb-5">
            <button (click)="activeTab = 'perfil'" 
                    [class.bg-industrial-dark]="activeTab === 'perfil'" 
                    [class.border]="activeTab === 'perfil'"
                    [class.border-industrial-border]="activeTab === 'perfil'"
                    [class.text-white]="activeTab === 'perfil'"
                    [class.text-industrial-muted]="activeTab !== 'perfil'"
                    class="flex-1 py-1.5 rounded-md text-xs font-bold uppercase transition-colors">
              Perfil y DNI
            </button>
            <button (click)="activeTab = 'prestamos'" 
                    [class.bg-industrial-dark]="activeTab === 'prestamos'" 
                    [class.border]="activeTab === 'prestamos'"
                    [class.border-industrial-border]="activeTab === 'prestamos'"
                    [class.text-white]="activeTab === 'prestamos'"
                    [class.text-industrial-muted]="activeTab !== 'prestamos'"
                    class="flex-1 py-1.5 rounded-md text-xs font-bold uppercase transition-colors hover:text-caterpillar">
              Préstamos ({{ clientLoans.length }})
            </button>
          </div>

          <!-- TAB: Perfil -->
          <div *ngIf="activeTab === 'perfil'" class="space-y-6">
            
            <form (submit)="saveProfile($event)" class="space-y-4">
              <div class="space-y-4 border border-industrial-border rounded-xl p-4 bg-industrial-dark/40">
                <h2 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                  <svg class="w-4 h-4 text-caterpillar" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Datos Personales
                </h2>
                <div>
                  <label class="block text-[10px] text-industrial-muted uppercase font-mono mb-1">Nombre Completo</label>
                  <input type="text" [(ngModel)]="editData.nombre" name="nombre" required 
                         class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-caterpillar transition-colors">
                </div>
                <div>
                  <label class="block text-[10px] text-industrial-muted uppercase font-mono mb-1">Teléfono (WhatsApp)</label>
                  <input type="text" [(ngModel)]="editData.telefono" name="telefono" required 
                         class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-caterpillar transition-colors font-mono">
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-[10px] text-industrial-muted uppercase font-mono mb-1">Tipo Doc.</label>
                    <div class="group relative flex items-stretch rounded-lg overflow-hidden border border-industrial-border focus-within:border-caterpillar transition-colors duration-150 bg-industrial-surface">
                      <select [(ngModel)]="editData.tipoIdentificacion" name="tipoIdentificacion"
                              class="w-full bg-transparent text-white text-sm px-3 py-2.5 pr-8 focus:outline-none appearance-none cursor-pointer">
                        <option value="CEDULA_NACIONAL">Cédula</option>
                        <option value="PASAPORTE">Pasaporte</option>
                        <option value="RESIDENCIA_DIMEX">DIMEX</option>
                        <option value="OTRO">Otro</option>
                      </select>
                      <div class="absolute inset-y-0 right-0 flex items-center justify-center w-7 bg-industrial-dark text-caterpillar border-l border-industrial-border pointer-events-none select-none group-hover:bg-caterpillar group-hover:text-industrial-black transition-colors duration-150">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label class="block text-[10px] text-industrial-muted uppercase font-mono mb-1">Nº Documento</label>
                    <input type="text" [(ngModel)]="editData.numeroIdentificacion" name="numeroIdentificacion"
                           class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-caterpillar transition-colors font-mono tracking-wide">
                  </div>
                </div>
              </div>

              <!-- Documentos / Fotos -->
              <div class="border border-industrial-border rounded-xl p-4 bg-industrial-dark/40">
                <div class="flex items-center justify-between mb-3">
                   <h2 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                     <svg class="w-4 h-4 text-caterpillar" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                     Adjuntos
                   </h2>
                   <button type="button" (click)="fileInput.click()" [disabled]="uploading()" class="bg-industrial-surface text-caterpillar border border-industrial-border px-2.5 py-1 rounded-md font-bold uppercase text-[9px] hover:bg-caterpillar hover:text-industrial-black transition-colors disabled:opacity-50">
                      + Subir
                   </button>
                   <input type="file" #fileInput multiple (change)="onFileSelected($event)" accept="image/*" capture="environment" class="hidden">
                </div>
                
                <div *ngIf="uploading()" class="mb-3 bg-industrial-surface rounded-lg p-3 border border-industrial-border text-center">
                   <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-caterpillar mx-auto mb-1.5"></div>
                   <p class="text-[9px] text-industrial-muted uppercase font-mono">Subiendo foto(s)...</p>
                </div>

                <div *ngIf="!client.documents || client.documents.length === 0" class="text-center py-4 border border-dashed border-industrial-border rounded-lg">
                   <p class="text-xs text-industrial-muted font-mono">Sin documentos.</p>
                </div>

                <div *ngIf="client.documents && client.documents.length > 0" class="grid grid-cols-2 gap-3">
                   <div *ngFor="let doc of client.documents" class="relative group rounded-lg overflow-hidden border border-industrial-border bg-industrial-black">
                      <img [src]="doc.url" class="w-full h-24 object-cover cursor-pointer" (click)="openPreview(doc.url)">
                      <div class="absolute bottom-0 left-0 right-0 bg-industrial-black/80 backdrop-blur-sm p-1 flex justify-between items-center">
                         <span class="text-[8px] font-mono text-white px-1 truncate">{{ doc.tipo }}</span>
                         <button type="button" (click)="deleteDocument(doc.id)" class="text-semantic-red hover:text-white p-1" title="Eliminar foto">
                           <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                         </button>
                      </div>
                   </div>
                </div>
              </div>

              <!-- Action Buttons Standard -->
              <div class="flex gap-3 pt-4 border-t border-industrial-border/60">
                <button type="button" (click)="goBack.emit()"
                        class="flex-1 bg-industrial-surface border border-industrial-border hover:border-caterpillar/40 text-white hover:text-caterpillar text-xs font-bold py-3 rounded-lg transition duration-150 uppercase tracking-wider">
                  Cerrar y volver
                </button>
                <button type="submit" [disabled]="saving()"
                        class="flex-1 bg-caterpillar hover:bg-caterpillar-dark text-industrial-black py-3 rounded-lg font-black uppercase tracking-wider text-xs transition duration-150 shadow-lg disabled:opacity-50 flex items-center justify-center gap-1.5">
                  <span *ngIf="saving()" class="animate-spin rounded-full h-3 w-3 border-b-2 border-industrial-black"></span>
                  {{ saving() ? 'Guardando' : 'Guardar' }}
                </button>
              </div>
            </form>
          </div>

          <!-- TAB: Préstamos -->
          <div *ngIf="activeTab === 'prestamos'" class="space-y-3">
            <div *ngIf="clientLoans.length === 0" class="border border-industrial-border rounded-xl p-8 text-center shadow-inner bg-industrial-dark/40">
              <p class="text-xs text-industrial-muted font-mono">Este cliente no tiene ningún préstamo registrado en su historial.</p>
            </div>

            <div *ngFor="let loan of clientLoans" class="border border-industrial-border rounded-xl p-4 relative overflow-hidden bg-industrial-dark/40">
              <div class="absolute right-0 top-0 bottom-0 w-1.5"
                   [ngClass]="{
                     'bg-caterpillar': loan.estado === LoanStatus.ACTIVE,
                     'bg-semantic-green': loan.estado === LoanStatus.PAID
                   }">
              </div>
              <div class="flex justify-between items-start mb-2">
                 <div>
                    <span class="text-[9px] uppercase font-mono text-industrial-muted mb-0.5 block">ID: {{ loan.id.split('-')[0] }}</span>
                    <span class="text-base font-black text-white">₡{{ loan.montoOriginal | number }}</span>
                 </div>
                 <div class="px-2 py-0.5 rounded text-[9px] font-black uppercase font-mono"
                      [ngClass]="{
                        'bg-caterpillar/10 text-caterpillar border border-caterpillar/30': loan.estado === LoanStatus.ACTIVE,
                        'bg-semantic-green/10 text-semantic-green border border-semantic-green/30': loan.estado === LoanStatus.PAID
                      }">
                   {{ loan.estado }}
                 </div>
              </div>
              <div class="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-industrial-border/30">
                 <div>
                    <span class="text-[9px] uppercase font-mono text-industrial-muted block">A Pagar</span>
                    <span class="text-xs text-white font-mono font-bold">₡{{ loan.totalAPagar | number }}</span>
                 </div>
                 <div>
                    <span class="text-[9px] uppercase font-mono text-industrial-muted block">Inicio</span>
                    <span class="text-xs text-white font-mono">{{ loan.fechaInicio | date:'dd/MM/yy' }}</span>
                 </div>
              </div>
              
              <button (click)="openStatementEvent.emit(loan)" class="w-full mt-3 bg-industrial-surface text-caterpillar border border-industrial-border py-2 rounded-lg font-bold uppercase text-[10px] hover:bg-caterpillar hover:text-industrial-black transition-colors">
                Ver Estado de Cuenta
              </button>
            </div>

            <!-- Single Exit Button for Prestamos Tab -->
            <div class="pt-4 border-t border-industrial-border/60">
              <button type="button" (click)="goBack.emit()"
                      class="w-full bg-industrial-surface border border-industrial-border hover:border-caterpillar/40 text-white hover:text-caterpillar text-xs font-bold py-3 rounded-lg transition duration-150 uppercase tracking-wider">
                Cerrar y volver
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>

    <!-- Image Preview Modal -->
    <div *ngIf="previewUrl" class="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
      <button (click)="previewUrl = null" class="absolute top-6 right-6 text-white bg-industrial-dark rounded-full p-2 hover:bg-industrial-border transition">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
      <img [src]="previewUrl" class="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-industrial-border">
    </div>
  `
})
export class ClientProfileComponent implements OnInit {
  @Input() client!: Client;
  @Output() goBack = new EventEmitter<void>();
  @Output() openStatementEvent = new EventEmitter<Loan>();

  clientService = inject(ClientService);
  loanService = inject(LoanService);
  toastService = inject(ToastService);

  LoanStatus = LoanStatus;

  activeTab: 'perfil' | 'prestamos' = 'perfil';
  saving = signal(false);
  uploading = signal(false);
  previewUrl: string | null = null;
  clientLoans: Loan[] = [];

  editData = {
    nombre: '',
    telefono: '',
    tipoIdentificacion: '',
    numeroIdentificacion: ''
  };

  ngOnInit() {
    this.editData = {
      nombre: this.client.nombre,
      telefono: this.client.telefono,
      tipoIdentificacion: this.client.tipoIdentificacion || 'CEDULA_NACIONAL',
      numeroIdentificacion: this.client.numeroIdentificacion || ''
    };
    
    // Load historical loans for this client
    this.clientLoans = this.loanService.loans()
      .filter(l => l.clientId === this.client.id)
      .sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime());
  }

  async saveProfile(event: Event) {
    event.preventDefault();
    if (!this.editData.nombre || !this.editData.telefono) {
      this.toastService.error('Nombre y teléfono son obligatorios');
      return;
    }
    this.saving.set(true);
    try {
      const updatedClient = await this.clientService.updateClient(this.client.id, {
        nombre: this.editData.nombre,
        telefono: this.editData.telefono,
        tipoIdentificacion: (this.editData.tipoIdentificacion as any) || null,
        numeroIdentificacion: this.editData.numeroIdentificacion || null
      });
      // Actualizar la referencia local para la vista actual
      this.client = { ...this.client, ...updatedClient };
      // También forzamos actualizar los prestamos asociados en el LoanService (legacy ref)
      this.loanService.loans.update(current => 
        current.map(l => l.clientId === this.client.id ? { ...l, client: { ...l.client!, ...updatedClient } } : l)
      );
      this.toastService.success('Perfil de cliente actualizado.');
    } catch (err: any) {
      this.toastService.error(err.error?.error || err.message || 'Error al actualizar');
    } finally {
      this.saving.set(false);
    }
  }

  async onFileSelected(event: any) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    this.uploading.set(true);
    try {
      const newDocs = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = await this.clientService.uploadDniPhoto(file);
        const doc = await this.clientService.addClientDocument(this.client.id, url, 'DOCUMENTO');
        newDocs.push(doc);
      }
      
      this.client.documents = [...(this.client.documents || []), ...newDocs];
      
      // Update in loan service as well so it reflects globally
      this.loanService.loans.update(current => 
        current.map(l => l.clientId === this.client.id ? { ...l, client: { ...l.client!, documents: this.client.documents } } : l)
      );
      this.toastService.success(`${newDocs.length} foto(s) subida(s) exitosamente`);
    } catch (err: any) {
      this.toastService.error(err.error?.error || err.message || 'Error al subir foto(s)');
    } finally {
      this.uploading.set(false);
      event.target.value = null;
    }
  }

  async deleteDocument(docId: string) {
    if (!confirm('¿Estás seguro de eliminar este documento?')) return;
    try {
      await this.clientService.deleteClientDocument(this.client.id, docId);
      this.client.documents = this.client.documents?.filter(d => d.id !== docId);
      // Update in loan service
      this.loanService.loans.update(current => 
        current.map(l => l.clientId === this.client.id ? { ...l, client: { ...l.client!, documents: this.client.documents } } : l)
      );
      this.toastService.success('Documento eliminado');
    } catch (err: any) {
      this.toastService.error(err.error?.error || err.message || 'Error al eliminar documento');
    }
  }

  openPreview(url: string) {
    this.previewUrl = url;
  }
}

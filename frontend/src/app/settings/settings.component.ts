import { Component, OnInit, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoanService, BusinessSettings } from '../services/loan.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-industrial-black text-industrial-light pb-24 font-sans select-none">
      
      <!-- Top Caterpillar Branded Bar -->
      <header class="bg-industrial-dark border-b border-industrial-border px-5 py-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
        <div class="flex items-center gap-2">
          <button (click)="goBack.emit()" class="text-caterpillar hover:text-white mr-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 class="text-lg font-bold text-white leading-tight tracking-tight">CONFIGURACIÓN</h1>
            <p class="text-[10px] text-caterpillar uppercase tracking-wider font-mono">CAT-LOAN SETTINGS</p>
          </div>
        </div>
      </header>

      <!-- Settings Content -->
      <main class="max-w-md mx-auto px-4 mt-6">
        
        <div class="bg-industrial-dark border border-industrial-border rounded-xl p-5 space-y-5 shadow-2xl relative overflow-hidden">
          
          <!-- Industrial stripe -->
          <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-caterpillar via-industrial-black to-caterpillar bg-[length:30px_6px]"></div>

          <form (submit)="saveSettings($event)" class="space-y-4 pt-2">
            
            <!-- Nombre de Negocio -->
            <div>
              <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Nombre del Negocio</label>
              <input type="text" [(ngModel)]="formData.nombreNegocio" name="nombreNegocio" required 
                     class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar">
              <span class="text-[10px] text-industrial-muted mt-1 block">Aparece en la cabecera del Estado de Cuenta Visual.</span>
            </div>

            <!-- Moneda y Código -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Símbolo de Moneda</label>
                <input type="text" [(ngModel)]="formData.monedaSimbolo" name="monedaSimbolo" required 
                       class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar">
              </div>
              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Código de Moneda</label>
                <input type="text" [(ngModel)]="formData.monedaCodigo" name="monedaCodigo" required 
                       class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar">
              </div>
            </div>

            <!-- Porcentaje de Ganancia por Defecto -->
            <div>
              <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Porcentaje de Interés por Defecto (%)</label>
              <div class="relative">
                <input type="number" [(ngModel)]="formData.gananciaPorcentaje" name="gananciaPorcentaje" required 
                       class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 pr-10 text-white text-sm focus:outline-none focus:border-caterpillar">
                <span class="absolute right-3 top-3.5 text-xs text-industrial-muted">%</span>
              </div>
              <span class="text-[10px] text-industrial-muted mt-1 block">El monto total a pagar al crear préstamos se calculará sumando este porcentaje (Ej: Principal * 1.50 para 50%).</span>
            </div>

            <!-- Plantilla de WhatsApp -->
            <div>
              <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Plantilla de WhatsApp</label>
              <textarea [(ngModel)]="formData.plantillaWhatsapp" name="plantillaWhatsapp" rows="4" required 
                        class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar resize-none"></textarea>
              <div class="text-[10px] text-industrial-muted mt-1 space-y-1">
                <p>Usa estas variables dinámicas en el texto:</p>
                <div class="flex flex-wrap gap-1.5 font-mono">
                  <span class="bg-industrial-surface border border-industrial-border px-1.5 py-0.5 rounded text-caterpillar text-[9px]">{{ '{' }}cliente{{ '}' }}</span>
                  <span class="bg-industrial-surface border border-industrial-border px-1.5 py-0.5 rounded text-caterpillar text-[9px]">{{ '{' }}cuota{{ '}' }}</span>
                  <span class="bg-industrial-surface border border-industrial-border px-1.5 py-0.5 rounded text-caterpillar text-[9px]">{{ '{' }}saldo{{ '}' }}</span>
                  <span class="bg-industrial-surface border border-industrial-border px-1.5 py-0.5 rounded text-caterpillar text-[9px]">{{ '{' }}moneda{{ '}' }}</span>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="pt-4 flex gap-3">
              <button type="submit" 
                      class="flex-1 bg-caterpillar hover:bg-caterpillar-dark text-industrial-black py-3.5 rounded-lg font-black uppercase text-xs tracking-wider transition duration-150 shadow-lg">
                Guardar Configuración
              </button>
              <button type="button" (click)="goBack.emit()" 
                      class="bg-industrial-surface border border-industrial-border hover:bg-industrial-border text-white text-xs font-bold px-4 py-3.5 rounded-lg transition duration-150">
                Cancelar
              </button>
            </div>

          </form>
        </div>

      </main>

    </div>
  `
})
export class SettingsComponent implements OnInit {
  loanService = inject(LoanService);

  @Output() goBack = new EventEmitter<void>();

  formData: BusinessSettings = {
    monedaSimbolo: '₡',
    monedaCodigo: 'CRC',
    nombreNegocio: 'CAT-LOAN Credit',
    plantillaWhatsapp: '',
    gananciaPorcentaje: 50
  };

  ngOnInit() {
    const activeSettings = this.loanService.settings();
    if (activeSettings) {
      this.formData = { ...activeSettings };
    }
  }

  async saveSettings(event: Event) {
    event.preventDefault();
    try {
      await this.loanService.updateSettings(this.formData);
      alert('Configuración guardada correctamente');
      this.goBack.emit();
    } catch (err) {
      alert('Error al guardar la configuración');
    }
  }
}

import { Component, OnInit, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoanService, BusinessSettings } from '../services/loan.service';
import { CountriesService, Country } from '../services/countries.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-industrial-black text-industrial-light pb-24 font-sans select-none">
      
      <!-- Top Caterpillar Branded Bar -->
      <header class="border-b border-industrial-border px-5 py-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md bg-opacity-95" style="background-color: #111111;">
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

          <!-- Simple Close for Cobradores settings view -->
          <div *ngIf="loanService.currentUser()?.rol === 'COBRADOR'" class="flex justify-between items-center pb-4 pt-2">
            <h3 class="text-white font-extrabold text-sm uppercase tracking-tight">Configuración de Cuenta</h3>
            <button (click)="goBack.emit()" class="text-xs text-caterpillar font-bold hover:underline">Regresar</button>
          </div>

          <form *ngIf="loanService.currentUser()?.rol === 'PRESTAMISTA'" (submit)="saveSettings($event)" class="space-y-4 pt-2">
            
            <!-- Nombre de Negocio -->
            <div>
              <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Nombre del Negocio</label>
              <input type="text" [(ngModel)]="formData.nombreNegocio" name="nombreNegocio" required 
                     class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar">
              <span class="text-[10px] text-industrial-muted mt-1 block">Aparece en la cabecera del Estado de Cuenta Visual.</span>
            </div>

            <!-- Selector de País (Consumido desde REST Countries API) -->
            <div>
              <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">País de Operación</label>
              <select [ngModel]="selectedCountryCca2()" (ngModelChange)="onCountryChange($event)" name="selectedCountryCca2"
                      class="w-full bg-industrial-surface border-2 border-caterpillar rounded-lg p-3 text-white text-sm focus:outline-none font-bold">
                <option *ngFor="let country of countriesList()" [value]="country.cca2">
                  {{ country.flag }} {{ country.name.common }} ({{ getCurrencyCode(country) }})
                </option>
              </select>
              <span class="text-[10px] text-industrial-muted mt-1 block">Al seleccionar el país se configuran automáticamente la moneda y el símbolo.</span>
            </div>

            <!-- Zona Horaria -->
            <div>
              <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Zona Horaria (Timezone)</label>
              <select [(ngModel)]="formData.timezone" name="timezone" required
                      class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar">
                <option *ngFor="let tz of timezones()" [value]="tz">{{ tz }}</option>
              </select>
            </div>

            <!-- Moneda y Código (Rellenados automáticamente) -->
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

          <!-- Section: Cambiar Contraseña (Available to both Lenders and Collectors) -->
          <div class="space-y-4 pt-4 border-t border-industrial-border/60">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-[10px] text-caterpillar uppercase font-mono tracking-widest">Cambiar Contraseña</span>
              <div class="flex-1 h-px bg-industrial-border/50"></div>
            </div>
            
            <div class="space-y-3">
              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Contraseña Actual</label>
                <input type="password" [(ngModel)]="oldPassword" class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar">
              </div>
              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Nueva Contraseña</label>
                <input type="password" [(ngModel)]="newPassword" class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar">
              </div>
              <div>
                <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Confirmar Nueva Contraseña</label>
                <input type="password" [(ngModel)]="confirmPassword" class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar">
              </div>
              <button type="button" (click)="changeUserPassword()" [disabled]="changingPassword()" class="w-full bg-caterpillar text-industrial-black font-black py-3.5 rounded-lg text-xs uppercase hover:bg-caterpillar-dark transition shadow-lg">
                {{ changingPassword() ? 'Cambiando...' : 'Cambiar Contraseña' }}
              </button>
            </div>
          </div>

          <!-- Cerrar Sesión (Always at the bottom) -->
          <div class="pt-6 border-t border-industrial-border/60 mt-6 text-center">
            <button type="button" (click)="logout()"
                    class="w-full flex items-center justify-center gap-2 bg-semantic-red/10 border border-semantic-red/30 hover:bg-semantic-red/20 text-semantic-red py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition duration-150">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Cerrar Sesión Activa
            </button>
          </div>
        </div>

      </main>

    </div>
  `
})
export class SettingsComponent implements OnInit {
  loanService = inject(LoanService);
  countriesService = inject(CountriesService);
  toastService = inject(ToastService);

  @Output() goBack = new EventEmitter<void>();

  // Signals
  countriesList = signal<Country[]>([]);
  selectedCountryCca2 = signal<string>('CR');
  timezones = signal<string[]>([]);

  formData: BusinessSettings = {
    monedaSimbolo: '₡',
    monedaCodigo: 'CRC',
    timezone: 'America/Costa_Rica',
    nombreNegocio: 'CAT-LOAN Credit',
    plantillaWhatsapp: '',
    gananciaPorcentaje: 50
  };

  oldPassword = '';
  newPassword = '';
  confirmPassword = '';
  changingPassword = signal(false);

  async changeUserPassword() {
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
    } catch (err: any) {
      this.toastService.error(err.error?.error || 'Error al cambiar contraseña');
    } finally {
      this.changingPassword.set(false);
    }
  }

  logout() {
    this.loanService.logout();
    this.goBack.emit();
  }

  async ngOnInit() {
    try {
      this.timezones.set(Intl.supportedValuesOf('timeZone'));
    } catch {
      this.timezones.set(['America/Costa_Rica', 'America/Mexico_City', 'America/Bogota', 'America/Lima']);
    }

    // 1. Load active settings
    const activeSettings = this.loanService.settings();
    if (activeSettings) {
      this.formData = { ...activeSettings };
    }

    // 2. Fetch country list
    try {
      const list = await this.countriesService.getCountries();
      this.countriesList.set(list);

      // 3. Match initial dropdown based on saved monedaCodigo
      const matchedCountry = list.find(c => this.getCurrencyCode(c) === this.formData.monedaCodigo);
      if (matchedCountry) {
        this.selectedCountryCca2.set(matchedCountry.cca2);
      } else {
        // Fallback default Costa Rica
        const crCountry = list.find(c => c.cca2 === 'CR');
        if (crCountry) {
          this.selectedCountryCca2.set('CR');
        }
      }
    } catch (err) {
      console.error('Error fetching countries list', err);
    }
  }

  getCurrencyCode(country: Country): string {
    if (country.currencies) {
      return Object.keys(country.currencies)[0];
    }
    return '';
  }

  onCountryChange(cca2: string) {
    this.selectedCountryCca2.set(cca2);
    const country = this.countriesList().find(c => c.cca2 === cca2);
    if (country && country.currencies) {
      const currencyCode = Object.keys(country.currencies)[0];
      const currencySymbol = country.currencies[currencyCode].symbol;
      
      this.formData.monedaCodigo = currencyCode;
      this.formData.monedaSimbolo = currencySymbol || '$';
    }
  }

  async saveSettings(event: Event) {
    event.preventDefault();
    try {
      await this.loanService.updateSettings(this.formData);
      this.toastService.success('Configuración guardada correctamente');
      this.goBack.emit();
    } catch (err) {
      this.toastService.error('Error al guardar la configuración');
    }
  }
}

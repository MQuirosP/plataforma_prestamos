import { Component, OnInit, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoanService } from '../services/loan.service';
import { CountriesService, Country } from '../services/countries.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen flex flex-col justify-center items-center bg-industrial-black px-6 select-none font-sans">
      <div class="w-full max-w-md bg-industrial-dark border border-industrial-border rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        
        <!-- Caution Stripe -->
        <div class="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-caterpillar via-industrial-black to-caterpillar bg-[length:40px_8px]"></div>

        <div class="text-center mb-6 mt-4">
          <div class="mx-auto w-16 h-16 bg-caterpillar/10 rounded-full flex items-center justify-center mb-4 border border-caterpillar">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-caterpillar" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h2 class="text-xl font-black text-white uppercase tracking-tight">Configuración Inicial Obligatoria</h2>
          <p class="text-[10px] text-caterpillar uppercase tracking-widest font-mono mt-1">Completa tu perfil de prestamista</p>
        </div>

        <form (submit)="submitOnboarding($event)" class="space-y-4">
          
          <!-- Nombre de Negocio -->
          <div>
            <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Nombre de tu Negocio / Marca</label>
            <input type="text" [(ngModel)]="nombreNegocio" name="nombreNegocio" required placeholder="Ej: Credit Express"
                   class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar transition duration-150">
          </div>

          <!-- Teléfono / WhatsApp -->
          <div>
            <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Teléfono / WhatsApp de Cobranza</label>
            <input type="tel" [(ngModel)]="telefono" name="telefono" required placeholder="Ej: +50688888888"
                   class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar transition duration-150">
            <span class="text-[9px] text-industrial-muted mt-1 block">Debe incluir el código de país (Ej: +506 para Costa Rica).</span>
          </div>

          <!-- Selector de País (Consumido desde REST Countries API) -->
          <div>
            <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">País / Moneda local</label>
            <select [ngModel]="selectedCountryCca2()" (ngModelChange)="onCountryChange($event)" name="selectedCountryCca2"
                    class="w-full bg-industrial-surface border-2 border-caterpillar rounded-lg p-3 text-white text-sm focus:outline-none font-bold">
              <option *ngFor="let country of countriesList()" [value]="country.cca2">
                {{ country.flag }} {{ country.name.common }} ({{ getCurrencyCode(country) }})
              </option>
            </select>
          </div>

          <button type="submit" [disabled]="loading()"
                  class="w-full bg-caterpillar hover:bg-caterpillar-dark disabled:bg-caterpillar/40 text-industrial-black py-4 rounded-lg font-black uppercase text-xs tracking-wider transition duration-150 shadow-lg mt-6">
            {{ loading() ? 'Guardando perfil...' : 'Confirmar e Ingresar' }}
          </button>

        </form>
      </div>
    </div>
  `
})
export class OnboardingComponent implements OnInit {
  loanService = inject(LoanService);
  countriesService = inject(CountriesService);
  toastService = inject(ToastService);

  @Output() onboardingComplete = new EventEmitter<void>();

  // Form bindings
  nombreNegocio = 'Caterpillar Cobros';
  telefono = '';
  selectedCountryCca2 = signal<string>('CR');
  monedaSimbolo = '₡';
  monedaCodigo = 'CRC';

  // Signals
  countriesList = signal<Country[]>([]);
  loading = signal<boolean>(false);

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

  async ngOnInit() {
    try {
      const list = await this.countriesService.getCountries();
      this.countriesList.set(list);
      
      const crCountry = list.find(c => c.cca2 === 'CR');
      if (crCountry) {
        this.selectedCountryCca2.set('CR');
        this.onCountryChange('CR');
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
      
      this.monedaCodigo = currencyCode;
      this.monedaSimbolo = currencySymbol || '$';
      
      const prefix = this.getPrefixByCurrency(currencyCode);
      if (!this.telefono || this.telefono === '' || this.telefono.startsWith('+')) {
        this.telefono = prefix;
      }
    }
  }

  async submitOnboarding(event: Event) {
    event.preventDefault();
    if (!this.nombreNegocio || !this.telefono) {
      this.toastService.error('Por favor complete todos los campos requeridos');
      return;
    }

    if (!this.telefono.startsWith('+') || this.telefono.length < 8) {
      this.toastService.error('Por favor ingrese un teléfono válido con formato internacional (Ej: +50688888888)');
      return;
    }

    this.loading.set(true);
    try {
      // Save settings and user telephone to the backend
      await this.loanService.updateSettings({
        nombreNegocio: this.nombreNegocio,
        monedaSimbolo: this.monedaSimbolo,
        monedaCodigo: this.monedaCodigo,
        plantillaWhatsapp: 'Hola {cliente}, te escribo para recordarte que tu balance pendiente es de {moneda}{saldo}. Tu cuota programada es de {moneda}{cuota}. Favor de enviar el abono a la brevedad. ¡Gracias!',
        gananciaPorcentaje: 50,
        telefono: this.telefono as any // Pass telephone to save in user table
      } as any);

      this.onboardingComplete.emit();
    } catch (err) {
      this.toastService.error('No se pudo guardar la configuración. Accediendo al entorno de pruebas offline.');
      this.onboardingComplete.emit();
    } finally {
      this.loading.set(false);
    }
  }
}

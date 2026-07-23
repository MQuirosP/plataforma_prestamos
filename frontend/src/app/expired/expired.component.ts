import { Component, inject } from '@angular/core';
import { LoanService } from '../services/loan.service';

@Component({
  selector: 'app-expired',
  standalone: true,
  template: `
    <div class="min-h-screen flex flex-col justify-center items-center bg-industrial-black px-6 text-center">
      <div class="w-full max-w-md bg-industrial-dark border-2 border-caterpillar rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        <!-- Caterpillar industrial caution stripe -->
        <div class="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-caterpillar via-industrial-black to-caterpillar bg-[length:40px_10px]"></div>
        
        <!-- Danger Icon -->
        <div class="mx-auto w-20 h-20 bg-caterpillar/10 rounded-full flex items-center justify-center mb-6 mt-4 border border-caterpillar">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-caterpillar" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h1 class="text-3xl font-extrabold text-white tracking-tight mb-2">ACCESO BLOQUEADO</h1>
        <div class="text-caterpillar font-mono uppercase tracking-widest text-xs mb-6">Suscripción Expirada</div>

        <p class="text-industrial-light text-base mb-8 leading-relaxed">
          Su cuenta no cuenta con una membresía activa de cobrador. Se han deshabilitado temporalmente las funciones de registro de abonos y alta de clientes.
        </p>

        <!-- Action Button to Admin WhatsApp -->
        <a [href]="adminWhatsappUrl" target="_blank"
           class="w-full inline-flex justify-center items-center gap-3 bg-caterpillar hover:bg-caterpillar-dark text-industrial-black font-extrabold uppercase py-4 px-6 rounded-xl transition duration-200 shadow-lg hover:shadow-caterpillar/20">
          <!-- WhatsApp Icon -->
          <svg class="h-6 w-6 fill-current" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.498 1.45 5.429 1.451 5.517 0 10.005-4.486 10.008-10.007.002-2.673-1.037-5.188-2.928-7.081-1.892-1.892-4.408-2.934-7.083-2.935-5.52 0-10.007 4.488-10.01 10.01-.001 1.916.498 3.793 1.448 5.378L1.745 22.25l6.559-1.722L6.647 19.15z"/>
          </svg>
          Reactivar con Soporte
        </a>

        <!-- Actions -->
        <div class="mt-8 flex flex-col gap-2">
          <!-- Dev Bypass Tool -->
          <button (click)="bypass()" class="text-xs text-industrial-muted hover:text-caterpillar underline font-mono">
            [Simular Reactivación de Cuenta (Dev)]
          </button>
          
          <!-- Exit/Logout -->
          <button (click)="logout()" class="text-xs text-semantic-red hover:text-red-400 font-bold uppercase tracking-wider mt-2">
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class ExpiredComponent {
  private loanService = inject(LoanService);

  // Admin contact phone number prefilled with structured text
  adminWhatsappUrl = `https://wa.me/50672666369?text=${encodeURIComponent(
    'Hola Administrador, mi cuenta de cobrador de Préstamos ha vencido. Solicito la reactivación de mi membresía mensual.'
  )}`;

  bypass() {
    this.loanService.toggleSubscription();
  }

  logout() {
    this.loanService.logout();
  }
}

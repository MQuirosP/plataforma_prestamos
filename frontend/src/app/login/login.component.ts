import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LoanService } from '../services/loan.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen flex flex-col justify-start md:justify-center items-center bg-industrial-black px-6 pt-10 md:pt-0 select-none font-sans relative">
      
      <!-- Security Loader Overlay -->
      <div *ngIf="showLoading()" class="absolute inset-0 bg-industrial-black/95 flex flex-col justify-center items-center z-50 transition-all duration-300">
        <div class="w-full max-w-xs text-center space-y-6">
          <!-- Animated Spinner -->
          <div class="w-16 h-16 border-4 border-industrial-border border-t-caterpillar rounded-full animate-spin mx-auto shadow-lg shadow-caterpillar/10"></div>
          
          <div class="space-y-2">
            <h3 class="text-sm font-black text-white uppercase tracking-wider font-mono">Acceso Seguro</h3>
            <p class="text-xs text-caterpillar font-mono animate-pulse uppercase">{{ currentLoadingMessage() }}</p>
          </div>

          <!-- Loading Progress bar indicator -->
          <div class="w-full bg-industrial-surface h-1.5 rounded-full overflow-hidden border border-industrial-border">
            <div class="bg-caterpillar h-full animate-[shimmer_1.5s_infinite_linear] w-2/3 rounded-full"></div>
          </div>
        </div>
      </div>

      <div class="w-full max-w-md bg-industrial-dark border border-industrial-border rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        
        <!-- Industrial Stripe Accent -->
        <div class="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-caterpillar via-industrial-black to-caterpillar bg-[length:40px_8px]"></div>

        <div class="text-center mb-8 mt-4">
          <img src="/assets/images/logo.png" class="w-12 h-12 object-contain mx-auto mb-3" alt="Logo">
          <h2 class="text-2xl font-black text-white uppercase tracking-tight leading-tight">Plataforma Crediticia</h2>
          <p class="text-[10px] text-caterpillar uppercase tracking-widest font-mono mt-1">SaaS Plataforma de Cobranza</p>
        </div>

        <form (submit)="onLogin($event)" class="space-y-4">
          <div>
            <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Correo Electrónico</label>
            <input type="email" [(ngModel)]="email" name="email" required placeholder="ejemplo@correo.com"
                   class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar transition duration-150">
          </div>
          
          <div>
            <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Contraseña</label>
            <input type="password" [(ngModel)]="password" name="password" required placeholder="••••••••"
                   class="w-full bg-industrial-surface border border-industrial-border rounded-lg p-3 text-white text-sm focus:outline-none focus:border-caterpillar transition duration-150">
          </div>

          <button type="submit" 
                  class="w-full bg-caterpillar hover:bg-caterpillar-dark text-industrial-black py-3.5 rounded-lg font-black uppercase text-xs tracking-wider transition duration-150 shadow-md">
            Iniciar Sesión
          </button>
        </form>

        <!-- Divider -->
        <div class="flex items-center my-6">
          <div class="flex-1 h-px bg-industrial-border"></div>
          <span class="px-3 text-xs text-industrial-muted font-mono uppercase">O ingresar con</span>
          <div class="flex-1 h-px bg-industrial-border"></div>
        </div>

        <!-- Google OAuth Button (Yellow textured border) -->
        <button (click)="loginWithGoogle()" 
                class="w-full bg-industrial-surface border-2 border-dashed border-caterpillar hover:bg-industrial-surface/80 text-white py-3 px-4 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-3 transition duration-150">
          <svg class="h-4 w-4 fill-current text-caterpillar" viewBox="0 0 24 24">
            <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.51 0-6.357-2.827-6.357-6.32s2.848-6.32 6.357-6.32c1.7 0 3.243.687 4.39 1.8l3.111-3.084C18.829 1.707 15.777 0 12.24 0 5.581 0 0 5.37 0 12s5.581 12 12.24 12c6.2 0 11.237-4.388 11.237-12 0-.853-.082-1.68-.236-2.428H12.24z"/>
          </svg>
          Iniciar sesión con Google
        </button>

        <!-- Footer -->
        <div class="text-[10px] text-industrial-muted font-mono text-center mt-8 uppercase leading-normal">
          <p>© 2026 Mi Negocio Crediticio. Todos los derechos reservados.</p>
          <p class="mt-1.5">
            ¿Necesitas ayuda? 
            <a href="mailto:mquirosp78@gmail.com" class="text-caterpillar hover:underline font-extrabold">Contactar al administrador</a>
          </p>
        </div>

      </div>
    </div>
  `
})
export class LoginComponent {
  loanService = inject(LoanService);

  email = '';
  password = '';

  // Loading signals
  showLoading = signal<boolean>(false);
  currentLoadingMessage = signal<string>('Verificando credenciales seguras...');

  private loadingMessages = [
    'Verificando credenciales seguras...',
    'Sincronizando bóveda de datos...',
    'Validando llaves criptográficas...',
    'Cargando perfil de cobrador...'
  ];

  onLogin(event: Event) {
    event.preventDefault();
    if (!this.email || !this.password) return;
    
    this.triggerLoading(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const inviteToken = urlParams.get('inviteToken') || undefined;
      this.loanService.login(this.email, 'Usuario Demo', inviteToken);
    });
  }

  private route = inject(ActivatedRoute);

  loginWithGoogle() {
    this.triggerLoading(() => {
      const targetEmail = this.email || 'nuevo@correo.com';
      const targetName = targetEmail.includes('mario') ? 'Mario Quirós Pizarro' : 'Prestamista Nuevo';
      
      const urlParams = new URLSearchParams(window.location.search);
      const inviteToken = urlParams.get('inviteToken') || undefined;
      
      this.loanService.login(targetEmail, targetName, inviteToken);
    });
  }

  private triggerLoading(callback: () => void) {
    this.showLoading.set(true);
    let messageIndex = 0;

    // Cycle messages every 500ms
    const interval = setInterval(() => {
      messageIndex = (messageIndex + 1) % this.loadingMessages.length;
      this.currentLoadingMessage.set(this.loadingMessages[messageIndex]);
    }, 500);

    // Complete loader after 2 seconds
    setTimeout(() => {
      clearInterval(interval);
      this.showLoading.set(false);
      callback();
    }, 2000);
  }
}

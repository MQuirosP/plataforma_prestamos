import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoanService } from '../services/loan.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen flex flex-col justify-center items-center bg-industrial-black px-6 select-none font-sans">
      <div class="w-full max-w-md bg-industrial-dark border border-industrial-border rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        
        <!-- Industrial Stripe Accent -->
        <div class="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-caterpillar via-industrial-black to-caterpillar bg-[length:40px_8px]"></div>

        <div class="text-center mb-8 mt-4">
          <!-- Branded logo placeholder -->
          <div class="w-12 h-12 bg-caterpillar rounded-xl flex items-center justify-center font-extrabold text-industrial-black text-2xl mx-auto shadow-md mb-3">
            C
          </div>
          <h2 class="text-2xl font-black text-white uppercase tracking-tight leading-tight">CAT-LOAN Credit</h2>
          <p class="text-[10px] text-caterpillar uppercase tracking-widest font-mono mt-1">SaaS Plataforma de Cobranza</p>
        </div>

        <form (submit)="onLogin($event)" class="space-y-4">
          <div>
            <label class="block text-xs text-industrial-muted uppercase font-mono mb-1">Correo Electrónico</label>
            <input type="email" [(ngModel)]="email" name="email" required placeholder="ejemplo@caterpillar.com"
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
          <!-- Google Icon Iconography -->
          <svg class="h-4 w-4 fill-current text-caterpillar" viewBox="0 0 24 24">
            <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.51 0-6.357-2.827-6.357-6.32s2.848-6.32 6.357-6.32c1.7 0 3.243.687 4.39 1.8l3.111-3.084C18.829 1.707 15.777 0 12.24 0 5.581 0 0 5.37 0 12s5.581 12 12.24 12c6.2 0 11.237-4.388 11.237-12 0-.853-.082-1.68-.236-2.428H12.24z"/>
          </svg>
          Iniciar sesión con Google
        </button>

        <!-- Sandbox notice -->
        <p class="text-[9px] text-industrial-muted font-mono text-center mt-6 uppercase leading-tight">
          Entorno de desarrollo local configurado con Neon DB en AWS.<br>
          <span class="text-caterpillar font-bold">Tip:</span> Ingresa con el correo "mario&#64;caterpillar.com" para simular el rol de ADMIN.
        </p>

      </div>
    </div>
  `
})
export class LoginComponent {
  loanService = inject(LoanService);

  email = '';
  password = '';

  onLogin(event: Event) {
    event.preventDefault();
    if (!this.email || !this.password) return;
    
    // Simulate auth check and load profile
    this.loanService.login(this.email, 'Usuario Demo');
  }

  loginWithGoogle() {
    // Simulate successful OAuth sync endpoint response
    this.loanService.login('mario@caterpillar-saas.com', 'Mario Quirós Pizarro');
  }
}

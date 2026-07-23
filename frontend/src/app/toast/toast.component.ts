import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-20 right-5 z-[9999] w-full max-w-xs flex flex-col gap-2 pointer-events-none">
      <div *ngFor="let toast of toastService.toasts()"
           [class]="'pointer-events-auto relative overflow-hidden flex items-center justify-between p-3.5 pb-4 rounded-xl border shadow-2xl ' + 
                   (toast.isLeaving ? 'toast-leave ' : 'toast-enter ') + 
                   getToastClass(toast)">
        
        <div class="flex items-center gap-3">
          <!-- Icon -->
          <div [class]="'w-5 h-5 rounded-full flex items-center justify-center ' + getIconClass(toast)">
            <svg *ngIf="toast.type === 'success'" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            <svg *ngIf="toast.type === 'error'" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
            <svg *ngIf="toast.type === 'info'" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
          </div>

          <!-- Message -->
          <span class="text-xs font-bold uppercase tracking-wide text-white leading-tight">
            {{ toast.message }}
          </span>
        </div>

        <!-- Close button -->
        <button (click)="remove(toast.id)" class="text-industrial-muted hover:text-white transition duration-150 pl-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>

        <!-- Progress Bar (fills up linear for 4s) -->
        <div class="absolute bottom-0 left-0 right-0 h-1 bg-industrial-border/30">
          <div class="h-full toast-progress-bar" [class]="getProgressColor(toast)"></div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .toast-enter {
      animation: slideInRight 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
    }
    .toast-leave {
      animation: slideOutRight 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
    }
    .toast-progress-bar {
      width: 0;
      animation: fillProgress 4s linear forwards;
    }
    @keyframes fillProgress {
      from {
        width: 0%;
      }
      to {
        width: 100%;
      }
    }
    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateX(120%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    @keyframes slideOutRight {
      from {
        opacity: 1;
        transform: translateX(0);
      }
      to {
        opacity: 0;
        transform: translateX(120%);
      }
    }
  `]
})
export class ToastComponent {
  toastService = inject(ToastService);

  getToastClass(toast: Toast): string {
    if (toast.type === 'success') {
      return 'bg-industrial-dark border-semantic-emerald/40 text-semantic-emerald';
    }
    if (toast.type === 'error') {
      return 'bg-industrial-dark border-semantic-red/40 text-semantic-red';
    }
    return 'bg-industrial-dark border-caterpillar/40 text-caterpillar';
  }

  getIconClass(toast: Toast): string {
    if (toast.type === 'success') {
      return 'bg-semantic-emerald/10 text-semantic-emerald border border-semantic-emerald/30';
    }
    if (toast.type === 'error') {
      return 'bg-semantic-red/10 text-semantic-red border border-semantic-red/30';
    }
    return 'bg-caterpillar/10 text-caterpillar border border-caterpillar/30';
  }

  getProgressColor(toast: Toast): string {
    if (toast.type === 'success') {
      return 'bg-semantic-emerald';
    }
    if (toast.type === 'error') {
      return 'bg-semantic-red';
    }
    return 'bg-caterpillar';
  }

  remove(id: number) {
    this.toastService.remove(id);
  }
}

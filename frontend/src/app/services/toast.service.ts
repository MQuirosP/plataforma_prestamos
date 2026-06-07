import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  isLeaving?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toasts = signal<Toast[]>([]);
  private counter = 0;

  show(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const id = this.counter++;
    const newToast: Toast = { id, message, type };
    this.toasts.update(current => [...current, newToast]);

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      this.remove(id);
    }, 4000);
  }

  remove(id: number) {
    this.toasts.update(current => 
      current.map(t => t.id === id ? { ...t, isLeaving: true } : t)
    );
    setTimeout(() => {
      this.toasts.update(current => current.filter(t => t.id !== id));
    }, 300);
  }

  success(message: string) {
    this.show(message, 'success');
  }

  error(message: string) {
    this.show(message, 'error');
  }

  info(message: string) {
    this.show(message, 'info');
  }
}

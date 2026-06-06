import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface Payment {
  id: string;
  loanId: string;
  montoAbonado: number;
  numeroRecibo: string;
  notas?: string;
  fechaPago: string;
}

export interface Loan {
  id: string;
  prestamistaId: string;
  clienteNombre: string;
  clienteTelefono: string;
  montoOriginal: number;
  totalAPagar: number;
  cuotaSemanal: number;
  diaCobro: number;
  estado: 'ACTIVE' | 'PAID';
  fechaInicio: string;
  balancePendiente: number;
  cuotaActual: number;
  cuotasTotales: number;
  payments: Payment[];
}

@Injectable({
  providedIn: 'root'
})
export class LoanService {
  private apiUrl = 'http://localhost:3000/api';

  // Signals for state management
  loans = signal<Loan[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  isExpired = signal<boolean>(false);

  // Computed KPIs
  capitalEnCalle = computed(() => {
    return this.loans()
      .filter(l => l.estado === 'ACTIVE')
      .reduce((sum, l) => sum + Number(l.balancePendiente), 0);
  });

  porCobrarEstaSemana = computed(() => {
    return this.loans()
      .filter(l => l.estado === 'ACTIVE')
      .reduce((sum, l) => sum + Number(l.cuotaSemanal), 0);
  });

  rendimientoEstimado = computed(() => {
    // Total estimated earnings (Total a pagar - original principal)
    return this.loans().reduce((sum, l) => sum + (Number(l.totalAPagar) - Number(l.montoOriginal)), 0);
  });

  constructor(private http: HttpClient) {}

  async loadLoans() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await firstValueFrom(this.http.get<Loan[]>(`${this.apiUrl}/loans`));
      this.loans.set(data);
      this.isExpired.set(false);
    } catch (err: any) {
      if (err.status === 403 && err.error?.expired) {
        this.isExpired.set(true);
        this.error.set(err.error.message);
      } else {
        this.error.set('No se pudo conectar al servidor. Iniciando modo offline demo.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  async createLoan(loanData: {
    clienteNombre: string;
    clienteTelefono: string;
    montoOriginal: number;
    cuotaSemanal: number;
    diaCobro: number;
  }) {
    this.loading.set(true);
    try {
      const newLoan = await firstValueFrom(this.http.post<Loan>(`${this.apiUrl}/loans`, loanData));
      this.loans.update(current => [newLoan, ...current]);
      return newLoan;
    } catch (err: any) {
      if (err.status === 403 && err.error?.expired) {
        this.isExpired.set(true);
      }
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  async addPayment(loanId: string, montoAbonado: number, notas: string) {
    this.loading.set(true);
    try {
      const newPayment = await firstValueFrom(this.http.post<Payment>(`${this.apiUrl}/loans/${loanId}/payments`, {
        montoAbonado,
        notas
      }));

      // Update loans state locally
      this.loans.update(currentLoans => {
        return currentLoans.map(loan => {
          if (loan.id === loanId) {
            const updatedPayments = [...loan.payments, newPayment];
            const totalAbonado = updatedPayments.reduce((sum, p) => sum + Number(p.montoAbonado), 0);
            const balancePendiente = Math.max(0, Number(loan.totalAPagar) - totalAbonado);
            const numCuotasAbonadas = Math.floor(totalAbonado / Number(loan.cuotaSemanal));
            const totalCuotasEstimadas = Math.ceil(Number(loan.totalAPagar) / Number(loan.cuotaSemanal));

            return {
              ...loan,
              balancePendiente,
              cuotaActual: Math.min(numCuotasAbonadas + 1, totalCuotasEstimadas),
              estado: balancePendiente <= 0 ? 'PAID' as const : 'ACTIVE' as const,
              payments: updatedPayments
            };
          }
          return loan;
        });
      });

      return newPayment;
    } catch (err: any) {
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  // Developer toggle tool to simulate ACTIVE/EXPIRED states instantly
  async toggleSubscription() {
    try {
      const res = await firstValueFrom(this.http.post<{ success: boolean; newStatus: string }>(`${this.apiUrl}/dev/toggle-subscription`, {}));
      if (res && res.success) {
        this.isExpired.set(res.newStatus === 'EXPIRED');
        await this.loadLoans();
      }
    } catch (err) {
      // Offline toggle fallback
      this.isExpired.update(val => !val);
      if (this.isExpired()) {
        this.error.set('Su suscripción ha expirado. Por favor, contacte al administrador.');
      } else {
        this.error.set(null);
        await this.loadLoans();
      }
    }
  }
}

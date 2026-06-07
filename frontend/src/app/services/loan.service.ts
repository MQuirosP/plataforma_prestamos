import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface Payment {
  id: string;
  loanId: string;
  montoAbonado: number;
  numeroRecibo: string;
  notas?: string;
  metodoPago?: 'EFECTIVO' | 'SINPE' | 'TRANSFERENCIA';
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

export interface BusinessSettings {
  id?: string;
  userId?: string;
  monedaSimbolo: string;
  monedaCodigo: string;
  nombreNegocio: string;
  plantillaWhatsapp: string;
  gananciaPorcentaje: number;
  telefono?: string;
}

export interface Subscriber {
  userId: string;
  nombre: string;
  email: string;
  telefono: string;
  subscriptionType: 'TRIAL' | 'ACTIVE' | 'EXPIRED';
  validUntil: string;
  diasRestantes: number;
}

import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LoanService {
  private apiUrl = environment.apiUrl;

  // Signals for state management
  loans = signal<Loan[]>([]);
  settings = signal<BusinessSettings | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  isExpired = signal<boolean>(false);
  
  // Auth state management
  currentUser = signal<any | null>(null);
  isLoggedIn = signal<boolean>(false);
  isNewUser = signal<boolean>(false);

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
    return this.loans().reduce((sum, l) => sum + (Number(l.totalAPagar) - Number(l.montoOriginal)), 0);
  });

  constructor(private http: HttpClient) {
    this.checkSession();
  }

  private getHeaders() {
    const token = localStorage.getItem('auth_token') || 'lender@caterpillar-saas.com';
    return {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
  }

  private checkSession() {
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('auth_user');
    if (token && user) {
      this.currentUser.set(JSON.parse(user));
      this.isLoggedIn.set(true);
      this.loadLoans();
    }
  }

  async login(email: string, name: string, inviteToken?: string) {
    this.loading.set(true);
    this.error.set(null);
    try {
      // Store token (the email) in localStorage first so getHeaders reads it
      localStorage.setItem('auth_token', email);

      // Call the real sync endpoint on backend to sync/create profile in Neon DB
      const res = await firstValueFrom(
        this.http.post<{ user: any; subscription: any; isNewUser: boolean }>(
          `${this.apiUrl}/auth/sync`,
          { inviteToken },
          this.getHeaders()
        )
      );

      if (res) {
        localStorage.setItem('auth_user', JSON.stringify(res.user));
        this.currentUser.set(res.user);
        this.isNewUser.set(res.isNewUser);
        this.isExpired.set(res.subscription?.tipo === 'EXPIRED');
        this.isLoggedIn.set(true);

        if (!res.isNewUser) {
          await this.loadLoans();
        }
      }
    } catch (err: any) {
      console.error('Login sync failed, loading fallback profile.', err);
      // Fallback local signin if offline
      const isAdmin = email.toLowerCase().includes('mario') || email.toLowerCase().includes('admin');
      const mockUser = {
        id: isAdmin ? 'mock-admin-id-999' : 'mock-lender-id-123',
        nombre: name || (isAdmin ? 'Mario Quirós (Admin)' : 'Juan Pérez Cobranzas'),
        email,
        rol: isAdmin ? 'ADMIN' : 'PRESTAMISTA'
      };
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      this.currentUser.set(mockUser);
      this.isLoggedIn.set(true);
      await this.loadLoans();
    } finally {
      this.loading.set(false);
    }
  }

  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
    this.isNewUser.set(false);
    this.loans.set([]);
    this.settings.set(null);
  }

  async loadSettings() {
    try {
      const data = await firstValueFrom(
        this.http.get<BusinessSettings>(`${this.apiUrl}/settings`, this.getHeaders())
      );
      this.settings.set(data);
    } catch (err) {
      console.warn('Failed to load settings from server, loading offline fallback.');
      this.settings.set({
        monedaSimbolo: '₡',
        monedaCodigo: 'CRC',
        nombreNegocio: 'CAT-LOAN Credit',
        plantillaWhatsapp: 'Hola {cliente}, te escribo para recordarte que tu balance pendiente es de {moneda}{saldo}. Tu cuota programada es de {moneda}{cuota}. Favor de enviar el abono a la brevedad. ¡Gracias!',
        gananciaPorcentaje: 50
      });
    }
  }

  async updateSettings(settingsData: BusinessSettings) {
    this.loading.set(true);
    try {
      const updated = await firstValueFrom(
        this.http.post<BusinessSettings>(`${this.apiUrl}/settings`, settingsData, this.getHeaders())
      );
      this.settings.set(updated);
      return updated;
    } catch (err) {
      this.settings.set(settingsData);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  async loadLoans() {
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.loadSettings();
      const data = await firstValueFrom(
        this.http.get<Loan[]>(`${this.apiUrl}/loans`, this.getHeaders())
      );
      this.loans.set(data);
      this.isExpired.set(false);
    } catch (err: any) {
      if (err.status === 403 && err.error?.expired) {
        this.isExpired.set(true);
        this.error.set(err.error.message);
      } else {
        this.error.set('No se pudo conectar al servidor. Iniciando modo offline.');
        if (!this.settings()) {
          await this.loadSettings();
        }
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
      const newLoan = await firstValueFrom(
        this.http.post<Loan>(`${this.apiUrl}/loans`, loanData, this.getHeaders())
      );
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

  async addPayment(loanId: string, montoAbonado: number, notas: string, metodoPago: 'EFECTIVO' | 'SINPE' | 'TRANSFERENCIA' = 'EFECTIVO') {
    this.loading.set(true);
    try {
      const newPayment = await firstValueFrom(
        this.http.post<Payment>(`${this.apiUrl}/loans/${loanId}/payments`, {
          montoAbonado,
          notas,
          metodoPago
        }, this.getHeaders())
      );

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

  async toggleSubscription() {
    try {
      const res = await firstValueFrom(
        this.http.post<{ success: boolean; newStatus: string }>(`${this.apiUrl}/dev/toggle-subscription`, {}, this.getHeaders())
      );
      if (res && res.success) {
        this.isExpired.set(res.newStatus === 'EXPIRED');
        await this.loadLoans();
      }
    } catch (err) {
      this.isExpired.update(val => !val);
      if (this.isExpired()) {
        this.error.set('Su suscripción ha expirado. Por favor, contacte al administrador.');
      } else {
        this.error.set(null);
        await this.loadLoans();
      }
    }
  }

  async getSubscribers(): Promise<Subscriber[]> {
    return firstValueFrom(
      this.http.get<Subscriber[]>(`${this.apiUrl}/admin/subscribers`, this.getHeaders())
    );
  }

  async renewSubscription(userId: string, days: number): Promise<any> {
    return firstValueFrom(
      this.http.post<any>(`${this.apiUrl}/admin/renew-subscription`, { userId, days }, this.getHeaders())
    );
  }
}

import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, BehaviorSubject, Observable, from, throwError } from 'rxjs';
import { map, catchError, filter, take } from 'rxjs/operators';

export enum Role {
  ADMIN = 'ADMIN',
  PRESTAMISTA = 'PRESTAMISTA',
  COBRADOR = 'COBRADOR'
}

export enum PaymentMethod {
  EFECTIVO = 'EFECTIVO',
  SINPE = 'SINPE',
  TRANSFERENCIA = 'TRANSFERENCIA'
}

export enum FineFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY'
}

export interface Payment {
  id: string;
  loanId: string;
  montoAbonado: number;
  numeroRecibo: string;
  notas?: string;
  metodoPago?: PaymentMethod;
  fechaPago: string;
}

export enum LoanStatus {
  ACTIVE = 'ACTIVE',
  PAID = 'PAID'
}

export enum SubscriptionType {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED'
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
  estado: LoanStatus;
  fechaInicio: string;
  fineAmount?: number | null;
  fineFrequency?: FineFrequency | null;
  graceDays?: number;
  multasAcumuladas?: number;
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
  timezone: string;
  nombreNegocio: string;
  plantillaWhatsapp: string;
  gananciaPorcentaje: number;
  diasMinimosPrimerCobro?: number;
  telefono?: string;
}

export interface Subscriber {
  userId: string;
  nombre: string;
  email: string;
  telefono: string;
  subscriptionType: SubscriptionType;
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

  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  refreshTokenObservable(): Observable<string> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return from(this.refreshToken()).pipe(
        map(token => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(token);
          return token;
        }),
        catchError(err => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(null);
          return throwError(() => err);
        })
      );
    } else {
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1)
      ) as Observable<string>;
    }
  }

  async refreshToken(): Promise<string> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ token: string; user: any; subscription: any }>(
          `${this.apiUrl}/auth/refresh`,
          {},
          { withCredentials: true }
        )
      );
      if (res && res.token) {
        localStorage.setItem('auth_token', res.token);
        localStorage.setItem('auth_user', JSON.stringify(res.user));
        this.currentUser.set(res.user);
        this.isExpired.set(res.subscription?.tipo === 'EXPIRED');
        return res.token;
      }
      throw new Error('No token returned');
    } catch (err: any) {
      // Only logout if the server explicitly rejects the session (401 or 403)
      if (err.status === 401 || err.status === 403) {
        this.logout(false);
      }
      throw err;
    }
  }

  async login(username: string, password: string) {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await firstValueFrom(
        this.http.post<{ token: string; user: any; subscription: any }>(
          `${this.apiUrl}/auth/login`,
          { username, password },
          { withCredentials: true }
        )
      );

      if (res && res.token) {
        localStorage.setItem('auth_token', res.token);
        localStorage.setItem('auth_user', JSON.stringify(res.user));
        this.currentUser.set(res.user);
        this.isNewUser.set(false);
        this.isExpired.set(res.subscription?.tipo === 'EXPIRED');
        this.isLoggedIn.set(true);

        await this.loadLoans();
      }
    } catch (err: any) {
      console.error('Login failed', err);
      this.error.set(err.error?.error || 'Credenciales inválidas o error de conexión');
    } finally {
      this.loading.set(false);
    }
  }

  async logout(notifyBackend = true) {
    if (notifyBackend) {
      try {
        await firstValueFrom(
          this.http.post<any>(`${this.apiUrl}/auth/logout`, {}, { withCredentials: true })
        );
      } catch (err) {
        console.warn('Failed to notify backend of logout:', err);
      }
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
    this.isNewUser.set(false);
    this.loans.set([]);
    this.settings.set(null);
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<any> {
    return firstValueFrom(
      this.http.post<any>(
        `${this.apiUrl}/auth/change-password`,
        { oldPassword, newPassword },
        this.getHeaders()
      )
    );
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
        timezone: 'America/Costa_Rica',
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
    porcentaje?: number;
    fineAmount?: number | null;
    fineFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | null;
    graceDays?: number;
    totalAPagarDirect?: number | null;
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

  async updateLoan(id: string, loanData: any) {
    this.loading.set(true);
    try {
      const updated = await firstValueFrom(
        this.http.put<{ success: boolean, loan: Loan }>(`${this.apiUrl}/loans/${id}`, loanData, this.getHeaders())
      );
      this.loans.update(current => current.map(l => l.id === id ? updated.loan : l));
      return updated.loan;
    } catch (err: any) {
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  async deleteLoan(id: string) {
    this.loading.set(true);
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/loans/${id}`, this.getHeaders())
      );
      this.loans.update(current => current.filter(l => l.id !== id));
    } catch (err: any) {
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  async addPayment(loanId: string, montoAbonado: number, notas: string, metodoPago: PaymentMethod = PaymentMethod.EFECTIVO) {
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
            const balancePendiente = Math.max(0, Number(loan.totalAPagar) + Number(loan.multasAcumuladas || 0) - totalAbonado);
            const numCuotasAbonadas = Math.floor(totalAbonado / Number(loan.cuotaSemanal));
            const totalCuotasEstimadas = Math.ceil(Number(loan.totalAPagar) / Number(loan.cuotaSemanal));

            return {
              ...loan,
              balancePendiente,
              cuotaActual: Math.min(numCuotasAbonadas, totalCuotasEstimadas),
              estado: balancePendiente <= 0 ? LoanStatus.PAID : LoanStatus.ACTIVE,
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

  async deletePayment(loanId: string, paymentId: string) {
    this.loading.set(true);
    try {
      await firstValueFrom(
        this.http.delete<any>(`${this.apiUrl}/loans/${loanId}/payments/${paymentId}`, this.getHeaders())
      );

      this.loans.update(currentLoans => {
        return currentLoans.map(loan => {
          if (loan.id === loanId) {
            const updatedPayments = loan.payments.filter(p => p.id !== paymentId);
            const totalAbonado = updatedPayments.reduce((sum, p) => sum + Number(p.montoAbonado), 0);
            const balancePendiente = Math.max(0, Number(loan.totalAPagar) + Number(loan.multasAcumuladas || 0) - totalAbonado);
            const numCuotasAbonadas = Math.floor(totalAbonado / Number(loan.cuotaSemanal));
            const totalCuotasEstimadas = Math.ceil(Number(loan.totalAPagar) / Number(loan.cuotaSemanal));

            return {
              ...loan,
              balancePendiente,
              cuotaActual: Math.min(numCuotasAbonadas, totalCuotasEstimadas),
              estado: LoanStatus.ACTIVE,
              payments: updatedPayments
            };
          }
          return loan;
        });
      });
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

  async getCobradores() {
    return firstValueFrom(
      this.http.get<any[]>(`${this.apiUrl}/cobradores`, this.getHeaders())
    );
  }

  async createCobrador(data: any) {
    return firstValueFrom(
      this.http.post<any>(`${this.apiUrl}/cobradores`, data, this.getHeaders())
    );
  }
}

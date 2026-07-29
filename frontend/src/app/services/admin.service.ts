import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoanService, Role } from './loan.service';

export interface Tenant {
  id: string;
  nombre: string;
  username: string;
  email?: string;
  telefono: string;
  plan: 'BRONCE' | 'PLATA' | 'ORO' | 'PLATINO' | 'DIAMANTE';
  suspendido: boolean;
  isTrial?: boolean;
  fechaPruebaFin?: string;
  paymentDate?: string;
  createdAt: string;
  _count?: {
    cobradores: number;
    loans: number;
  };
  cobradores?: {
    id: string;
    nombre: string;
    username: string;
    telefono: string;
  }[];
}

export interface SaaSPlanConfig {
  plan: 'BRONCE' | 'PLATA' | 'ORO' | 'PLATINO' | 'DIAMANTE';
  maxClientes: number;
  maxCobradores: number;
  precioMensual: number;
}

export interface SaasGlobalConfig {
  id: string;
  defaultTrialDays: number;
  supportWhatsappNumber: string;
  graceDays: number;
}

export interface SaaSStats {
  totalPrestamistas: number;
  totalCobradores: number;
  totalPrestamos: number;
  mrrEstimado?: number;
  alertasCobro?: {
    porVencer: number;
    vencidos: number;
  };
  planes: {
    bronce: number;
    plata: number;
    oro: number;
    platino: number;
    diamante: number;
  };
  volumenTransaccional?: number;
}


export interface SaaSLog {
  id: string;
  fecha: string;
  tipoEvento: string;
  descripcion: string;
  ip: string;
  prestamistaId?: string;
}

export interface SaaSLogResponse {
  data: SaaSLog[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private loanService: LoanService) {}

  private getHeaders() {
    const token = localStorage.getItem('auth_token') || '';
    return {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
  }

  async getTenants(): Promise<Tenant[]> {
    return firstValueFrom(this.http.get<Tenant[]>(`${this.apiUrl}/admin/tenants`, this.getHeaders()));
  }

  async createTenant(data: any): Promise<Tenant> {
    const res = await firstValueFrom(this.http.post<{ success: boolean; tenant: Tenant }>(`${this.apiUrl}/admin/tenants`, data, this.getHeaders()));
    return res.tenant;
  }

  async toggleSuspend(id: string): Promise<boolean> {
    const res = await firstValueFrom(this.http.put<{ success: boolean; suspendido: boolean }>(`${this.apiUrl}/admin/tenants/${id}/suspender`, {}, this.getHeaders()));
    return res.suspendido;
  }

  async changePlan(id: string, plan: string): Promise<string> {
    const res = await firstValueFrom(this.http.put<{ success: boolean; plan: string }>(`${this.apiUrl}/admin/tenants/${id}/plan`, { plan }, this.getHeaders()));
    return res.plan;
  }

  async updatePaymentDate(id: string, paymentDate: string | null): Promise<string | null> {
    const res = await firstValueFrom(this.http.put<{ success: boolean; paymentDate: string | null }>(`${this.apiUrl}/admin/tenants/${id}/payment-date`, { paymentDate }, this.getHeaders()));
    return res.paymentDate;
  }

  async extendTrial(id: string, options: { days?: number; targetDate?: string } | number = 7): Promise<string> {
    const payload = typeof options === 'number' ? { days: options } : options;
    const res = await firstValueFrom(this.http.put<{ success: boolean; fechaPruebaFin: string }>(`${this.apiUrl}/admin/tenants/${id}/extend-trial`, payload, this.getHeaders()));
    return res.fechaPruebaFin;
  }

  async getSaasConfig(): Promise<SaasGlobalConfig> {
    return firstValueFrom(this.http.get<SaasGlobalConfig>(`${this.apiUrl}/admin/saas-config`, this.getHeaders()));
  }

  async updateSaasConfig(config: Partial<SaasGlobalConfig>): Promise<SaasGlobalConfig> {
    const res = await firstValueFrom(this.http.put<{ success: boolean; config: SaasGlobalConfig }>(`${this.apiUrl}/admin/saas-config`, config, this.getHeaders()));
    return res.config;
  }

  async getStats(): Promise<SaaSStats> {
    return firstValueFrom(this.http.get<SaaSStats>(`${this.apiUrl}/admin/stats`, this.getHeaders()));
  }

  async getLogs(params: {
    page?: number;
    limit?: number;
    tipoEvento?: string;
    startDate?: string;
    endDate?: string;
    prestamistaId?: string;
  } = {}): Promise<SaaSLogResponse> {
    let httpParams = new HttpParams();
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
    if (params.tipoEvento) httpParams = httpParams.set('tipoEvento', params.tipoEvento);
    if (params.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params.endDate) httpParams = httpParams.set('endDate', params.endDate);
    if (params.prestamistaId) httpParams = httpParams.set('prestamistaId', params.prestamistaId);

    const headers = this.getHeaders();
    return firstValueFrom(this.http.get<SaaSLogResponse>(`${this.apiUrl}/admin/logs`, {
      ...headers,
      params: httpParams
    }));
  }

  async impersonate(prestamistaId: string) {
    const res = await firstValueFrom(this.http.post<{ success: boolean; token: string; user: any }>(`${this.apiUrl}/admin/impersonate/${prestamistaId}`, {}, this.getHeaders()));
    
    // Save current admin token before impersonating
    const currentToken = localStorage.getItem('auth_token');
    if (currentToken) {
      localStorage.setItem('admin_backup_token', currentToken);
    }
    
    localStorage.setItem('auth_token', res.token);
    // Append isImpersonating flag so UI knows to show the return button
    localStorage.setItem('auth_user', JSON.stringify({ ...res.user, isImpersonating: true }));
    
    // Reload window to apply new auth state securely
    window.location.reload();
  }

  async impersonateCobrador(cobradorId: string) {
    const res = await firstValueFrom(this.http.post<{ success: boolean; token: string; user: any }>(`${this.apiUrl}/admin/impersonate-cobrador/${cobradorId}`, {}, this.getHeaders()));
    
    // Si no tenemos backup token guardado, guardamos el de la sesión actual
    const backupToken = localStorage.getItem('admin_backup_token');
    if (!backupToken) {
      const currentToken = localStorage.getItem('auth_token');
      if (currentToken) {
        localStorage.setItem('admin_backup_token', currentToken);
      }
    }
    
    localStorage.setItem('auth_token', res.token);
    // Append isImpersonating flag so UI knows to show the return button
    localStorage.setItem('auth_user', JSON.stringify({ ...res.user, isImpersonating: true }));
    
    // Reload window to apply new auth state securely
    window.location.reload();
  }

  returnToAdmin() {
    const backupToken = localStorage.getItem('admin_backup_token');
    if (backupToken) {
      // Decode the backup token payload to restore the real admin user identity
      let adminUser: any = { id: 'admin', nombre: 'Admin', rol: Role.ADMIN };
      try {
        const payloadBase64 = backupToken.split('.')[1];
        const decoded = JSON.parse(atob(payloadBase64));
        adminUser = {
          id: decoded.id,
          nombre: decoded.nombre,
          email: decoded.email,
          rol: decoded.rol
        };
      } catch {
        // Fallback: the decode failed, keep default admin object
      }

      localStorage.setItem('auth_token', backupToken);
      localStorage.removeItem('admin_backup_token');
      localStorage.setItem('auth_user', JSON.stringify(adminUser));
      window.location.reload();
    }
  }

  async getPlanConfigs(): Promise<SaaSPlanConfig[]> {
    return firstValueFrom(this.http.get<SaaSPlanConfig[]>(`${this.apiUrl}/admin/plan-configs`, this.getHeaders()));
  }

  async updatePlanConfig(config: SaaSPlanConfig): Promise<SaaSPlanConfig> {
    const res = await firstValueFrom(this.http.put<{ success: boolean; config: SaaSPlanConfig }>(`${this.apiUrl}/admin/plan-configs`, config, this.getHeaders()));
    return res.config;
  }
}


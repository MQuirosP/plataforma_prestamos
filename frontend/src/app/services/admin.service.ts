import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoanService } from './loan.service';

export interface Tenant {
  id: string;
  nombre: string;
  username: string;
  email?: string;
  telefono: string;
  plan: 'BRONCE' | 'PLATA' | 'ORO';
  suspendido: boolean;
  fechaPruebaFin?: string;
  createdAt: string;
}

export interface SaaSStats {
  totalPrestamistas: number;
  totalCobradores: number;
  totalPrestamos: number;
  planes: {
    bronce: number;
    plata: number;
    oro: number;
  };
  volumenTransaccional: number;
}

export interface SaaSLog {
  id: string;
  fecha: string;
  tipoEvento: string;
  descripcion: string;
  ip: string;
  prestamistaId?: string;
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

  async getStats(): Promise<SaaSStats> {
    return firstValueFrom(this.http.get<SaaSStats>(`${this.apiUrl}/admin/stats`, this.getHeaders()));
  }

  async getLogs(): Promise<SaaSLog[]> {
    return firstValueFrom(this.http.get<SaaSLog[]>(`${this.apiUrl}/admin/logs`, this.getHeaders()));
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

  returnToAdmin() {
    const backupToken = localStorage.getItem('admin_backup_token');
    if (backupToken) {
      localStorage.setItem('auth_token', backupToken);
      localStorage.removeItem('admin_backup_token');
      // Set a generic admin user object or force relogin check
      const adminUser = { id: 'mock-admin-id-999', nombre: 'Admin Master', rol: 'ADMIN' };
      localStorage.setItem('auth_user', JSON.stringify(adminUser));
      window.location.reload();
    }
  }
}

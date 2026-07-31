import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Client, ClientDocument } from './loan.service';

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private apiUrl = environment.apiUrl;

  clients = signal<Client[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  private getHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
  }

  async loadClients() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await firstValueFrom(
        this.http.get<Client[]>(`${this.apiUrl}/clients`, this.getHeaders())
      );
      this.clients.set(data);
    } catch (err: any) {
      this.error.set('Error al cargar clientes');
    } finally {
      this.loading.set(false);
    }
  }

  async createClient(clientData: Partial<Client>) {
    this.loading.set(true);
    try {
      const newClient = await firstValueFrom(
        this.http.post<Client>(`${this.apiUrl}/clients`, clientData, this.getHeaders())
      );
      this.clients.update(current => [...current, newClient].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      return newClient;
    } catch (err) {
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  async updateClient(id: string, clientData: Partial<Client>) {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.put<{ success: boolean; client: Client }>(`${this.apiUrl}/clients/${id}`, clientData, this.getHeaders())
      );
      this.clients.update(current => current.map(c => c.id === id ? res.client : c));
      return res.client;
    } catch (err) {
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  async deleteClient(id: string) {
    this.loading.set(true);
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/clients/${id}`, this.getHeaders())
      );
      this.clients.update(current => current.filter(c => c.id !== id));
    } catch (err) {
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  async uploadDniPhoto(file: File): Promise<string> {
    const cloudName = 'dv74qevjc'; // Hardcoded per user knowledge
    const preset = 'ml_default';
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', preset);
    formData.append('folder', 'clientes_dni');

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    
    try {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'Error al subir imagen a Cloudinary');
      }
      const data = await response.json();
      return data.secure_url;
    } catch (err) {
      console.error('Error uploading to Cloudinary', err);
      throw new Error('Error al subir la imagen.');
    }
  }

  async addClientDocument(clientId: string, url: string, tipo: string) {
    this.loading.set(true);
    try {
      const doc = await firstValueFrom(
        this.http.post<ClientDocument>(`${this.apiUrl}/clients/${clientId}/documents`, { url, tipo }, this.getHeaders())
      );
      this.clients.update(current => current.map(c => {
        if (c.id === clientId) {
          return { ...c, documents: [...(c.documents || []), doc] };
        }
        return c;
      }));
      return doc;
    } catch (err) {
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  async deleteClientDocument(clientId: string, docId: string) {
    this.loading.set(true);
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/clients/${clientId}/documents/${docId}`, this.getHeaders())
      );
      this.clients.update(current => current.map(c => {
        if (c.id === clientId && c.documents) {
          return { ...c, documents: c.documents.filter(d => d.id !== docId) };
        }
        return c;
      }));
    } catch (err) {
      throw err;
    } finally {
      this.loading.set(false);
    }
  }
}

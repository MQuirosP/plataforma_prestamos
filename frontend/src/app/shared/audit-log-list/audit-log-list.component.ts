import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AuditLogEntry {
  id: string;
  tipoEvento: string;
  descripcion: string;
  fecha: string | Date;
  ip?: string;
  prestamistaId?: string | null;
}

@Component({
  selector: 'app-audit-log-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Loading state -->
    <div *ngIf="loading" class="text-center py-8">
      <span class="text-caterpillar text-xs font-mono animate-pulse">Cargando registros...</span>
    </div>

    <ng-container *ngIf="!loading">
      <!-- Log entries -->
      <div *ngFor="let log of logs"
           class="bg-industrial-surface border border-industrial-border rounded-lg p-3 text-xs group hover:border-caterpillar/40 transition-colors duration-150">
        <div class="flex justify-between items-start mb-1 gap-2">
          <span class="font-bold text-caterpillar uppercase tracking-wide leading-tight">{{ formatEventType(log.tipoEvento) }}</span>
          <span class="text-[10px] text-industrial-muted font-mono shrink-0">{{ log.fecha | date:'dd/MM/yy HH:mm' }}</span>
        </div>
        <p class="text-industrial-light leading-relaxed">{{ log.descripcion }}</p>
        <div *ngIf="showMeta && (log.ip || log.prestamistaId)"
             class="mt-1.5 flex gap-3 text-[9px] text-industrial-muted font-mono opacity-60">

          <span *ngIf="log.ip">IP: {{ log.ip }}</span>
          <span *ngIf="log.prestamistaId">Tenant: {{ log.prestamistaId }}</span>
        </div>
      </div>

      <!-- Empty state -->
      <div *ngIf="logs.length === 0" class="text-center py-8 text-industrial-muted text-xs">
        No se encontraron registros de actividad.
      </div>

      <!-- Pagination -->
      <div *ngIf="totalPages > 1"
           class="flex items-center justify-between border-t border-industrial-border/60 pt-4 mt-2">
        <button
          [disabled]="page <= 1"
          (click)="pageChange.emit(page - 1)"
          class="bg-industrial-surface border border-industrial-border px-3.5 py-2 rounded-lg text-xs font-bold text-industrial-light hover:text-caterpillar disabled:opacity-40 disabled:hover:text-industrial-light transition">
          Anterior
        </button>
        <span class="text-[10px] text-industrial-muted font-mono uppercase">
          Página {{ page }} de {{ totalPages }}
          <span *ngIf="total !== null && total !== undefined"> (Total: {{ total }})</span>
        </span>
        <button
          [disabled]="page >= totalPages"
          (click)="pageChange.emit(page + 1)"
          class="bg-industrial-surface border border-industrial-border px-3.5 py-2 rounded-lg text-xs font-bold text-industrial-light hover:text-caterpillar disabled:opacity-40 disabled:hover:text-industrial-light transition">
          Siguiente
        </button>
      </div>
    </ng-container>
  `
})
export class AuditLogListComponent {
  /** The log entries to display. */
  @Input() logs: AuditLogEntry[] = [];
  /** Show the loading spinner instead of the list. */
  @Input() loading = false;
  /** Current page number (1-indexed). */
  @Input() page = 1;
  /** Total number of pages. */
  @Input() totalPages = 1;
  /** Total record count (optional, shown in pagination label). */
  @Input() total: number | null = null;
  /** Whether to show the meta row (IP, tenant ID). Useful for admin view. */
  @Input() showMeta = false;

  /** Emitted when the user clicks Anterior/Siguiente. Payload is the requested page number. */
  @Output() pageChange = new EventEmitter<number>();

  formatEventType(event: string): string {
    return formatEventType(event);
  }
}

export function formatEventType(event: string): string {
  if (!event) return '';
  const map: Record<string, string> = {
    'CREAR_TENANT': 'Crear Financiera',
    'SUSPENDER_TENANT': 'Suspender Financiera',
    'ACTIVAR_TENANT': 'Activar Financiera',
    'CAMBIO_PLAN': 'Cambio de Plan',
    'ACTUALIZAR_VENCIMIENTO': 'Actualizar Vencimiento',
    'EXTENDER_TRIAL': 'Extender Prueba',
    'IMPERSONATE': 'Impersonación Admin',
    'IMPERSONATE_COBRADOR': 'Acceso a Cobrador',
    'UPDATE_SAAS_CONFIG': 'Configuración SaaS',
    'ACTUALIZAR_PLAN': 'Actualizar Config. Plan',
    'CREAR_COBRADOR': 'Crear Cobrador',
    'CREAR_LOAN': 'Crear Préstamo',
    'EDITAR_LOAN': 'Editar Préstamo',
    'ELIMINAR_LOAN': 'Eliminar Préstamo',
    'CONDONAR_MORA': 'Condonación de Mora',
    'CONDONACIÓN DE MORA': 'Condonación de Mora',
    'CONDONACION DE MORA': 'Condonación de Mora',
    'CREAR_PAGO': 'Registro de Pago',
    'AGREGAR_PAGO': 'Registro de Pago',
    'ELIMINAR_PAGO': 'Eliminación de Pago',
    'ACTUALIZAR_SETTINGS': 'Actualizar Configuración'
  };

  const cleanKey = event.trim().toUpperCase();
  if (map[cleanKey]) {
    return map[cleanKey];
  }
  if (map[event]) {
    return map[event];
  }

  return event
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());
}


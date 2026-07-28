import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  inject,
  forwardRef,
  ViewChild,
  ChangeDetectionStrategy,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormGroup,
  FormControl,
  ReactiveFormsModule,
  FormsModule
} from '@angular/forms';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatDatepickerModule, MatDateRangePicker } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';

export type DateFieldMode = 'single' | 'range';

export interface DatePreset {
  label: string;
  getValue: () => { start: Date; end: Date };
}

@Component({
  selector: 'app-date-picker-presets-header',
  standalone: true,
  imports: [CommonModule, FormsModule],

  template: `
    <div class="px-2 py-2 border-b border-industrial-border bg-industrial-dark max-w-full overflow-hidden space-y-2">
      <!-- Month & Year Selector Controls -->
      <div class="flex items-center gap-2">
        <!-- Month Select -->
        <div class="group relative flex-1 flex items-stretch rounded-lg overflow-hidden border border-industrial-border focus-within:border-caterpillar transition-colors duration-150 bg-industrial-surface">
          <select [ngModel]="selectedMonth()" (ngModelChange)="onMonthChange($event)" class="w-full bg-transparent text-white text-xs px-2.5 py-1.5 pr-6 focus:outline-none appearance-none cursor-pointer">
            <option *ngFor="let m of months; let i = index" [value]="i" class="bg-industrial-dark text-white">{{ m }}</option>
          </select>
          <div class="absolute inset-y-0 right-0 flex items-center justify-center w-6 bg-industrial-dark text-caterpillar border-l border-industrial-border pointer-events-none select-none group-hover:bg-caterpillar group-hover:text-industrial-black transition-colors duration-150">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>

        <!-- Year Select -->
        <div class="group relative w-24 flex items-stretch rounded-lg overflow-hidden border border-industrial-border focus-within:border-caterpillar transition-colors duration-150 bg-industrial-surface">
          <select [ngModel]="selectedYear()" (ngModelChange)="onYearChange($event)" class="w-full bg-transparent text-white text-xs px-2.5 py-1.5 pr-6 focus:outline-none appearance-none cursor-pointer">
            <option *ngFor="let y of years" [value]="y" class="bg-industrial-dark text-white">{{ y }}</option>
          </select>
          <div class="absolute inset-y-0 right-0 flex items-center justify-center w-6 bg-industrial-dark text-caterpillar border-l border-industrial-border pointer-events-none select-none group-hover:bg-caterpillar group-hover:text-industrial-black transition-colors duration-150">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
      </div>

      <!-- Quick Preset Chips -->
      <div #scrollContainer (wheel)="onWheel($event)" class="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 text-xs whitespace-nowrap scrollbar-none scroll-smooth">
        <button
          type="button"
          *ngFor="let preset of presets"
          (click)="selectPreset(preset)"
          class="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-industrial-surface text-industrial-light border border-industrial-border hover:border-caterpillar hover:text-caterpillar active:bg-caterpillar active:text-industrial-black transition duration-150"
        >
          {{ preset.label }}
        </button>
      </div>
    </div>
  `
})
export class DatePickerPresetsHeader {
  static activeRangeGroup?: FormGroup;
  static activePicker?: MatDateRangePicker<Date>;

  months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  years: number[] = [];
  selectedMonth = signal<number>(new Date().getMonth());
  selectedYear = signal<number>(new Date().getFullYear());

  constructor() {
    const currentYr = new Date().getFullYear();
    for (let y = currentYr - 5; y <= currentYr + 2; y++) {
      this.years.push(y);
    }
  }

  onMonthChange(mIndex: number) {
    const month = Number(mIndex);
    this.selectedMonth.set(month);
    this.updateRangeByMonthYear(month, this.selectedYear());
  }

  onYearChange(yr: number) {
    const year = Number(yr);
    this.selectedYear.set(year);
    this.updateRangeByMonthYear(this.selectedMonth(), year);
  }

  private updateRangeByMonthYear(month: number, year: number) {
    if (DatePickerPresetsHeader.activeRangeGroup) {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      DatePickerPresetsHeader.activeRangeGroup.setValue({ start, end });
    }
  }

  onWheel(event: WheelEvent) {
    if (event.deltaY !== 0) {
      event.preventDefault();
      const container = event.currentTarget as HTMLElement;
      container.scrollBy({
        left: event.deltaY > 0 ? 120 : -120,
        behavior: 'smooth'
      });
    }
  }

  presets: DatePreset[] = [
    { label: 'Hoy', getValue: () => { const d = new Date(); return { start: d, end: d }; } },
    { label: 'Ayer', getValue: () => { const d = new Date(); d.setDate(d.getDate() - 1); return { start: d, end: d }; } },
    { label: 'Últimos 7 días', getValue: () => { const e = new Date(); const s = new Date(); s.setDate(s.getDate() - 6); return { start: s, end: e }; } },
    { label: 'Últimos 30 días', getValue: () => { const e = new Date(); const s = new Date(); s.setDate(s.getDate() - 29); return { start: s, end: e }; } },
    { label: 'Este mes', getValue: () => { const n = new Date(); return { start: new Date(n.getFullYear(), n.getMonth(), 1), end: new Date(n.getFullYear(), n.getMonth() + 1, 0) }; } },
    { label: 'Mes anterior', getValue: () => { const n = new Date(); return { start: new Date(n.getFullYear(), n.getMonth() - 1, 1), end: new Date(n.getFullYear(), n.getMonth(), 0) }; } }
  ];

  selectPreset(preset: DatePreset) {
    if (DatePickerPresetsHeader.activeRangeGroup) {
      const { start, end } = preset.getValue();
      DatePickerPresetsHeader.activeRangeGroup.setValue({ start, end });
      if (DatePickerPresetsHeader.activePicker) {
        DatePickerPresetsHeader.activePicker.close();
      }
    }
  }
}


@Component({
  selector: 'app-date-field',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatIconModule
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateFieldComponent),
      multi: true
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-date-field-wrapper w-full">
      <label *ngIf="label" class="block text-xs text-industrial-muted uppercase font-mono mb-1">
        {{ label }}
      </label>

      <!-- Single Date Picker Mode -->
      <ng-container *ngIf="mode === 'single'">
        <div class="group relative flex items-stretch rounded-lg overflow-hidden border border-industrial-border focus-within:border-caterpillar transition-colors duration-150 bg-industrial-surface">
          <input
            type="text"
            [matDatepicker]="singlePicker"
            [formControl]="singleControl"
            [placeholder]="placeholder || 'DD/MM/YYYY'"
            [disabled]="disabled"
            readonly
            (click)="singlePicker.open()"
            class="w-full bg-transparent text-white text-xs px-3 py-2.5 pr-10 focus:outline-none cursor-pointer placeholder:text-industrial-muted"
          />
          <mat-datepicker #singlePicker [touchUi]="isMobile"></mat-datepicker>
          <button
            type="button"
            (click)="singlePicker.open()"
            [disabled]="disabled"
            class="absolute inset-y-0 right-0 flex items-center justify-center w-9 bg-industrial-dark text-caterpillar border-l border-industrial-border cursor-pointer group-hover:bg-caterpillar group-hover:text-industrial-black transition-colors duration-150"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          </button>
        </div>
      </ng-container>

      <!-- Range Date Picker Mode -->
      <ng-container *ngIf="mode === 'range'">
        <div class="group relative flex items-stretch rounded-lg overflow-hidden border border-industrial-border focus-within:border-caterpillar transition-colors duration-150 bg-industrial-surface">
          <div
            (click)="openRangePicker()"
            class="w-full flex items-center bg-transparent text-white text-xs px-3 py-2.5 pr-10 cursor-pointer"
          >
            <span *ngIf="rangeGroup.value.start && rangeGroup.value.end; else rangePlaceholder" class="font-mono">
              {{ formatDate(rangeGroup.value.start) }} - {{ formatDate(rangeGroup.value.end) }}
            </span>
            <ng-template #rangePlaceholder>
              <span class="text-industrial-muted font-mono">{{ placeholder || 'Seleccionar rango' }}</span>
            </ng-template>
          </div>

          <!-- Material inputs container providing DOM bounding box for CDK popover overlay alignment -->
          <mat-date-range-input [rangePicker]="rangePicker" [formGroup]="rangeGroup" class="absolute inset-0 opacity-0 pointer-events-none">
            <input matStartDate formControlName="start" placeholder="Inicio" />
            <input matEndDate formControlName="end" placeholder="Fin" />
          </mat-date-range-input>

          <mat-date-range-picker #rangePicker [touchUi]="isMobile" [calendarHeaderComponent]="customHeader">
          </mat-date-range-picker>

          <button
            type="button"
            (click)="openRangePicker()"
            [disabled]="disabled"
            class="absolute inset-y-0 right-0 flex items-center justify-center w-9 bg-industrial-dark text-caterpillar border-l border-industrial-border cursor-pointer group-hover:bg-caterpillar group-hover:text-industrial-black transition-colors duration-150 z-10"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          </button>
        </div>
      </ng-container>


    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class DateFieldComponent implements OnInit, OnDestroy, ControlValueAccessor {
  @Input() mode: DateFieldMode = 'single';
  @Input() label: string = '';
  @Input() placeholder: string = '';

  /** Emits when value changes for non-reactive forms usage if desired */
  @Output() valueChange = new EventEmitter<any>();

  @ViewChild('rangePicker') rangePicker?: MatDateRangePicker<Date>;

  customHeader = DatePickerPresetsHeader;

  private breakpointObserver = inject(BreakpointObserver);
  private sub = new Subscription();

  isMobile = false;
  disabled = false;

  openRangePicker() {
    DatePickerPresetsHeader.activeRangeGroup = this.rangeGroup;
    DatePickerPresetsHeader.activePicker = this.rangePicker;
    this.rangePicker?.open();
  }

  singleControl = new FormControl<Date | null>(null);

  rangeGroup = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null)
  });

  presets: DatePreset[] = [
    {
      label: 'Hoy',
      getValue: () => {
        const today = new Date();
        return { start: today, end: today };
      }
    },
    {
      label: 'Ayer',
      getValue: () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return { start: yesterday, end: yesterday };
      }
    },
    {
      label: 'Últimos 7 días',
      getValue: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 6);
        return { start, end };
      }
    },
    {
      label: 'Últimos 30 días',
      getValue: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 29);
        return { start, end };
      }
    },
    {
      label: 'Este mes',
      getValue: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { start, end };
      }
    },
    {
      label: 'Mes anterior',
      getValue: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        return { start, end };
      }
    }
  ];

  // ControlValueAccessor callbacks
  onChange: (val: any) => void = () => {};
  onTouched: () => void = () => {};

  ngOnInit() {
    // Monitor mobile viewport (< 768px)
    this.sub.add(
      this.breakpointObserver.observe(['(max-width: 767.98px)']).subscribe(result => {
        this.isMobile = result.matches;
      })
    );

    // Value propagation for single mode
    this.sub.add(
      this.singleControl.valueChanges.subscribe(val => {
        if (this.mode === 'single') {
          const valStr = val ? this.formatDateIso(val) : '';
          this.onChange(valStr);
          this.onTouched();
          this.valueChange.emit(valStr);
        }
      })
    );

    // Value propagation for range mode
    this.sub.add(
      this.rangeGroup.valueChanges.subscribe(val => {
        if (this.mode === 'range') {
          const startStr = val.start ? this.formatDateIso(val.start) : '';
          const endStr = val.end ? this.formatDateIso(val.end) : '';
          const result = { start: startStr, end: endStr };
          this.onChange(result);
          this.onTouched();
          this.valueChange.emit(result);
        }
      })
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  applyPreset(preset: DatePreset) {
    const { start, end } = preset.getValue();
    this.rangeGroup.setValue({ start, end });
  }

  formatDate(date: Date | null | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  formatDateIso(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ControlValueAccessor methods
  writeValue(obj: any): void {
    if (this.mode === 'single') {
      if (typeof obj === 'string' && obj) {
        const [y, m, d] = obj.split('-').map(Number);
        this.singleControl.setValue(new Date(y, m - 1, d), { emitEvent: false });
      } else if (obj instanceof Date) {
        this.singleControl.setValue(obj, { emitEvent: false });
      } else {
        this.singleControl.setValue(null, { emitEvent: false });
      }
    } else if (this.mode === 'range') {
      let startVal: Date | null = null;
      let endVal: Date | null = null;
      if (obj && typeof obj === 'object') {
        if (typeof obj.start === 'string' && obj.start) {
          const [y, m, d] = obj.start.split('-').map(Number);
          startVal = new Date(y, m - 1, d);
        } else if (obj.start instanceof Date) {
          startVal = obj.start;
        }
        if (typeof obj.end === 'string' && obj.end) {
          const [y, m, d] = obj.end.split('-').map(Number);
          endVal = new Date(y, m - 1, d);
        } else if (obj.end instanceof Date) {
          endVal = obj.end;
        }
      }
      this.rangeGroup.setValue({ start: startVal, end: endVal }, { emitEvent: false });
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) {
      this.singleControl.disable({ emitEvent: false });
      this.rangeGroup.disable({ emitEvent: false });
    } else {
      this.singleControl.enable({ emitEvent: false });
      this.rangeGroup.enable({ emitEvent: false });
    }
  }
}

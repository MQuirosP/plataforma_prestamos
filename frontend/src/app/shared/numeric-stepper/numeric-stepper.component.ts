import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

/**
 * NumericStepperComponent
 * Custom number input with industrial-themed +/- buttons.
 * Implements ControlValueAccessor so it works seamlessly with [(ngModel)].
 *
 * Usage:
 *   <app-numeric-stepper [(ngModel)]="myValue" [step]="1" [min]="0" name="myField"></app-numeric-stepper>
 */
@Component({
  selector: 'app-numeric-stepper',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NumericStepperComponent),
      multi: true
    }
  ],
  template: `
    <div class="flex items-stretch rounded-lg overflow-hidden border border-industrial-border focus-within:border-caterpillar transition-colors duration-150">
      <!-- Decrement button -->
      <button
        type="button"
        (click)="decrement()"
        [disabled]="disabled || (min !== null && value <= min)"
        class="flex items-center justify-center w-9 bg-industrial-dark text-industrial-muted
               hover:bg-caterpillar hover:text-industrial-black
               disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-industrial-dark disabled:hover:text-industrial-muted
               border-r border-industrial-border transition-colors duration-150 select-none text-base font-bold shrink-0"
        aria-label="Decrementar">
        −
      </button>

      <!-- Input -->
      <input
        type="number"
        [value]="value"
        (input)="onInput($event)"
        (blur)="onTouched()"
        [disabled]="disabled"
        [min]="min ?? undefined"
        [max]="max ?? undefined"
        [step]="step"
        [name]="name"
        [required]="required"
        class="flex-1 min-w-0 bg-industrial-surface text-white text-sm text-center px-2 py-3
               focus:outline-none disabled:opacity-50"
      >

      <!-- Increment button -->
      <button
        type="button"
        (click)="increment()"
        [disabled]="disabled || (max !== null && value >= max)"
        class="flex items-center justify-center w-9 bg-industrial-dark text-industrial-muted
               hover:bg-caterpillar hover:text-industrial-black
               disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-industrial-dark disabled:hover:text-industrial-muted
               border-l border-industrial-border transition-colors duration-150 select-none text-base font-bold shrink-0"
        aria-label="Incrementar">
        +
      </button>
    </div>
  `
})
export class NumericStepperComponent implements ControlValueAccessor {
  @Input() step: number = 1;
  @Input() min: number | null = null;
  @Input() max: number | null = null;
  @Input() name: string = '';
  @Input() required: boolean = false;

  value: number = 0;
  disabled: boolean = false;

  private onChange: (v: number) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(val: number): void {
    this.value = val ?? 0;
  }

  registerOnChange(fn: (v: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  increment(): void {
    const next = Number(this.value) + this.step;
    if (this.max === null || next <= this.max) {
      this.value = next;
      this.onChange(this.value);
    }
  }

  decrement(): void {
    const next = Number(this.value) - this.step;
    if (this.min === null || next >= this.min) {
      this.value = next;
      this.onChange(this.value);
    }
  }

  onInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const parsed = parseFloat(raw);
    this.value = isNaN(parsed) ? 0 : parsed;
    this.onChange(this.value);
  }
}

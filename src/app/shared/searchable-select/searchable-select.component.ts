import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  forwardRef,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SearchableSelectOption {
  id: string;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './searchable-select.component.html',
  styleUrl: './searchable-select.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true
    }
  ]
})
export class SearchableSelectComponent implements ControlValueAccessor, OnChanges {
  @Input() options: SearchableSelectOption[] = [];
  @Input() placeholder = 'Rechercher...';
  @Input() disabled = false;
  @Input() clearable = false;
  @Input() emptyText = 'Aucun résultat.';
  @Output() selectionChange = new EventEmitter<string>();

  query = '';
  isOpen = false;
  private value = '';
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options'] || changes['disabled']) {
      this.syncQueryFromValue();
    }
  }

  get hasValue(): boolean {
    return !!this.value;
  }

  get filteredOptions(): SearchableSelectOption[] {
    const term = this.normalize(this.query);
    if (!term) {
      return this.options;
    }
    const selected = this.options.find((option) => option.id === this.value);
    const selectedLabel = selected ? this.normalize(selected.label) : '';
    if (selectedLabel && selectedLabel === term) {
      return this.options;
    }
    return this.options.filter((option) => this.normalize(option.label).includes(term));
  }

  writeValue(value: string | null): void {
    this.value = value ?? '';
    this.syncQueryFromValue();
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  open(): void {
    if (this.disabled) {
      return;
    }
    this.isOpen = true;
  }

  onQueryInput(): void {
    if (this.disabled) {
      return;
    }
    this.isOpen = true;
  }

  selectOption(option: SearchableSelectOption): void {
    if (option.disabled) {
      return;
    }
    this.query = option.label;
    this.setValue(option.id);
    this.isOpen = false;
    this.onTouched();
  }

  clear(): void {
    if (this.disabled) {
      return;
    }
    this.query = '';
    this.setValue('');
    this.isOpen = false;
    this.onTouched();
  }

  onBlur(): void {
    window.setTimeout(() => {
      this.isOpen = false;
      this.syncQueryFromValue();
      this.onTouched();
    }, 120);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.isOpen = false;
    this.syncQueryFromValue();
  }

  private setValue(next: string): void {
    if (this.value === next) {
      return;
    }
    this.value = next;
    this.onChange(next);
    this.selectionChange.emit(next);
  }

  private syncQueryFromValue(): void {
    if (!this.value) {
      if (!this.isOpen) {
        this.query = '';
      }
      return;
    }
    const selected = this.options.find((option) => option.id === this.value);
    this.query = selected?.label ?? '';
  }

  private normalize(value: string): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}

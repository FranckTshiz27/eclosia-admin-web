import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { extractApiErrorMessage } from '../core/utils/api-error';

export type ToastType = 'error' | 'success' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  durationMs: number;
  createdAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private readonly toastsSubject = new BehaviorSubject<ToastMessage[]>([]);
  private seq = 0;
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  readonly toasts$ = this.toastsSubject.asObservable();

  error(message: string, durationMs = 6000): void {
    this.show('error', message, durationMs);
  }

  warning(message: string, durationMs = 5500): void {
    this.show('warning', message, durationMs);
  }

  success(message: string, durationMs = 4000): void {
    this.show('success', message, durationMs);
  }

  info(message: string, durationMs = 4500): void {
    this.show('info', message, durationMs);
  }

  apiError(error: unknown, fallback: string, durationMs = 6500): void {
    this.error(extractApiErrorMessage(error, fallback), durationMs);
  }

  dismiss(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.toastsSubject.next(this.toastsSubject.value.filter((toast) => toast.id !== id));
  }

  clear(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.toastsSubject.next([]);
  }

  private show(type: ToastType, message: string, durationMs: number): void {
    const text = String(message ?? '').trim();
    if (!text) {
      return;
    }

    this.seq += 1;
    const id = `toast-${this.seq}`;
    const toast: ToastMessage = {
      id,
      type,
      message: text,
      durationMs,
      createdAt: Date.now()
    };

    this.toastsSubject.next([toast, ...this.toastsSubject.value].slice(0, 5));

    const timer = setTimeout(() => this.dismiss(id), durationMs);
    this.timers.set(id, timer);
  }
}

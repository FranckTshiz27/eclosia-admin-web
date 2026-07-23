import { Directive, Input, OnDestroy, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { PermissionCode } from './permission.catalog';
import { PermissionService } from './permission.service';

type PermissionInput = PermissionCode | PermissionCode[] | null | undefined;

/**
 * Affiche l'élément si l'utilisateur possède la/les permission(s).
 *
 * @example
 * <button *appHasPermission="P.SCHOOL_CREATE">Créer</button>
 * <div *appHasPermission="[P.FINANCE_VIEW, P.PAYMENT_VIEW]; mode: 'any'">...</div>
 */
@Directive({
  selector: '[appHasPermission]',
  standalone: true
})
export class HasPermissionDirective implements OnDestroy {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly permissionService = inject(PermissionService);

  private required: PermissionCode[] = [];
  private mode: 'any' | 'all' = 'any';
  private hasView = false;
  private readonly sub: Subscription;

  constructor() {
    this.sub = this.permissionService.permissions$.subscribe(() => this.render());
  }

  @Input()
  set appHasPermission(value: PermissionInput) {
    if (Array.isArray(value)) {
      this.required = value.filter(Boolean) as PermissionCode[];
    } else {
      this.required = value ? [value] : [];
    }
    this.render();
  }

  @Input()
  set appHasPermissionMode(value: 'any' | 'all' | null | undefined) {
    this.mode = value === 'all' ? 'all' : 'any';
    this.render();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  private render(): void {
    const allowed =
      !this.required.length ||
      (this.mode === 'all'
        ? this.permissionService.hasAll(...this.required)
        : this.permissionService.hasAny(...this.required));

    if (allowed && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
      return;
    }

    if (!allowed && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}

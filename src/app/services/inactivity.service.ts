import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, timer, Subscription, fromEvent, merge } from 'rxjs';
import { takeUntil, throttleTime } from 'rxjs/operators';
import { SecurityService } from './security.service';
import { MatDialog } from '@angular/material/dialog';

/**
 * Service de gestion de l'inactivité utilisateur.
 * Version optimisée utilisant NgZone pour ne pas surcharger la détection de changement d'Angular.
 */
@Injectable({
  providedIn: 'root'
})
export class InactivityService implements OnDestroy {
  private destroy$ = new Subject<void>();
  private warningTimerSubscription?: Subscription;
  private logoutTimerSubscription?: Subscription;

  // Délais (en millisecondes)
  private readonly WARNING_TIME = 29 * 60 * 1000; // 29 minutes
  private readonly LOGOUT_TIME = 30 * 60 * 1000;  // 30 minutes
  private readonly STORAGE_KEY = 'last_activity_timestamp';

  constructor(
    private router: Router,
    private zone: NgZone,
    private securityService: SecurityService,
    private dialog: MatDialog
  ) {
    this.init();
  }

  private init() {
    // 1. Vérifier l'inactivité au démarrage (si l'utilisateur revient après une longue pause)
    this.checkInitialInactivity();

    // 2. Écouter les événements utilisateur hors de la zone Angular (optimisation performance)
    this.zone.runOutsideAngular(() => {
      const activityEvents$ = merge(
        fromEvent(window, 'mousemove'),
        fromEvent(window, 'keydown'),
        fromEvent(window, 'click'),
        fromEvent(window, 'scroll'),
        fromEvent(window, 'touchstart')
      ).pipe(
        throttleTime(1000), // On ne traite l'événement qu'une fois par seconde max
        takeUntil(this.destroy$)
      );

      activityEvents$.subscribe(() => {
        // On rentre dans la zone uniquement pour mettre à jour les timers
        this.zone.run(() => this.resetTimers());
      });
    });

    this.resetTimers();
  }

  private checkInitialInactivity() {
    const lastActivity = localStorage.getItem(this.STORAGE_KEY);
    if (lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity, 10);
      if (elapsed >= this.LOGOUT_TIME) {
        this.logout('Votre session a expiré en raison d\'une longue inactivité.');
      }
    }
  }

  private resetTimers() {
    this.updateLastActivity();
    this.stopTimers();

    // Démarrage du timer d'avertissement
    this.warningTimerSubscription = timer(this.WARNING_TIME)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.showWarning());

    // Démarrage du timer de déconnexion
    this.logoutTimerSubscription = timer(this.LOGOUT_TIME)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.logout('Vous avez été déconnecté pour inactivité.'));
  }

  private stopTimers() {
    this.warningTimerSubscription?.unsubscribe();
    this.logoutTimerSubscription?.unsubscribe();
  }

  private updateLastActivity() {
    localStorage.setItem(this.STORAGE_KEY, Date.now().toString());
  }

  private showWarning() {
    console.warn('Inactivité détectée : déconnexion imminente.');
    // Ici, tu peux ouvrir un petit snackbar ou un dialogue non-bloquant
    // this.dialog.open(InactivityWarningComponent);
  }

  /**
   * Déclenche la déconnexion (publique pour être appelée par l'intercepteur)
   */
  public logout(message: string = 'Vous avez été déconnecté.') {
    this.stopTimers();
    this.securityService.logout(true);
    alert(message);
    this.router.navigate(['/login']);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopTimers();
  }
}

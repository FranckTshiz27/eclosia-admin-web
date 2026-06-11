import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/**
 * Interface de base pour tous les repositories.
 */
export interface IRepository<T> {
  getAll(params?: any): Observable<T[]>;
  getById(id: string | number): Observable<T>;
  create(item: T): Observable<T>;
  update(id: string | number, item: T): Observable<T>;
  delete(id: string | number): Observable<void>;
}

/**
 * Classe de base abstraite pour les Repositories.
 * Elle centralise la logique HTTP et la gestion des erreurs.
 */
export abstract class BaseRepository<T> implements IRepository<T> {
  
  // L'URL de base sera définie par les classes filles (ex: /agents, /users)
  protected abstract endpoint: string;

  constructor(protected http: HttpClient, protected baseUrl: string) {}

  /**
   * Récupère tous les éléments (avec support optionnel de pagination/filtres)
   */
  getAll(params: any = {}): Observable<T[]> {
    const httpParams = new HttpParams({ fromObject: params });
    return this.http.get<T[]>(`${this.baseUrl}/${this.endpoint}`, { params: httpParams }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupère un élément par son ID
   */
  getById(id: string | number): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${this.endpoint}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crée un nouvel élément
   */
  create(item: T): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${this.endpoint}`, item).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Met à jour un élément existant
   */
  update(id: string | number, item: T): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}/${this.endpoint}/${id}`, item).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Supprime un élément
   */
  delete(id: string | number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${this.endpoint}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Gestion centralisée des erreurs HTTP
   */
  protected handleError(error: HttpErrorResponse) {
    let errorMessage = 'Une erreur inconnue est survenue.';
    
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur : ${error.error.message}`;
    } else {
      // Erreur côté serveur
      switch (error.status) {
        case 401:
          errorMessage = 'Session expirée ou accès non autorisé.';
          break;
        case 404:
          errorMessage = 'Ressource non trouvée.';
          break;
        case 500:
          errorMessage = 'Erreur interne du serveur.';
          break;
        default:
          errorMessage = error.error?.message || `Code d'erreur : ${error.status}`;
      }
    }
    
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}

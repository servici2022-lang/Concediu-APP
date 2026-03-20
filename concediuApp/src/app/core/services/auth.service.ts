import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, Role } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly tokenKey = 'access_token';
  private readonly refreshTokenKey = 'refresh_token';
  private readonly userKey = 'user_data';

  private readonly _currentUser = signal<LoginResponse['user'] | null>(this.loadUser());
  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoggedIn = computed(() => !!this._currentUser());
  readonly userRole = computed(() => this._currentUser()?.role ?? null);

  // For token refresh synchronization
  private refreshing$ = new BehaviorSubject<boolean>(false);

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((res) => this.storeSession(res)),
      catchError((err) => throwError(() => err)),
    );
  }

  logout(): void {
    this.http.post(`${this.apiUrl}/logout`, {}).subscribe({ error: () => {} });
    this.clearSession();
    this.router.navigate(['/login']);
  }

  refreshToken(): Observable<{ accessToken: string; refreshToken: string }> {
    const refreshToken = this.getRefreshToken();
    return this.http
      .post<{ accessToken: string; refreshToken: string }>(`${this.apiUrl}/refresh-token`, {
        refreshToken,
      })
      .pipe(
        tap((tokens) => {
          localStorage.setItem(this.tokenKey, tokens.accessToken);
          localStorage.setItem(this.refreshTokenKey, tokens.refreshToken);
        }),
        catchError((err) => {
          this.clearSession();
          this.router.navigate(['/login']);
          return throwError(() => err);
        }),
      );
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  hasRole(...roles: Role[]): boolean {
    const role = this._currentUser()?.role;
    return !!role && roles.includes(role);
  }

  hasAnyRole(roles: Role[]): boolean {
    return this.hasRole(...roles);
  }

  get isRefreshing$(): BehaviorSubject<boolean> {
    return this.refreshing$;
  }

  private storeSession(res: LoginResponse): void {
    localStorage.setItem(this.tokenKey, res.accessToken);
    localStorage.setItem(this.refreshTokenKey, res.refreshToken);
    localStorage.setItem(this.userKey, JSON.stringify(res.user));
    this._currentUser.set(res.user);
  }

  private clearSession(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
    this._currentUser.set(null);
  }

  private loadUser(): LoginResponse['user'] | null {
    try {
      const data = localStorage.getItem(this.userKey);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }
}

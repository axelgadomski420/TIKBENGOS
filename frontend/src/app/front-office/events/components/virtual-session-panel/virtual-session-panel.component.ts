// src/app/front-office/events/components/virtual-session-panel/virtual-session-panel.component.ts
//
import {
  Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule  } from '@angular/forms';
import { Subject, interval, takeUntil, catchError } from 'rxjs';
import { of } from 'rxjs';

import {
  VirtualSessionService,
  VirtualSessionResponse,
  JoinSessionResponse
} from '../../../../back-office/events/services/virtual-session.service';

type PanelState =
  | 'loading'
  | 'no-session'
  | 'scheduled'
  | 'open-blocked'    // salle ouverte, user non confirmé
  | 'waiting-mod'     // salle ouverte, confirmé, admin pas encore là ← FIX
  | 'mod-login'       // admin doit saisir le mot de passe
  | 'open-ready'      // confirmé + sessionStarted → peut rejoindre
  | 'joined'
  | 'closed'
  | 'archived';

@Component({
  selector: 'app-virtual-session-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './virtual-session-panel.component.html',
  styleUrls: ['./virtual-session-panel.component.css']
})
export class VirtualSessionPanelComponent implements OnInit, OnDestroy, OnChanges {

  @Input({ required: true }) eventId!: number;
  @Input() userId:  number | null = null;
  @Input() isAdmin: boolean       = false;

  session:      VirtualSessionResponse | null = null;
  joinResponse: JoinSessionResponse | null    = null;
  panelState:   PanelState                    = 'loading';

  joining     = false;
  leaving     = false;
  errorMsg    = '';
  modPassword = '';

  countdown = 0;
  private countdownTimer: any;
  private refreshTimer:   any;
  private destroy$ = new Subject<void>();

  constructor(
    private virtualService: VirtualSessionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadSession();
    // Rafraîchissement toutes les 20 secondes (détecte l'ouverture de la salle, le démarrage)
    this.refreshTimer = setInterval(() => {
      if (this.panelState !== 'joined') this.loadSession();
    }, 20_000);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['eventId'] || changes['userId']) && !changes['eventId']?.firstChange) {
      this.reset();
      this.loadSession();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    clearInterval(this.countdownTimer);
    clearInterval(this.refreshTimer);
    // Auto-leave si encore connecté
    if (this.panelState === 'joined' && this.userId) {
      this.virtualService.leaveSession(this.eventId, this.userId).subscribe();
    }
  }

  // ── Chargement ───────────────────────────────────────────────

  loadSession(): void {
    if (!this.userId) {
      this.panelState = 'no-session';
      this.cdr.markForCheck();
      return;
    }

    const obs$ = this.isAdmin
      ? this.virtualService.getSessionForAdmin(this.eventId, this.userId)
      : this.virtualService.getSession(this.eventId, this.userId);

    obs$.pipe(catchError(() => of(null)), takeUntil(this.destroy$))
      .subscribe(session => {
        if (!session) {
          this.panelState = 'no-session';
        } else {
          this.session = session;
          if (this.panelState !== 'joined') {
            this.resolvePanelState();
          }
        }
        this.cdr.markForCheck();
      });
  }

  refresh(): void { this.loadSession(); }

  // ── Résolution de l'état ──────────────────────────────────────

  /**
   * ✅ LOGIQUE COMPLÈTE ET COHÉRENTE
   *
   * Règles :
   *   SCHEDULED → countdown jusqu'à accessWindowStart
   *
   *   OPEN + isAdmin                          → mod-login (saisie mot de passe)
   *   OPEN + !isAdmin + canJoinNow            → open-ready (peut rejoindre)
   *   OPEN + !isAdmin + waitingForModerator   → waiting-mod (confirmé, attend admin)
   *   OPEN + !isAdmin + !isConfirmedParticipant → open-blocked (non inscrit/confirmé)
   *
   *   CLOSED  → closed
   *   ARCHIVED → archived
   */
  private resolvePanelState(): void {
    const s = this.session;
    if (!s) { this.panelState = 'no-session'; return; }

    switch (s.status) {
      case 'SCHEDULED':
        this.panelState = 'scheduled';
        this.startCountdown(s.accessWindowStart);
        break;

      case 'OPEN':
        this.stopCountdown();
        if (this.isAdmin) {
          this.panelState = 'mod-login';
        } else if (s.canJoinNow) {
          this.panelState = 'open-ready';
        } else if (s.waitingForModerator || s.isConfirmedParticipant) {
          // Confirmé mais admin pas encore là → waiting-mod
          this.panelState = 'waiting-mod';
        } else {
          // Non confirmé → bloqué
          this.panelState = 'open-blocked';
        }
        break;

      case 'CLOSED':
        this.panelState = 'closed';
        this.stopCountdown();
        break;

      case 'ARCHIVED':
        this.panelState = 'archived';
        this.stopCountdown();
        break;
    }
  }

  // ── Actions ──────────────────────────────────────────────────

  /**
   * Admin clique "Start session" avec son mot de passe.
   * Si correct → sessionStarted=true côté backend, participants notifiés,
   * URL Jitsi avec [MOD] retournée.
   */
  joinAsModerator(): void {
    if (!this.userId || !this.modPassword.trim() || this.joining) return;
    this.joining = true;
    this.errorMsg = '';

    this.virtualService.joinAsModerator(this.eventId, this.userId, this.modPassword.trim())
      .pipe(
        catchError(err => {
          this.errorMsg = err?.error?.message || 'Unable to join as moderator';
          this.joining  = false;
          this.cdr.markForCheck();
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(res => {
        if (res?.canJoin && res.roomUrl) {
          this.joinResponse = res;
          this.panelState   = 'joined';
          window.open(res.roomUrl, '_blank', 'noopener,noreferrer');
          this.modPassword = '';
        } else if (res) {
          this.errorMsg = res.message || 'Unable to start the session';
        }
        this.joining = false;
        this.cdr.markForCheck();
      });
  }

  /**
   * Participant clique "Join virtual room".
   * Si sessionStarted=false → retourne waitingForModerator=true sans ouvrir Jitsi.
   * Si sessionStarted=true  → URL Jitsi retournée, ouvre dans un nouvel onglet.
   */
  joinAsParticipant(): void {
    if (!this.userId || this.joining) return;
    this.joining  = true;
    this.errorMsg = '';

    this.virtualService.joinAsParticipant(this.eventId, this.userId)
      .pipe(
        catchError(err => {
          this.errorMsg = err?.error?.message || 'Unable to join the session';
          this.joining  = false;
          this.cdr.markForCheck();
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(res => {
        if (!res) { this.joining = false; return; }

        if (res.canJoin && res.roomUrl) {
          this.joinResponse = res;
          this.panelState   = 'joined';
          window.open(res.roomUrl, '_blank', 'noopener,noreferrer');
        } else if (res.waitingForModerator) {
          // Le backend dit d'attendre → on affiche waiting-mod
          this.panelState = 'waiting-mod';
          this.errorMsg   = '';
        } else {
          // Autre blocage (hors fenêtre, statut incorrect…)
          this.errorMsg = res.message;
        }
        this.joining = false;
        this.cdr.markForCheck();
      });
  }

  /** Rouvre l'onglet Jitsi si l'utilisateur l'a fermé */
  reopenRoom(): void {
    if (this.joinResponse?.roomUrl) {
      window.open(this.joinResponse.roomUrl, '_blank', 'noopener,noreferrer');
    }
  }

  /** Enregistre la sortie côté backend et recharge l'état */
  leave(): void {
    if (!this.userId || this.leaving) return;
    this.leaving = true;

    this.virtualService.leaveSession(this.eventId, this.userId)
      .pipe(catchError(() => of(null)), takeUntil(this.destroy$))
      .subscribe(() => {
        this.joinResponse = null;
        this.leaving      = false;
        this.loadSession();
        this.cdr.markForCheck();
      });
  }

  // ── Countdown ────────────────────────────────────────────────

  private startCountdown(startStr: string): void {
    this.stopCountdown();
    const update = () => {
      const diff = new Date(startStr).getTime() - Date.now();
      this.countdown = Math.max(0, Math.ceil(diff / 1000));
      // Quand le countdown atteint 0 → recharger pour passer à OPEN
      if (this.countdown === 0) this.loadSession();
      this.cdr.markForCheck();
    };
    update();
    this.countdownTimer = setInterval(update, 1000);
  }

  private stopCountdown(): void {
    clearInterval(this.countdownTimer);
    this.countdown = 0;
  }

  get countdownFormatted(): string {
    const h = Math.floor(this.countdown / 3600);
    const m = Math.floor((this.countdown % 3600) / 60);
    const s = this.countdown % 60;
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
    if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
    return `${s}s`;
  }

  fmtDateTime(d: string): string {
    return new Date(d).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }

  private reset(): void {
    this.session      = null;
    this.joinResponse = null;
    this.panelState   = 'loading';
    this.errorMsg     = '';
    this.modPassword  = '';
    this.stopCountdown();
  }
}
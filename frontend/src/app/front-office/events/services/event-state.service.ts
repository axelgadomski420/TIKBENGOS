import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, forkJoin, of } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  finalize,
  map,
  takeUntil,
} from 'rxjs/operators';

import { AuthService } from '../../../auth/auth.service';
import {
  EventParticipantRequest,
  EventParticipantResponse,
  WaitlistResponse,
} from '../models/event.models';
import { EventService } from './event.service';
import { EventToastService } from './event-toast.service';

export type RegStatus = 'CONFIRMED' | 'PENDING' | 'REJECTED' | null;
export type WaitStatus = 'WAITING' | 'NOTIFIED' | 'EXPIRED' | null;

export interface EventUserState {
  eventId: number;
  regStatus: RegStatus;
  regEntryId: number | null;
  numberOfSeats: number;
  waitStatus: WaitStatus;
  waitEntryId: number | null;
  waitPosition: number | null;
  waitPeopleAhead: number | null;
  confirmDeadline: string | null;
  minutesLeft: number | null;
}

export type StateMap = Map<number, EventUserState>;

@Injectable({ providedIn: 'root' })
export class EventStateService implements OnDestroy {
  private readonly stateMapSubject = new BehaviorSubject<StateMap>(new Map());
  readonly stateMap$ = this.stateMapSubject.asObservable();

  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  readonly loading$ = this.loadingSubject.asObservable();

  private readonly destroy$ = new Subject<void>();

  constructor(
    private eventService: EventService,
    private auth: AuthService,
    private eventToast: EventToastService,
  ) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getState(eventId: number): EventUserState | null {
    return this.stateMapSubject.getValue().get(eventId) ?? null;
  }

  state$(eventId: number): Observable<EventUserState | null> {
    return this.stateMap$.pipe(
      map(stateMap => stateMap.get(eventId) ?? null),
      distinctUntilChanged(),
    );
  }

  refreshAll(): void {
    const userId = this.currentUserId();
    if (!userId || !this.auth.hasRole('USER')) {
      this.stateMapSubject.next(new Map());
      return;
    }

    this.loadingSubject.next(true);

    const registrations$ = this.eventService.getMyRegistrations(userId, 0, 500).pipe(
      catchError(() => of({ content: [] as EventParticipantResponse[], totalElements: 0 })),
    );
    const waitlist$ = this.eventService.getMyWaitlistEntries(userId, 0, 500).pipe(
      catchError(() => of({ content: [] as WaitlistResponse[], totalElements: 0 })),
    );

    forkJoin([registrations$, waitlist$])
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loadingSubject.next(false)),
      )
      .subscribe({
        next: ([registrationPage, waitlistPage]) => {
          const nextState = new Map<number, EventUserState>();

          for (const registration of registrationPage.content) {
            if (!registration.eventId) {
              continue;
            }

            const state = this.createBlankState(registration.eventId);
            state.regStatus = registration.status as RegStatus;
            state.regEntryId = registration.id ?? null;
            state.numberOfSeats = registration.numberOfSeats ?? 1;
            nextState.set(registration.eventId, state);
          }

          for (const waitlistEntry of waitlistPage.content) {
            if (!waitlistEntry.eventId) {
              continue;
            }

            const state = nextState.get(waitlistEntry.eventId) ?? this.createBlankState(waitlistEntry.eventId);
            state.waitStatus = waitlistEntry.status as WaitStatus;
            state.waitEntryId = waitlistEntry.id ?? null;
            state.waitPosition = waitlistEntry.position ?? null;
            state.waitPeopleAhead = waitlistEntry.peopleAhead ?? null;
            state.confirmDeadline = waitlistEntry.confirmationDeadline ?? null;
            state.minutesLeft = waitlistEntry.minutesRemainingToConfirm ?? null;
            nextState.set(waitlistEntry.eventId, state);
          }

          this.stateMapSubject.next(nextState);
        },
      });
  }

  patchState(eventId: number, patch: Partial<EventUserState>): void {
    const stateMap = new Map(this.stateMapSubject.getValue());
    const current = stateMap.get(eventId) ?? this.createBlankState(eventId);
    stateMap.set(eventId, { ...current, ...patch });
    this.stateMapSubject.next(stateMap);
  }

  clearState(eventId: number): void {
    const stateMap = new Map(this.stateMapSubject.getValue());
    stateMap.delete(eventId);
    this.stateMapSubject.next(stateMap);
  }

  register(eventId: number, request: EventParticipantRequest): Observable<void> {
    const userId = this.currentUserId()!;
    this.patchState(eventId, { regStatus: 'PENDING', numberOfSeats: request.numberOfSeats });

    return new Observable(observer => {
      this.eventService.register(eventId, userId, request).subscribe({
        next: response => {
          this.patchState(eventId, {
            regStatus: response.status as RegStatus,
            regEntryId: response.id ?? null,
            numberOfSeats: response.numberOfSeats ?? request.numberOfSeats,
          });
          this.eventToast.success('Registration updated', this.getRegistrationSuccessMessage(response.status as RegStatus));
          this.refreshAll();
          observer.next();
          observer.complete();
        },
        error: error => {
          this.clearState(eventId);
          this.eventToast.error('Registration failed', error.error?.message || 'We could not complete your registration.');
          observer.error(error);
        },
      });
    });
  }

  cancelRegistration(eventId: number): Observable<void> {
    const userId = this.currentUserId()!;
    const previousState = this.getState(eventId);

    this.patchState(eventId, { regStatus: null, regEntryId: null });

    return new Observable(observer => {
      this.eventService.leaveEvent(eventId, userId).subscribe({
        next: () => {
          this.clearState(eventId);
          this.eventToast.success('Participation cancelled', 'Your registration has been cancelled.');
          this.refreshAll();
          observer.next();
          observer.complete();
        },
        error: error => {
          if (previousState) {
            this.patchState(eventId, previousState);
          }
          this.eventToast.error('Cancellation failed', error.error?.message || 'We could not cancel your participation.');
          observer.error(error);
        },
      });
    });
  }

  joinWaitlist(eventId: number, request: EventParticipantRequest): Observable<void> {
    const userId = this.currentUserId()!;
    this.patchState(eventId, { waitStatus: 'WAITING', waitPosition: null });

    return new Observable(observer => {
      this.eventService.joinWaitlist(eventId, userId, request).subscribe({
        next: response => {
          this.patchState(eventId, {
            waitStatus: 'WAITING',
            waitEntryId: response.id ?? null,
            waitPosition: response.position ?? null,
            waitPeopleAhead: response.peopleAhead ?? null,
          });
          this.eventToast.success('Added to waitlist', `You are now on the waitlist in position #${response.position}.`);
          this.refreshAll();
          observer.next();
          observer.complete();
        },
        error: error => {
          this.clearState(eventId);
          this.eventToast.error('Waitlist join failed', error.error?.message || 'We could not add you to the waitlist.');
          observer.error(error);
        },
      });
    });
  }

  leaveWaitlist(eventId: number): Observable<void> {
    const userId = this.currentUserId()!;
    const previousState = this.getState(eventId);

    this.patchState(eventId, { waitStatus: null, waitEntryId: null, waitPosition: null });

    return new Observable(observer => {
      this.eventService.leaveWaitlist(eventId, userId).subscribe({
        next: () => {
          this.clearState(eventId);
          this.eventToast.success('Left waitlist', 'You have been removed from the waitlist.');
          this.refreshAll();
          observer.next();
          observer.complete();
        },
        error: error => {
          if (previousState) {
            this.patchState(eventId, previousState);
          }
          this.eventToast.error('Waitlist removal failed', error.error?.message || 'We could not remove you from the waitlist.');
          observer.error(error);
        },
      });
    });
  }

  confirmWaitlistOffer(eventId: number): Observable<void> {
    const userId = this.currentUserId()!;

    return new Observable(observer => {
      this.eventService.confirmWaitlistEntry(eventId, userId).subscribe({
        next: () => {
          this.patchState(eventId, {
            waitStatus: null,
            waitEntryId: null,
            regStatus: 'CONFIRMED',
          });
          this.eventToast.success('Spot confirmed', 'Your waitlist offer has been confirmed and your registration is now active.');
          this.refreshAll();
          observer.next();
          observer.complete();
        },
        error: error => {
          const message = error.error?.message || 'We could not confirm your waitlist offer.';
          this.eventToast.error('Confirmation failed', message);
          if (message.toLowerCase().includes('expir')) {
            this.patchState(eventId, { waitStatus: 'EXPIRED' });
          }
          observer.error(error);
        },
      });
    });
  }

  currentUserId(): number | null {
    const user = this.auth.getCurrentUser?.();
    if (user?.id) {
      return user.id;
    }

    try {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.id ?? parsed.userId ?? null;
      }
    } catch {}

    return null;
  }

  isConfirmed(eventId: number): boolean {
    return this.getState(eventId)?.regStatus === 'CONFIRMED';
  }

  isPending(eventId: number): boolean {
    return this.getState(eventId)?.regStatus === 'PENDING';
  }

  isRejected(eventId: number): boolean {
    return this.getState(eventId)?.regStatus === 'REJECTED';
  }

  isOnWaitlist(eventId: number): boolean {
    const waitStatus = this.getState(eventId)?.waitStatus;
    return waitStatus === 'WAITING' || waitStatus === 'NOTIFIED';
  }

  isNotified(eventId: number): boolean {
    return this.getState(eventId)?.waitStatus === 'NOTIFIED';
  }

  isExpired(eventId: number): boolean {
    return this.getState(eventId)?.waitStatus === 'EXPIRED';
  }

  hasAnyState(eventId: number): boolean {
    const state = this.getState(eventId);
    return !!(state?.regStatus || state?.waitStatus);
  }

  private createBlankState(eventId: number): EventUserState {
    return {
      eventId,
      regStatus: null,
      regEntryId: null,
      numberOfSeats: 1,
      waitStatus: null,
      waitEntryId: null,
      waitPosition: null,
      waitPeopleAhead: null,
      confirmDeadline: null,
      minutesLeft: null,
    };
  }

  private getRegistrationSuccessMessage(status: RegStatus): string {
    if (status === 'CONFIRMED') {
      return 'Your registration is confirmed.';
    }

    if (status === 'PENDING') {
      return 'Your registration has been submitted and is waiting for organizer approval.';
    }

    return 'Your registration has been saved.';
  }
}

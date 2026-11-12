import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  NgZone,
  OnDestroy,
  Output,
  ViewChild
} from '@angular/core';
import { environment } from '../../../environments/environment';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

@Component({
  selector: 'app-google-signin-button',
  templateUrl: './google-signin-button.component.html',
  styleUrl: './google-signin-button.component.css'
})
export class GoogleSignInButtonComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: false }) container?: ElementRef<HTMLDivElement>;
  @Output() idToken = new EventEmitter<string>();

  readonly clientId = environment.googleClientId?.trim() ?? '';
  readonly missingConfig = !this.clientId;

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit(): void {
    if (this.missingConfig) {
      return;
    }
    queueMicrotask(() => this.tryRender());
  }

  private tryRender(attempt = 0): void {
    if (!this.container?.nativeElement || this.missingConfig) {
      return;
    }
    const g = window.google;
    if (!g?.accounts?.id) {
      if (attempt < 50) {
        setTimeout(() => this.tryRender(attempt + 1), 100);
      }
      return;
    }
    const el = this.container.nativeElement;
    el.innerHTML = '';
    g.accounts.id.initialize({
      client_id: this.clientId,
      callback: (resp: { credential: string }) => {
        this.ngZone.run(() => this.idToken.emit(resp.credential));
      },
      auto_select: false,
      cancel_on_tap_outside: true
    });
    g.accounts.id.renderButton(el, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      width: 320,
      locale: 'en'
    });
  }

  ngOnDestroy(): void {
    this.container?.nativeElement && (this.container.nativeElement.innerHTML = '');
  }
}

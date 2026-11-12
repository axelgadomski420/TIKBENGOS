import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, SessionUser } from '../../auth/auth.service';
import { CartService } from '../services/cart.service';
import { NotificationService } from '../services/notification.service';
import { AppNotification } from '../models/notification.model';
import { CommunityRealtimeService } from '../../front-office/community/services/community-realtime.service';

interface NavLink {
  path: string;
  label: string;
  icon: string;
  iconType?: 'fa' | 'material';
  exact?: boolean;
  roles?: string[];
  requiresLogin?: boolean;
}

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit, OnDestroy {
  mobileMenuOpen = false;
  userMenuOpen = false;
  notificationsOpen = false;
  compactNav = false;
  recentNotifications: AppNotification[] = [];
  unreadNotificationCount = 0;
  private readonly realtimeUnsubscribers: Array<() => void> = [];
  private readonly compactNavBreakpoint = 1180;
  readonly cartCount$;
  readonly frontOfficeLinks: NavLink[] = [
    { path: '/app', label: 'Home', icon: 'fa-home', exact: true },
    { path: '/app/services', label: 'Services', icon: 'fa-stethoscope' },
    { path: '/app/adoption', label: 'Adoption', icon: 'fa-heart' },
    { path: '/app/events', label: 'Events', icon: 'fa-calendar-days' },
    { path: '/app/marketplace', label: 'Marketplace', icon: 'fa-store' },
    { path: '/app/transit', label: 'Transit', icon: 'flight_takeoff', iconType: 'material' },
    { path: '/app/community', label: 'Community', icon: 'fa-users' }
  ];

  constructor(
    private auth: AuthService,
    private router: Router,
    private notificationService: NotificationService,
    private communityRealtimeService: CommunityRealtimeService,
    cartService: CartService
  ) {
    this.cartCount$ = cartService.getCartCount();
    this.compactNav = this.isCompactViewport();
  }

  ngOnInit(): void {
    this.applyViewportMode();
    this.notificationService.unreadCount$.subscribe((count) => {
      this.unreadNotificationCount = count;
    });
    this.refreshNotifications();

    const userId = this.currentUser?.id;
    if (userId) {
      this.communityRealtimeService.connect(userId);
      this.realtimeUnsubscribers.push(
        this.communityRealtimeService.subscribeToNotificationCount(userId, (count) => {
          if (!Number.isNaN(count)) {
            this.unreadNotificationCount = count;
          }
        })
      );
      this.realtimeUnsubscribers.push(
        this.communityRealtimeService.subscribeToUserNotifications(userId, (event) => {
          this.recentNotifications = [event, ...this.recentNotifications].slice(0, 8);
          this.unreadNotificationCount = this.unreadNotificationCount + 1;
        })
      );
    }
  }

  ngOnDestroy(): void {
    this.realtimeUnsubscribers.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch {
        // Ignore cleanup errors.
      }
    });
  }

  get currentUser(): SessionUser | null { return this.auth.getCurrentUser(); }

  get currentRole(): string | null {
    return this.currentUser?.role?.toUpperCase() ?? null;
  }

  hasRole(...roles: string[]): boolean {
    const role = this.currentRole;
    return !!role && roles.includes(role);
  }

  get canSeeAdminPortal(): boolean {
    return this.hasRole('ADMIN');
  }

  get canSeeServiceManagement(): boolean {
    return this.hasRole('SERVICE_PROVIDER');
  }

  getLinkPath(link: NavLink): string {
    if (link.path === '/app/services' && this.canSeeServiceManagement) {
      return '/admin/services';
    }
    return link.path;
  }

  get visibleFrontOfficeLinks(): NavLink[] {
    return this.frontOfficeLinks.filter((link) => this.canAccessLink(link));
  }

  get canSeeDashboardShortcut(): boolean {
    return this.hasRole('USER', 'SERVICE_PROVIDER', 'ADMIN');
  }

  get canSeeInboxShortcut(): boolean {
    return !!this.currentUser;
  }

  private canAccessLink(link: NavLink): boolean {
    if (!link.requiresLogin) return true;
    if (!this.currentRole) return false;
    if (!link.roles?.length) return true;
    return link.roles.includes(this.currentRole);
  }

  logout(): void {
    this.userMenuOpen = false;
    this.mobileMenuOpen = false;
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }

  closeAllMenus(): void {
    this.userMenuOpen = false;
    this.mobileMenuOpen = false;
    this.notificationsOpen = false;
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    if (this.mobileMenuOpen) {
      this.userMenuOpen = false;
    }
  }

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
    if (this.userMenuOpen) {
      this.mobileMenuOpen = false;
      this.notificationsOpen = false;
    }
  }

  toggleNotifications(): void {
    this.notificationsOpen = !this.notificationsOpen;
    if (this.notificationsOpen) {
      this.userMenuOpen = false;
      this.mobileMenuOpen = false;
      this.refreshNotifications();
    }
  }

  markAllNotificationsRead(): void {
    const userId = this.currentUser?.id;
    if (!userId) {
      return;
    }

    this.notificationService.markAllRead(userId).subscribe({
      next: () => {
        this.recentNotifications = this.recentNotifications.map(item => ({ ...item, read: true }));
      },
      error: () => {
        // Ignore transient failures to keep navigation responsive.
      }
    });
  }

  clearNotificationsTray(): void {
    const userId = this.currentUser?.id;
    if (!userId) {
      return;
    }

    this.notificationService.clearAll(userId).subscribe({
      next: () => {
        this.recentNotifications = [];
        this.unreadNotificationCount = 0;
      },
      error: () => {
        // Ignore transient failures to keep navigation responsive.
      }
    });
  }

  clearNotification(item: AppNotification, event: MouseEvent): void {
    event.stopPropagation();

    const userId = this.currentUser?.id;
    if (!userId) {
      return;
    }

    this.notificationService.clearOne(userId, item.id).subscribe({
      next: () => {
        this.recentNotifications = this.recentNotifications.filter(current => current.id !== item.id);
      },
      error: () => {
        // Ignore transient failures to keep navigation responsive.
      }
    });
  }

  openNotification(item: AppNotification): void {
    const userId = this.currentUser?.id;
    if (!userId) {
      return;
    }

    const onDone = () => {
      this.notificationsOpen = false;
      if (item.deepLink) {
        this.router.navigateByUrl(item.deepLink);
      }
    };

    if (!item.read) {
      this.notificationService.markRead(userId, item.id).subscribe({
        next: () => {
          this.recentNotifications = this.recentNotifications.map(current =>
            current.id === item.id ? { ...current, read: true } : current
          );
          onDone();
        },
        error: onDone
      });
      return;
    }

    onDone();
  }

  formatNotificationTime(isoDate: string): string {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const now = Date.now();
    const diffMs = Math.max(0, now - date.getTime());
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) {
      return 'just now';
    }
    if (minutes < 60) {
      return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h`;
    }

    const days = Math.floor(hours / 24);
    if (days < 7) {
      return `${days}d`;
    }

    return date.toLocaleDateString();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.applyViewportMode();
  }

  private applyViewportMode(): void {
    const nextCompact = this.isCompactViewport();
    if (this.compactNav === nextCompact) {
      return;
    }

    this.compactNav = nextCompact;
    this.closeAllMenus();
  }

  private isCompactViewport(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < this.compactNavBreakpoint;
  }

  private refreshNotifications(): void {
    const userId = this.currentUser?.id;
    if (!userId) {
      this.recentNotifications = [];
      this.unreadNotificationCount = 0;
      return;
    }

    this.notificationService.list(userId, false, 0, 8).subscribe({
      next: (response) => {
        this.recentNotifications = response.notifications ?? [];
      },
      error: () => {
        // Ignore transient failures to keep navigation responsive.
      }
    });
    this.notificationService.refreshUnreadCount(userId);
  }
}

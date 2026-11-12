import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

interface SidebarLink {
  path: string;
  label: string;
  iconClass: string;
  iconColorClass: string;
}

interface TransitSubLink {
  path: string;
  label: string;
  icon: string;
}

interface MarketplaceSubLink {
  path: string;
  label: string;
  icon: string;
}

interface CommunitySubLink {
  path: string;
  label: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {
  @Input() isOpen = true;

  communityExpanded = false;
  transitExpanded = false;
  eventsExpanded = false;
  marketplaceExpanded = false;

  readonly topAdminLinks: SidebarLink[] = [
    { path: '/admin/users', label: 'Users', iconClass: 'fa-solid fa-users', iconColorClass: 'icon-users' },
    { path: '/admin/pets', label: 'Pets', iconClass: 'fa-solid fa-paw', iconColorClass: 'icon-pets' }
  ];

  readonly bottomAdminLinks: SidebarLink[] = [
    { path: '/admin/services/provider-request-admin', label: 'Services', iconClass: 'fa-solid fa-stethoscope', iconColorClass: 'icon-services' },
    { path: '/admin/adoption', label: 'Adoption', iconClass: 'fa-solid fa-heart', iconColorClass: 'icon-adoption' }
  ];

  readonly eventsLinks: TransitSubLink[] = [
    { path: '/admin/events', label: 'Overview', icon: 'space_dashboard' },
    { path: '/admin/events/categories', label: 'Events Management', icon: 'category' },
    { path: '/admin/events/dashboard', label: 'Dashboard', icon: 'insights' },
    { path: '/admin/events/popularity', label: 'Popularity', icon: 'trending_up' }
  ];

  readonly transitLinks: TransitSubLink[] = [
    { path: '/admin/transit/overview', label: 'Overview', icon: 'space_dashboard' },
    { path: '/admin/transit/destinations', label: 'Destinations', icon: 'place' },
    { path: '/admin/transit/travel-plans', label: 'Travel Plans', icon: 'card_travel' },
    { path: '/admin/transit/feedback', label: 'Feedback', icon: 'reviews' }
  ];

  readonly marketplaceLinks: MarketplaceSubLink[] = [
    { path: '/admin/marketplace', label: 'Overview', icon: 'space_dashboard' },
    { path: '/admin/marketplace/products', label: 'Products', icon: 'store' },
    { path: '/admin/marketplace/orders', label: 'Orders', icon: 'receipt_long' },
    { path: '/admin/marketplace/reclamations', label: 'Reclamations', icon: 'support_agent' },
    { path: '/admin/marketplace/forecast', label: 'Forecast', icon: 'insights' }
  ];

  readonly communityLinks: CommunitySubLink[] = [
    {
      path: '/admin/community/overview',
      label: 'Overview',
      icon: 'space_dashboard',
      description: 'Health, readiness, and priorities'
    },
    {
      path: '/admin/community/communities',
      label: 'Communities',
      icon: 'groups',
      description: 'Browse spaces and manage setup'
    },
    {
      path: '/admin/community/content',
      label: 'Content Ops',
      icon: 'edit_note',
      description: 'Posts, rules, flairs, and moderation'
    },
    {
      path: '/admin/community/chat-moderation',
      label: 'Live Chat Review',
      icon: 'mark_chat_read',
      description: 'Moderate direct-message conversations'
    }
  ];

  constructor(
    private readonly router: Router,
    private readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    if (this.isCommunityRoute()) {
      this.communityExpanded = true;
    }

    if (this.isTransitRoute()) {
      this.transitExpanded = true;
    }

    if (this.isEventsRoute()) {
      this.eventsExpanded = true;
    }

    if (this.isMarketplaceRoute()) {
      this.marketplaceExpanded = true;
    }
  }

  toggleTransit(): void {
    this.transitExpanded = !this.transitExpanded;
  }

  toggleCommunity(): void {
    this.communityExpanded = !this.communityExpanded;
  }

  toggleEvents(): void {
    this.eventsExpanded = !this.eventsExpanded;
  }

  toggleMarketplace(): void {
    this.marketplaceExpanded = !this.marketplaceExpanded;
  }

  isTransitRoute(): boolean {
    return (
      this.router.url.startsWith('/admin/transit') ||
      this.router.url.startsWith('/back-office/transit')
    );
  }

  isCommunityRoute(): boolean {
    return (
      this.router.url.startsWith('/admin/community') ||
      this.router.url.startsWith('/back-office/community')
    );
  }

  isEventsRoute(): boolean {
    return (
      this.router.url.startsWith('/admin/events') ||
      this.router.url.startsWith('/back-office/events')
    );
  }

  isMarketplaceRoute(): boolean {
    return (
      this.router.url.startsWith('/admin/marketplace') ||
      this.router.url.startsWith('/back-office/marketplace')
    );
  }

  isActive(path: string): boolean {
    return this.router.url === path || this.router.url.startsWith(`${path}/`);
  }

  isCommunityLinkActive(link: CommunitySubLink): boolean {
    return this.router.url === link.path || this.router.url.startsWith(`${link.path}/`);
  }

  navigateToCommunity(link: CommunitySubLink): void {
    this.router.navigate([link.path]);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}

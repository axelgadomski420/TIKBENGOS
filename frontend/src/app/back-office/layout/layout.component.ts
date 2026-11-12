
import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-back-office-layout',
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent implements OnInit {
  sidebarOpen = false;
  private desktopMode = true;
  today = new Date();
  private readonly sectionLabels: Array<{ prefix: string; label: string }> = [
    { prefix: '/admin/community', label: 'Community Management' },
    { prefix: '/admin/users', label: 'User Administration' },
    { prefix: '/admin/pets', label: 'Pet Profiles' },
    { prefix: '/admin/transit', label: 'Transit Operations' },
    { prefix: '/admin/services', label: 'Service Providers' },
    { prefix: '/admin/adoption', label: 'Adoption Management' },
    { prefix: '/admin/events', label: 'Events Management' },
    { prefix: '/admin/marketplace', label: 'Marketplace Management' }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.syncViewportState();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.syncViewportState();
  }

  get currentSection(): string {
    return this.sectionLabels.find((section) => this.router.url.startsWith(section.prefix))?.label ?? 'Back Office';
  }

  get sectionHint(): string {
    if (this.router.url.startsWith('/admin/community')) return 'Review communities, moderate content, and manage member access from one place.';
    if (this.router.url.startsWith('/admin/users')) return 'Control platform accounts, permissions, and access quality across the ecosystem.';
    if (this.router.url.startsWith('/admin/pets')) return 'Prepare administrative tools for pet profile moderation, taxonomy, and record quality checks.';
    if (this.router.url.startsWith('/admin/transit')) return 'Organize the admin side of transport requests, assignments, and status oversight.';
    if (this.router.url.startsWith('/admin/services')) return 'Manage provider directories, approval workflows, and service quality controls.';
    if (this.router.url.startsWith('/admin/adoption')) return 'Coordinate shelters, listings, and application oversight from one module shell.';
    if (this.router.url.startsWith('/admin/events')) return 'Use this workspace for schedules, registrations, and event publishing controls.';
    if (this.router.url.startsWith('/admin/marketplace')) return 'Prepare product, category, and seller administration in a dedicated area.';
    return 'Choose a section from the sidebar to begin your administrative workflow.';
  }

  isSectionActive(routePrefix: string): boolean {
    return this.router.url.startsWith(routePrefix);
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  get isMobile(): boolean {
    return !this.desktopMode;
  }

  private syncViewportState(): void {
    this.desktopMode = window.innerWidth >= 1024;
    if (this.desktopMode) {
      this.sidebarOpen = true;
      return;
    }

    if (this.router.url) {
      this.sidebarOpen = false;
    }
  }
}

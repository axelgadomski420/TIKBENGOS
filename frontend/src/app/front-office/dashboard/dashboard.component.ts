import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../auth/auth.service';
import { Community } from '../community/models/community.model';
import { Conversation } from '../community/models/message.model';
import { Post } from '../community/models/post.model';
import { CommunityService } from '../community/services/community.service';
import { MessagingService } from '../community/services/messaging.service';
import { PostService } from '../community/services/post.service';
import { TravelPlanSummary } from '../pet-transit/models/travel-plan.model';
import { TravelPlanService } from '../pet-transit/services/travel-plan.service';
import { PetProfile } from '../../shared/models/pet-profile.model';
import { PetProfileService } from '../../shared/services/pet-profile.service';

interface DashboardActivity {
  title: string;
  subtitle: string;
  timestamp: string;
  kind: 'pet' | 'travel' | 'community';
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  loading = false;
  error = '';

  userFirstName = 'there';
  currentUserId: number | null = null;
  pets: PetProfile[] = [];
  travelPlans: TravelPlanSummary[] = [];
  trendingPosts: Post[] = [];
  myPosts: Post[] = [];
  communities: Community[] = [];
  inboxConversations: Conversation[] = [];
  recentActivity: DashboardActivity[] = [];

  constructor(
    private readonly authService: AuthService,
    private readonly petProfileService: PetProfileService,
    private readonly travelPlanService: TravelPlanService,
    private readonly postService: PostService,
    private readonly communityService: CommunityService,
    private readonly messagingService: MessagingService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  get upcomingTravelPlan(): TravelPlanSummary | null {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = this.travelPlans
      .filter((plan) => {
        const travelDate = this.parseDate(plan.travelDate);
        return travelDate ? travelDate >= today : false;
      })
      .sort((a, b) => this.toDateValue(a.travelDate) - this.toDateValue(b.travelDate));

    return upcoming[0] ?? null;
  }

  get activeTravelPlansCount(): number {
    return this.travelPlans.filter((plan) => plan.status !== 'COMPLETED' && plan.status !== 'CANCELLED').length;
  }

  get postsCount(): number {
    return this.trendingPosts.length;
  }

  get joinedCommunitiesCount(): number {
    return this.communities.length;
  }

  get managedCommunitiesCount(): number {
    return this.communities.filter((community) => community.userRole === 'CREATOR' || community.userRole === 'MODERATOR').length;
  }

  get unreadMessagesCount(): number {
    return this.inboxConversations.reduce((total, conversation) => total + (conversation.unreadCount || 0), 0);
  }

  get latestConversation(): Conversation | null {
    return this.inboxConversations[0] ?? null;
  }

  viewPet(petId: number): void {
    this.router.navigate(['/app/pets', petId]);
  }

  openPetsPage(): void {
    this.router.navigate(['/app/pets']);
  }

  openTransitPage(): void {
    this.router.navigate(['/app/transit/plans']);
  }

  openCommunityPage(): void {
    this.router.navigate(['/app/community']);
  }

  openCommunityInbox(): void {
    this.router.navigate(['/app/community/inbox']);
  }

  openCreateCommunity(): void {
    this.router.navigate(['/app/community/create']);
  }

  viewCommunity(communitySlug: string): void {
    this.router.navigate(['/app/community/c', communitySlug]);
  }

  viewPost(postId: number): void {
    this.router.navigate(['/app/community/post', postId]);
  }

  trackByPetId(_: number, pet: PetProfile): number {
    return pet.id;
  }

  trackByActivity(_: number, activity: DashboardActivity): string {
    return `${activity.kind}:${activity.title}:${activity.timestamp}`;
  }

  trackByCommunityId(_: number, community: Community): number {
    return community.id;
  }

  trackByPostId(_: number, post: Post): number {
    return post.id;
  }

  formatSpecies(species: string): string {
    return species
      .toLowerCase()
      .split('_')
      .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
      .join(' ');
  }

  formatDate(dateText?: string): string {
    const date = this.parseDate(dateText);
    if (!date) {
      return 'Unknown date';
    }
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  formatCommunityRole(role?: Community['userRole'] | null): string {
    if (!role) {
      return 'Member';
    }
    return role.charAt(0) + role.slice(1).toLowerCase();
  }

  formatRelativeDate(dateText?: string): string {
    const date = this.parseDate(dateText);
    if (!date) {
      return 'Unknown time';
    }

    const diffMs = Date.now() - date.getTime();
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diffMs < hour) {
      const minutes = Math.max(1, Math.floor(diffMs / minute));
      return `${minutes}m ago`;
    }
    if (diffMs < day) {
      const hours = Math.max(1, Math.floor(diffMs / hour));
      return `${hours}h ago`;
    }
    const days = Math.max(1, Math.floor(diffMs / day));
    return `${days}d ago`;
  }

  private loadDashboard(): void {
    const user = this.authService.getCurrentUser();
    if (!user?.id) {
      this.error = 'Please log in to load your dashboard.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.userFirstName = user.firstName || 'there';
    this.currentUserId = user.id;

    forkJoin({
      pets: this.petProfileService.getMyPets(user.id).pipe(catchError(() => of([] as PetProfile[]))),
      travelPlans: this.travelPlanService.getMyTravelPlans().pipe(catchError(() => of([] as TravelPlanSummary[]))),
      trendingPosts: this.postService.getTrending(6, 'HOT', 'WEEK', user.id).pipe(catchError(() => of([] as Post[]))),
      communities: this.communityService.getAll(user.id).pipe(catchError(() => of([] as Community[]))),
      inbox: this.messagingService.getInbox(user.id).pipe(catchError(() => of([] as Conversation[])))
    }).subscribe({
      next: ({ pets, travelPlans, trendingPosts, communities, inbox }) => {
        this.pets = [...pets].sort((a, b) => a.name.localeCompare(b.name));
        this.travelPlans = [...travelPlans].sort((a, b) => this.toDateValue(b.travelDate) - this.toDateValue(a.travelDate));
        this.trendingPosts = [...trendingPosts].sort((a, b) => this.toDateValue(b.createdAt) - this.toDateValue(a.createdAt));
        this.myPosts = this.trendingPosts
          .filter((post) => this.currentUserId !== null && post.userId === this.currentUserId)
          .slice(0, 3);
        this.communities = communities
          .filter((community) => !!community.userRole)
          .sort((a, b) => b.memberCount - a.memberCount);
        this.inboxConversations = [...inbox].sort((a, b) => this.toDateValue(b.lastMessageAt) - this.toDateValue(a.lastMessageAt));
        this.recentActivity = this.buildRecentActivity();
        this.loading = false;
      },
      error: () => {
        this.error = 'Unable to load your dashboard right now. Please try again.';
        this.loading = false;
      }
    });
  }

  private buildRecentActivity(): DashboardActivity[] {
    const petActivities: DashboardActivity[] = this.pets.slice(0, 3).map((pet) => ({
      title: `${pet.name} profile updated`,
      subtitle: `${this.formatSpecies(pet.species)} • ${pet.ageDisplay || 'Age unavailable'}`,
      timestamp: pet.updatedAt,
      kind: 'pet'
    }));

    const travelActivities: DashboardActivity[] = this.travelPlans.slice(0, 3).map((plan) => ({
      title: `${plan.destinationTitle} travel plan ${plan.status.toLowerCase().replace('_', ' ')}`,
      subtitle: `${plan.petName || 'No pet selected'} • ${this.formatDate(plan.travelDate)}`,
      timestamp: plan.createdAt,
      kind: 'travel'
    }));

    const communityActivities: DashboardActivity[] = this.trendingPosts.slice(0, 3).map((post) => ({
      title: post.title,
      subtitle: `${post.communitySlug} • ${post.commentCount ?? 0} comments`,
      timestamp: post.createdAt,
      kind: 'community'
    }));

    return [...petActivities, ...travelActivities, ...communityActivities]
      .sort((a, b) => this.toDateValue(b.timestamp) - this.toDateValue(a.timestamp))
      .slice(0, 6);
  }

  private parseDate(dateText?: string): Date | null {
    if (!dateText) {
      return null;
    }
    const date = new Date(dateText);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private toDateValue(dateText?: string): number {
    const date = this.parseDate(dateText);
    return date ? date.getTime() : 0;
  }
}

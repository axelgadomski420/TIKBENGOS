import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { CommunityService } from '../community/services/community.service';
import { PostService } from '../community/services/post.service';
import { Community } from '../community/models/community.model';
import { Post } from '../community/models/post.model';
import { catchError, finalize, forkJoin, of } from 'rxjs';

interface LandingModuleCard {
  title: string;
  description: string;
  route: string;
  icon: string;
  accent: string;
  statLabel: string;
  statValue: string;
}

interface LandingStats {
  communityCount: number;
  communityMembers: number;
  trendingPosts: number;
  availablePets: number;
  verifiedShelters: number;
  activeProducts: number;
  transitDestinations: number;
}

interface LandingHighlight {
  title: string;
  description: string;
  route: string;
  cta: string;
}

interface LandingOverviewCard {
  title: string;
  value: string;
  detail: string;
  route: string;
  action: string;
  icon: string;
  tone: 'teal' | 'orange' | 'violet' | 'green';
}

interface LandingActivityItem {
  title: string;
  detail: string;
  route: string;
  icon: string;
  tone: 'teal' | 'orange' | 'violet';
}

interface AdoptionPetSummary {
  id: number;
  name: string;
  type?: string;
  breed?: string;
}

interface TravelDestinationSummary {
  id: number;
  title?: string;
  destinationName?: string;
}

interface MarketplaceProduct {
  id: number;
}

@Component({
  selector: 'app-landing',
  standalone: false,
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent implements OnInit, OnDestroy {
  private readonly api = 'http://localhost:8087/elif';

  isLoading = true;

  stats: LandingStats = {
    communityCount: 0,
    communityMembers: 0,
    trendingPosts: 0,
    availablePets: 0,
    verifiedShelters: 0,
    activeProducts: 0,
    transitDestinations: 0
  };

  moduleCards: LandingModuleCard[] = [];
  highlights: LandingHighlight[] = [];
  overviewCards: LandingOverviewCard[] = [];
  activityItems: LandingActivityItem[] = [];

  readonly rotatingHeroTexts: string[] = [
    'exceptional homes.',
    'pedigree cats.',
    'pedigree dogs.',
    'trusted breeders.'
  ];
  heroTypedText = '';

  private heroTextIndex = 0;
  private heroCharIndex = 0;
  private isDeletingHeroText = false;
  private heroTypingTimer?: number;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService,
    private http: HttpClient,
    private communityService: CommunityService,
    private postService: PostService
  ) {}

  get isLoggedIn(): boolean {
    return this.auth.isLoggedIn();
  }

  ngOnInit(): void {
    const allowPortal = this.route.snapshot.queryParamMap.get('allowPortal') === '1';
    if (this.auth.isAdmin() && !allowPortal) {
      this.router.navigate(['/admin']);
      return;
    }

    this.loadLandingData();
    this.startHeroTypewriter();
  }

  ngOnDestroy(): void {
    if (this.heroTypingTimer) {
      window.clearTimeout(this.heroTypingTimer);
    }
  }

  goToDashboard() {
    this.router.navigate([this.isLoggedIn ? '/app/dashboard' : '/auth/login']);
  }

  private loadLandingData(): void {
    forkJoin({
      communities: this.communityService.getAll().pipe(catchError(() => of([] as Community[]))),
      trendingPosts: this.postService.getTrending(6, 'HOT').pipe(catchError(() => of([] as Post[]))),
      availablePets: this.http
        .get<number>(`${this.api}/api/adoption/pets/count/available`)
        .pipe(catchError(() => of(0))),
      verifiedShelters: this.http
        .get<number>(`${this.api}/api/adoption/shelters/count/verified`)
        .pipe(catchError(() => of(0))),
      activeProducts: this.http
        .get<MarketplaceProduct[]>(`${this.api}/product/active`)
        .pipe(catchError(() => of([] as MarketplaceProduct[]))),
      transitDestinations: this.http
        .get<TravelDestinationSummary[]>(`${this.api}/api/destinations`)
        .pipe(catchError(() => of([] as TravelDestinationSummary[]))),
      recentPets: this.http
        .get<AdoptionPetSummary[]>(`${this.api}/api/adoption/pets/recent`, {
          params: { limit: '4', days: '30' }
        })
        .pipe(catchError(() => of([] as AdoptionPetSummary[])))
    })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe(({ communities, trendingPosts, availablePets, verifiedShelters, activeProducts, transitDestinations, recentPets }) => {
        const communityMembers = communities.reduce((sum, item) => sum + (item.memberCount ?? 0), 0);

        this.stats = {
          communityCount: communities.length,
          communityMembers,
          trendingPosts: trendingPosts.length,
          availablePets,
          verifiedShelters,
          activeProducts: activeProducts.length,
          transitDestinations: transitDestinations.length
        };

        this.moduleCards = this.buildModuleCards();
        this.highlights = this.buildHighlights(communities, trendingPosts, recentPets);
        this.overviewCards = this.buildOverviewCards();
        this.activityItems = this.buildActivityItems(communities, trendingPosts, recentPets, transitDestinations);
      });
  }

  private buildOverviewCards(): LandingOverviewCard[] {
    return [
      {
        title: 'Community participation',
        value: this.formatCount(this.stats.communityMembers),
        detail: `${this.formatCount(this.stats.communityCount)} communities currently available`,
        route: '/app/community',
        action: 'Open community',
        icon: 'fa-users',
        tone: 'teal'
      },
      {
        title: 'Adoption availability',
        value: this.formatCount(this.stats.availablePets),
        detail: `${this.formatCount(this.stats.verifiedShelters)} verified shelters`,
        route: '/app/adoption',
        action: 'Open adoption',
        icon: 'fa-heart',
        tone: 'orange'
      },
      {
        title: 'Marketplace catalog',
        value: this.formatCount(this.stats.activeProducts),
        detail: 'Active products listed in the storefront',
        route: '/app/marketplace',
        action: 'Open marketplace',
        icon: 'fa-store',
        tone: 'violet'
      },
      {
        title: 'Transit destinations',
        value: this.formatCount(this.stats.transitDestinations),
        detail: `${this.formatCount(this.stats.trendingPosts)} trending posts across the platform`,
        route: '/app/transit',
        action: 'Open transit',
        icon: 'fa-plane-departure',
        tone: 'green'
      }
    ];
  }

  private buildActivityItems(
    communities: Community[],
    trendingPosts: Post[],
    recentPets: AdoptionPetSummary[],
    transitDestinations: TravelDestinationSummary[]
  ): LandingActivityItem[] {
    const topCommunity = [...communities].sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0))[0];
    const topPost = trendingPosts[0];
    const topPet = recentPets[0];
    const topDestination = transitDestinations[0];

    return [
      {
        title: topPost ? topPost.title : 'Top discussion this week',
        detail: topPost
          ? `${this.formatCount(topPost.voteScore)} score and ${this.formatCount(topPost.commentCount ?? 0)} comments`
          : `${this.formatCount(this.stats.trendingPosts)} posts are currently trending`,
        route: topPost ? `/app/community/post/${topPost.id}` : '/app/community',
        icon: 'fa-comments',
        tone: 'teal'
      },
      {
        title: topPet ? `${topPet.name} added to adoption` : 'Adoption queue updated',
        detail: topPet
          ? `${topPet.type ?? 'Pet'}${topPet.breed ? ` - ${topPet.breed}` : ''}`
          : `${this.formatCount(this.stats.availablePets)} pets currently listed`,
        route: '/app/adoption',
        icon: 'fa-heart',
        tone: 'orange'
      },
      {
        title: topDestination?.title || topDestination?.destinationName || 'Transit destination published',
        detail: topCommunity
          ? `${topCommunity.name} has ${this.formatCount(topCommunity.memberCount ?? 0)} members`
          : `${this.formatCount(this.stats.transitDestinations)} transit destinations available`,
        route: '/app/transit',
        icon: 'fa-plane-departure',
        tone: 'violet'
      }
    ];
  }

  private buildModuleCards(): LandingModuleCard[] {
    return [
      {
        title: 'Community',
        description: 'Browse active groups and trending conversations across the platform.',
        route: '/app/community',
        icon: 'fa-users',
        accent: 'text-brand-teal',
        statLabel: 'Communities',
        statValue: this.formatCount(this.stats.communityCount)
      },
      {
        title: 'Pet Transit',
        description: 'Discover published travel destinations and transport-ready planning.',
        route: '/app/transit',
        icon: 'fa-plane-departure',
        accent: 'text-brand-red',
        statLabel: 'Published destinations',
        statValue: this.formatCount(this.stats.transitDestinations)
      },
      {
        title: 'Adoption',
        description: 'Track available pets and verified shelters currently open for adoption.',
        route: '/app/adoption',
        icon: 'fa-heart',
        accent: 'text-brand-orange',
        statLabel: 'Available pets',
        statValue: this.formatCount(this.stats.availablePets)
      },
      {
        title: 'Marketplace',
        description: 'Explore active product listings from the marketplace catalog.',
        route: '/app/marketplace',
        icon: 'fa-store',
        accent: 'text-brand-red',
        statLabel: 'Active products',
        statValue: this.formatCount(this.stats.activeProducts)
      },
      {
        title: 'Services',
        description: 'Use the services workspace to find providers and manage care workflows.',
        route: '/app/services',
        icon: 'fa-stethoscope',
        accent: 'text-brand-orange',
        statLabel: 'Verified shelters',
        statValue: this.formatCount(this.stats.verifiedShelters)
      },
      {
        title: 'Pet Profiles',
        description: 'Create and maintain a full profile for every pet in your family account.',
        route: '/app/pets',
        icon: 'fa-paw',
        accent: 'text-brand-teal',
        statLabel: 'Community members',
        statValue: this.formatCount(this.stats.communityMembers)
      }
    ];
  }

  private buildHighlights(
    communities: Community[],
    trendingPosts: Post[],
    recentPets: AdoptionPetSummary[]
  ): LandingHighlight[] {
    const topCommunity = [...communities].sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0))[0];
    const topPost = trendingPosts[0];
    const topPet = recentPets[0];

    return [
      {
        title: topCommunity ? `${topCommunity.name} community` : 'Community activity',
        description: topCommunity
          ? `${this.formatCount(topCommunity.memberCount ?? 0)} members are currently participating.`
          : `${this.formatCount(this.stats.trendingPosts)} trending posts are available now.`,
        route: '/app/community',
        cta: 'Open Community'
      },
      {
        title: topPost ? topPost.title : 'New discussions are trending',
        description: topPost
          ? `${this.formatCount(topPost.voteScore)} score and ${this.formatCount(topPost.commentCount ?? 0)} comments.`
          : 'Join current discussions and follow the latest conversations.',
        route: topPost ? `/app/community/post/${topPost.id}` : '/app/community',
        cta: topPost ? 'View Post' : 'Browse Posts'
      },
      {
        title: topPet ? `${topPet.name} just joined adoption` : 'Adoption listings are refreshed',
        description: topPet
          ? `${topPet.type ?? 'Pet'} ${topPet.breed ? `- ${topPet.breed}` : ''} is in the recent adoption feed.`
          : `${this.formatCount(this.stats.availablePets)} pets are currently available for adoption.`,
        route: '/app/adoption',
        cta: 'See Adoption'
      }
    ];
  }

  private formatCount(value: number): string {
    return new Intl.NumberFormat('en-US').format(Math.max(0, value));
  }

  private startHeroTypewriter(): void {
    this.tickHeroTypewriter();
  }

  private tickHeroTypewriter(): void {
    const currentText = this.rotatingHeroTexts[this.heroTextIndex];
    let nextDelay = 85;

    if (this.isDeletingHeroText) {
      this.heroCharIndex = Math.max(0, this.heroCharIndex - 1);
      this.heroTypedText = currentText.slice(0, this.heroCharIndex);
      nextDelay = 45;

      if (this.heroCharIndex === 0) {
        this.isDeletingHeroText = false;
        this.heroTextIndex = (this.heroTextIndex + 1) % this.rotatingHeroTexts.length;
        nextDelay = 280;
      }
    } else {
      this.heroCharIndex = Math.min(currentText.length, this.heroCharIndex + 1);
      this.heroTypedText = currentText.slice(0, this.heroCharIndex);

      if (this.heroCharIndex === currentText.length) {
        this.isDeletingHeroText = true;
        nextDelay = 1300;
      }
    }

    this.heroTypingTimer = window.setTimeout(() => this.tickHeroTypewriter(), nextDelay);
  }
}

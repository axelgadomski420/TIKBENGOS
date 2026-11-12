import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, Subscription, forkJoin, of } from 'rxjs';
import { catchError, debounceTime, map, switchMap } from 'rxjs/operators';
import { Community } from '../../models/community.model';
import { Post } from '../../models/post.model';
import { CommunityService } from '../../services/community.service';
import { CommunityAskResponse, FeedSort, FeedWindow, PostService } from '../../services/post.service';
import { AuthService } from '../../../../auth/auth.service';
import { Router } from '@angular/router';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-community-list',
  templateUrl: './community-list.component.html',
  styleUrl: './community-list.component.css'
})
export class CommunityListComponent implements OnInit, OnDestroy {
  private readonly bannerPalette = ['#A7E1D8', '#FCD6A0', '#F9B3B9', '#B7D7F7', '#CBB8F4', '#BFE8C3', '#F7D5E6', '#F6E6A8'];
  private readonly searchShrinkStart = 32;
  private readonly searchShrinkDistance = 220;
  private readonly collapseState: Record<string, boolean> = {
    creators: false,
    moderators: false,
    members: false
  };
  communities: Community[] = [];
  joinedGroupList: Array<{ key: string; title: string; items: Community[] }> = [];
  trendingPosts: Post[] = [];
  searchPosts: Post[] = [];
  readonly feedWindows: Array<{ value: FeedWindow; label: string }> = [
    { value: 'TODAY', label: 'Today' },
    { value: 'WEEK', label: 'This week' },
    { value: 'MONTH', label: 'This month' },
    { value: 'YEAR', label: 'This year' },
    { value: 'ALL', label: 'All time' }
  ];
  searchMode: 'ALL' | 'POSTS' | 'COMMUNITIES' = 'ALL';
  searchQuery = '';
  communitySearch = '';
  showJoinedOnly = false;
  trendingSort: FeedSort = 'HOT';
  trendingWindow: FeedWindow = 'ALL';
  searchDockProgress = 0;
  loading = true;
  loadingTrending = true;
  searching = false;
  aiSearchRunning = false;
  error = '';
  searchError = '';
  aiSearchError = '';
  aiSearchResult: CommunityAskResponse | null = null;
  private readonly searchInput$ = new Subject<string>();
  private searchInputSubscription?: Subscription;

  get userId(): number | undefined {
    return this.auth.getCurrentUser()?.id;
  }

  get isLoggedIn(): boolean {
    return !!this.userId;
  }

  get filteredCommunities(): Community[] {
    const term = this.communitySearch.trim().toLowerCase();
    const pool = this.showJoinedOnly ? this.joinedCommunities : this.communities;

    if (!term) {
      return pool;
    }

    return pool.filter((community) => {
      const name = community.name.toLowerCase();
      const description = (community.description || '').toLowerCase();
      return name.includes(term) || description.includes(term);
    });
  }

  get joinedCommunities(): Community[] {
    return this.communities.filter((community) => !!community.userRole);
  }

  get topCommunities(): Community[] {
    return [...this.communities]
      .sort((a, b) => b.memberCount - a.memberCount)
      .slice(0, 5);
  }

  get publicCount(): number {
    return this.communities.filter((community) => community.type === 'PUBLIC').length;
  }

  get privateCount(): number {
    return this.communities.filter((community) => community.type === 'PRIVATE').length;
  }

  get totalMemberReach(): number {
    return this.communities.reduce((sum, community) => sum + community.memberCount, 0);
  }

  get featuredCommunities(): Community[] {
    return [...this.communities]
      .sort((a, b) => {
        const roleBoostA = a.userRole ? 1 : 0;
        const roleBoostB = b.userRole ? 1 : 0;
        if (roleBoostB !== roleBoostA) {
          return roleBoostB - roleBoostA;
        }
        return b.memberCount - a.memberCount;
      })
      .slice(0, 3);
  }

  get hasCommunityFilters(): boolean {
    return this.showJoinedOnly || !!this.communitySearch.trim();
  }

  get hasSearchQuery(): boolean {
    return this.searchQuery.trim().length > 0;
  }

  get searchedCommunities(): Community[] {
    const term = this.searchQuery.trim().toLowerCase();
    if (!term) {
      return [];
    }

    const keywordMatches = this.communities.filter((community) => {
      const name = community.name.toLowerCase();
      const description = (community.description || '').toLowerCase();
      return name.includes(term) || description.includes(term);
    });

    const aiCommunities = (this.aiSearchResult?.communities ?? []).map((community) => this.hydrateCommunity(community));
    if (!aiCommunities.length) {
      return keywordMatches;
    }

    const merged = new Map<number, Community>();
    aiCommunities.forEach((community) => merged.set(community.id, community));
    keywordMatches.forEach((community) => merged.set(community.id, community));
    return Array.from(merged.values());
  }

  get visibleSearchPosts(): Post[] {
    if (this.searchMode === 'COMMUNITIES') {
      return [];
    }

    return this.searchPosts;
  }

  get visibleSearchCommunities(): Community[] {
    if (this.searchMode === 'POSTS') {
      return [];
    }

    return this.searchedCommunities;
  }

  get totalSearchResults(): number {
    return this.searchPosts.length + this.searchedCommunities.length;
  }

  get aiAnswer(): string {
    return this.aiSearchResult?.answer ?? '';
  }

  get aiFollowUps(): string[] {
    return this.aiSearchResult?.followUps ?? [];
  }

  get aiCommunitiesCount(): number {
    return this.aiSearchResult?.communities?.length ?? 0;
  }

  constructor(
    private communityService: CommunityService,
    private postService: PostService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.setupSearchStream();
    this.updateSearchDockProgress();
    this.communityService.getAll(this.userId).subscribe({
      next: (data) => {
        this.communities = data;
        this.rebuildJoinedGroups();
        this.loading = false;
        this.loadTrendingPosts();
      },
      error: () => {
        this.error = 'Unable to load communities now.';
        this.loading = false;
        this.loadingTrending = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.searchInputSubscription?.unsubscribe();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.updateSearchDockProgress();
  }

  communityFor(post: Post): Community | undefined {
    const byId = this.allKnownCommunities.find((community) => community.id === post.communityId);
    if (byId) {
      return byId;
    }
    return this.allKnownCommunities.find((community) => community.slug === post.communitySlug);
  }

  canManagePost(post: Post): boolean {
    const community = this.communityFor(post);
    if (!community) {
      return false;
    }

    const role = community.userRole;
    const isModerator = role === 'CREATOR' || role === 'MODERATOR';
    return isModerator;
  }

  roleLabel(community: Community): string {
    if (!community.userRole) {
      return 'Visitor';
    }

    if (community.userRole === 'CREATOR') {
      return 'Creator';
    }

    if (community.userRole === 'MODERATOR') {
      return 'Moderator';
    }

    return 'Member';
  }

  roleTone(community: Community): string {
    if (community.userRole === 'CREATOR') {
      return 'bg-brand-orange/15 text-brand-orange border-brand-orange/20';
    }

    if (community.userRole === 'MODERATOR') {
      return 'bg-brand-teal/15 text-brand-teal border-brand-teal/20';
    }

    if (community.userRole === 'MEMBER') {
      return 'bg-slate-100 text-slate-700 border-slate-200';
    }

    return 'bg-white text-slate-500 border-slate-200';
  }

  communityInitial(community: Community): string {
    return community.name.trim().charAt(0).toUpperCase() || 'C';
  }

  isGroupCollapsed(groupKey: string): boolean {
    return this.collapseState[groupKey] ?? false;
  }

  toggleGroup(groupKey: string): void {
    this.collapseState[groupKey] = !this.isGroupCollapsed(groupKey);
  }

  clearCommunityFilters(): void {
    this.communitySearch = '';
    this.showJoinedOnly = false;
  }

  onSearchModeChange(mode: 'ALL' | 'POSTS' | 'COMMUNITIES'): void {
    this.searchMode = mode;
  }

  onSearchQueryChange(value: string): void {
    this.searchQuery = value;
    this.searchError = '';
    this.aiSearchError = '';
    this.aiSearchResult = null;
    this.aiSearchRunning = false;

    const query = value.trim();
    if (!query) {
      this.searchPosts = [];
      this.searchMode = 'ALL';
      this.searching = false;
      return;
    }

    this.searchMode = 'ALL';
    this.searching = true;
    this.searchPosts = [];
    this.searchInput$.next(query);
  }

  runSearch(): void {
    this.runAiSearch();
  }

  runAiSearch(): void {
    const query = this.searchQuery.trim();
    this.searchError = '';
    this.aiSearchError = '';
    this.aiSearchResult = null;

    if (!query) {
      this.searchPosts = [];
      this.searchMode = 'ALL';
      this.aiSearchResult = null;
      return;
    }

    this.searchMode = 'ALL';
    this.searching = true;
    this.aiSearchRunning = true;
    this.searchPosts = [];

    this.postService.ask(query, this.userId).subscribe({
      next: (result) => {
        this.aiSearchResult = result;
        this.searchPosts = result.posts ?? [];
        this.searching = false;
        this.aiSearchRunning = false;
      },
      error: (error: HttpErrorResponse) => {
        this.aiSearchResult = null;
        this.aiSearchError = `${this.extractAiErrorMessage(error)} Showing keyword results instead.`;
        this.postService.search(query, this.userId).subscribe({
          next: (posts) => {
            this.searchPosts = posts;
            this.searching = false;
            this.aiSearchRunning = false;
          },
          error: () => {
            this.searchPosts = [];
            this.searchError = 'Unable to search posts right now.';
            this.searching = false;
            this.aiSearchRunning = false;
          }
        });
      }
    });
  }

  private extractAiErrorMessage(error: HttpErrorResponse): string {
    const detail = typeof error?.error?.detail === 'string' ? error.error.detail.trim() : '';
    if (detail) {
      return `AI agent error: ${detail}.`;
    }

    const message = typeof error?.error?.message === 'string' ? error.error.message.trim() : '';
    if (message) {
      return `AI agent error: ${message}.`;
    }

    if (error?.status === 0) {
      return 'AI agent is unreachable at http://localhost:8095.';
    }

    return 'AI answer is unavailable right now.';
  }

  applyFollowUp(question: string): void {
    this.searchQuery = question;
    this.runAiSearch();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchPosts = [];
    this.searchMode = 'ALL';
    this.searchError = '';
    this.aiSearchError = '';
    this.aiSearchResult = null;
    this.searching = false;
    this.aiSearchRunning = false;
  }

  trackByCommunityId(_index: number, community: Community): number {
    return community.id;
  }

  trackByGroupKey(_index: number, group: { key: string }): string {
    return group.key;
  }

  trackByPostId(_index: number, post: Post): number {
    return post.id;
  }

  communityIconSrc(community: Community): string {
    return this.resolveCommunityAssetUrl(community.iconUrl);
  }

  communityBannerSrc(community: Community): string {
    return this.resolveCommunityAssetUrl(community.bannerUrl);
  }

  onTrendingSortChange(sort: FeedSort): void {
    if (this.trendingSort === sort) return;
    this.trendingSort = sort;
    this.loadTrendingPosts();
  }

  onTrendingWindowChange(window: FeedWindow): void {
    if (this.trendingWindow === window) {
      return;
    }

    this.trendingWindow = window;
    this.loadTrendingPosts();
  }

  onPostVote(post: Post, value: 1 | -1): void {
    const userId = this.userId;
    if (!userId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    const previousVote = post.userVote ?? null;
    const previousScore = post.voteScore;

    if (previousVote === value) {
      post.userVote = null;
      post.voteScore -= value;
      this.postService.removeVote(post.id, 'POST', userId).subscribe({
        error: () => this.restorePostVote(post, previousVote, previousScore)
      });
      return;
    }

    post.userVote = value;
    post.voteScore += value - (previousVote ?? 0);
    this.postService.vote(post.id, 'POST', value, userId).subscribe({
      error: () => this.restorePostVote(post, previousVote, previousScore)
    });
  }

  bannerFallbackColor(community: Community): string {
    const seed = `${community.id}|${community.slug}|${community.name}`;
    return this.pickBannerColor(seed);
  }

  communityActivityLabel(community: Community): string {
    if (community.userRole) {
      return 'Already part of your workspace';
    }

    if (community.memberCount >= 80) {
      return 'Busy every day';
    }

    if (community.memberCount >= 30) {
      return 'Growing conversations';
    }

    return 'Smaller focused group';
  }

  communityActivityTone(community: Community): string {
    if (community.userRole) {
      return 'community-card-activity-member';
    }

    if (community.memberCount >= 80) {
      return 'community-card-activity-busy';
    }

    if (community.memberCount >= 30) {
      return 'community-card-activity-growing';
    }

    return 'community-card-activity-quiet';
  }

  private pickBannerColor(seed: string): string {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }

    const index = Math.abs(hash) % this.bannerPalette.length;
    return this.bannerPalette[index];
  }

  private rebuildJoinedGroups(): void {
    const creators = this.joinedCommunities.filter((community) => community.userRole === 'CREATOR');
    const moderators = this.joinedCommunities.filter((community) => community.userRole === 'MODERATOR');
    const members = this.joinedCommunities.filter((community) => community.userRole === 'MEMBER');

    this.joinedGroupList = [
      { key: 'creators', title: 'Managed by you', items: creators },
      { key: 'moderators', title: 'You moderate', items: moderators },
      { key: 'members', title: 'Joined', items: members }
    ].filter((group) => group.items.length > 0);
  }

  private restorePostVote(post: Post, previousVote: 1 | -1 | null, previousScore: number): void {
    post.userVote = previousVote;
    post.voteScore = previousScore;
  }

  private setupSearchStream(): void {
    this.searchInputSubscription = this.searchInput$
      .pipe(
        map((query) => query.trim()),
        debounceTime(250),
        switchMap((query) => {
          if (!query) {
            return of({ query, posts: [] as Post[], error: '' });
          }

          return this.postService.search(query, this.userId).pipe(
            map((posts) => ({ query, posts, error: '' })),
            catchError(() => of({ query, posts: [] as Post[], error: 'Unable to search posts right now.' }))
          );
        })
      )
      .subscribe(({ query, posts, error }) => {
        if (query !== this.searchQuery.trim()) {
          return;
        }

        this.searchPosts = posts;
        this.searchError = error;
        this.searching = false;
      });
  }

  private loadTrendingPosts(): void {
    this.loadingTrending = true;
    this.postService.getTrending(undefined, this.trendingSort, this.trendingWindow, this.userId).subscribe({
      next: (posts) => {
        this.trendingPosts = this.filterPostsByWindow(posts, this.trendingWindow);
        this.loadingTrending = false;
      },
      error: () => {
        this.loadTrendingPostsFallback();
      }
    });
  }

  private loadTrendingPostsFallback(): void {
    if (!this.communities.length) {
      this.trendingPosts = [];
      this.loadingTrending = false;
      return;
    }

    const seedCommunities = this.communities.slice(0, 8);
    const requests = seedCommunities.map((community) =>
      this.postService.getPosts(community.id, this.trendingSort, this.trendingWindow, undefined, undefined, this.userId).pipe(
        map((posts) => this.filterPostsByWindow(posts, this.trendingWindow).slice(0, 4)),
        catchError(() => of([] as Post[]))
      )
    );

    forkJoin(requests).subscribe({
      next: (groups) => {
        this.trendingPosts = groups
          .flat()
          .sort((a, b) => {
            if (b.voteScore !== a.voteScore) return b.voteScore - a.voteScore;
            if (b.commentCount !== a.commentCount) return (b.commentCount ?? 0) - (a.commentCount ?? 0);
            return b.viewCount - a.viewCount;
          });
        this.loadingTrending = false;
      },
      error: () => {
        this.trendingPosts = [];
        this.loadingTrending = false;
      }
    });
  }

  private updateSearchDockProgress(): void {
    if (typeof window === 'undefined') {
      this.searchDockProgress = 0;
      return;
    }

    const scrollTop = window.scrollY || window.pageYOffset || 0;
    const rawProgress = (scrollTop - this.searchShrinkStart) / this.searchShrinkDistance;
    this.searchDockProgress = Math.max(0, Math.min(1, rawProgress));
  }

  private filterPostsByWindow(posts: Post[], window: FeedWindow): Post[] {
    if (window === 'ALL') {
      return posts;
    }

    const now = new Date();
    const start = this.windowStart(now, window);
    const end = this.windowEnd(start, window);

    return posts.filter((post) => {
      if (!post.createdAt) {
        return false;
      }

      const createdAt = new Date(post.createdAt);
      return !Number.isNaN(createdAt.getTime()) && createdAt >= start && createdAt < end;
    });
  }

  private windowStart(now: Date, window: FeedWindow): Date {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    switch (window) {
      case 'TODAY':
        return start;
      case 'WEEK': {
        const day = start.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        start.setDate(start.getDate() + diff);
        return start;
      }
      case 'MONTH':
        start.setDate(1);
        return start;
      case 'YEAR':
        start.setMonth(0, 1);
        return start;
      case 'ALL':
      default:
        return new Date(0);
    }
  }

  private windowEnd(start: Date, window: FeedWindow): Date {
    const end = new Date(start);

    switch (window) {
      case 'TODAY':
        end.setDate(end.getDate() + 1);
        break;
      case 'WEEK':
        end.setDate(end.getDate() + 7);
        break;
      case 'MONTH':
        end.setMonth(end.getMonth() + 1);
        break;
      case 'YEAR':
        end.setFullYear(end.getFullYear() + 1);
        break;
      case 'ALL':
      default:
        end.setTime(Number.MAX_SAFE_INTEGER);
        break;
    }

    return end;
  }

  private get allKnownCommunities(): Community[] {
    const merged = new Map<number, Community>();
    this.communities.forEach((community) => merged.set(community.id, community));
    (this.aiSearchResult?.communities ?? []).forEach((community) => merged.set(community.id, this.hydrateCommunity(community)));
    return Array.from(merged.values());
  }

  private hydrateCommunity(community: Community): Community {
    const base = this.communities.find((item) => item.id === community.id || item.slug === community.slug);
    if (!base) {
      return community;
    }
    return {
      ...base,
      ...community,
      bannerUrl: community.bannerUrl || base.bannerUrl,
      iconUrl: community.iconUrl || base.iconUrl,
      createdAt: community.createdAt || base.createdAt,
      userRole: community.userRole ?? base.userRole ?? null
    };
  }

  private resolveCommunityAssetUrl(value?: string): string {
    const raw = (value ?? '').trim();
    if (!raw) {
      return '';
    }
    if (/^(https?:|data:|blob:)/i.test(raw)) {
      return raw;
    }
    const normalizedBase = environment.backendBaseUrl.replace(/\/$/, '');
    if (raw.startsWith('/')) {
      return `${normalizedBase}${raw}`;
    }
    return `${normalizedBase}/${raw}`;
  }
}

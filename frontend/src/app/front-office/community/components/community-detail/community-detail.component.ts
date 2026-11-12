import { Component, OnInit, TemplateRef, ViewChild, ViewEncapsulation, HostListener, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { Community, CommunityMember, CommunityNotificationPreferences, CommunityRule, Flair } from '../../models/community.model';
import { Post } from '../../models/post.model';
import { CommunityService } from '../../services/community.service';
import { FeedSort, FeedWindow, PostService, CommunityAskResponse } from '../../services/post.service';
import { AuthService } from '../../../../auth/auth.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfirmDialogService } from '../../../../shared/services/confirm-dialog.service';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, map, switchMap, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-community-detail',
  templateUrl: './community-detail.component.html',
  styleUrl: './community-detail.component.css',
  encapsulation: ViewEncapsulation.None
})
export class CommunityDetailComponent implements OnInit, OnDestroy {
  @ViewChild('communitySettingsDialog') communitySettingsDialog?: TemplateRef<unknown>;
  readonly vm = this;
  private readonly bannerPalette = ['#A7E1D8', '#FCD6A0', '#F9B3B9', '#B7D7F7', '#CBB8F4', '#BFE8C3', '#F7D5E6', '#F6E6A8'];
  readonly editBannerInputId = 'community-edit-banner-upload';
  readonly editIconInputId = 'community-edit-icon-upload';
  readonly feedWindows: Array<{ value: FeedWindow; label: string }> = [
    { value: 'TODAY', label: 'Today' },
    { value: 'WEEK', label: 'This week' },
    { value: 'MONTH', label: 'This month' },
    { value: 'YEAR', label: 'This year' },
    { value: 'ALL', label: 'All time' }
  ];

  community?: Community;
  rules: CommunityRule[] = [];
  members: CommunityMember[] = [];
  memberPreviewSearch = '';
  moderatorSearch = '';
  posts: Post[] = [];
  flairs: Flair[] = [];
  
  // Search properties
  searchQuery = '';
  searching = false;
  aiSearchRunning = false;
  aiSearchResult: CommunityAskResponse | null = null;
  searchPosts: Post[] = [];
  searchMode: 'ALL' | 'POSTS' | 'COMMUNITIES' | 'FLAIRS' | 'RULES' = 'ALL';
  searchError = '';
  aiSearchError = '';
  searchDockProgress = 0;
  private readonly searchInput$ = new Subject<string>();
  private searchInputSubscription?: Subscription;
  private readonly searchShrinkStart = 32;
  private readonly searchShrinkDistance = 220;
  
  loading = true;
  error = '';
  actionError = '';
  membersError = '';
  savingCommunity = false;
  editingCommunity = false;
  managementIdentityOpen = true;
  managementRulesOpen = false;
  managementFlairsOpen = false;
  managementModeratorsOpen = false;
  managementNotificationsOpen = false;
  creatingFlair = false;
  savingFlairId?: number;
  editingFlairId?: number;
  editFlairName = '';
  editFlairColor = '#3A9282';
  editFlairTextColor = '#FFFFFF';
  joining = false;
  leaving = false;
  deletingFlairId?: number;
  flairError = '';
  creatingRule = false;
  savingRuleId?: number;
  editingRuleId?: number;
  editRuleTitle = '';
  editRuleDescription = '';
  editRuleOrder?: number;
  ruleError = '';
  newRuleTitle = '';
  newRuleDescription = '';
  newFlairName = '';
  newFlairColor = '#3A9282';
  newFlairTextColor = '#FFFFFF';
  promotingMemberId?: number;
  demotingMemberId?: number;
  memberActionError = '';
  sort: FeedSort = 'HOT';
  sortWindow: FeedWindow = 'ALL';
  selectedFlairId?: number;
  notificationPreferences?: CommunityNotificationPreferences;
  loadingNotificationPreferences = false;
  savingNotificationPreferenceKey?: keyof CommunityNotificationPreferences;
  notificationPreferencesError = '';

  get userId(): number | undefined {
    return this.auth.getCurrentUser()?.id;
  }

  get isLoggedIn(): boolean {
    return !!this.userId;
  }

  get isMember(): boolean {
    return !!this.community?.userRole;
  }

  get canEditCommunity(): boolean {
    const role = this.community?.userRole;
    return role === 'CREATOR' || role === 'MODERATOR';
  }

  get canManageModerators(): boolean {
    return this.community?.userRole === 'CREATOR';
  }

  get canCreatePost(): boolean {
    return this.isLoggedIn && this.isMember;
  }

  get canOpenSettings(): boolean {
    return this.isLoggedIn && this.isMember;
  }

  get settingsButtonLabel(): string {
    return this.canEditCommunity ? 'Open settings' : 'Notifications';
  }

  get creatorCount(): number {
    return this.members.filter((member) => member.role === 'CREATOR').length;
  }

  get moderatorCount(): number {
    return this.members.filter((member) => member.role === 'MODERATOR').length;
  }

  get memberCountExcludingStaff(): number {
    return this.members.filter((member) => member.role === 'MEMBER').length;
  }

  get membershipCallout(): string {
    if (!this.isLoggedIn) {
      return 'Log in to join, create threads, and unlock the member workspace.';
    }

    if (!this.isMember) {
      return 'Join this community to create threads and view the member directory.';
    }

    if (this.canEditCommunity) {
      return 'You can guide the tone here, adjust rules, and manage community structure.';
    }

    return 'You are part of this space and can jump straight into new discussions.';
  }

  get moderationSummary(): string {
    if (!this.isMember) {
      return 'Moderation tools unlock after you join this community.';
    }

    if (this.community?.userRole === 'CREATOR') {
      return 'You own this community and can manage identity, rules, flairs, and moderator access.';
    }

    if (this.community?.userRole === 'MODERATOR') {
      return 'You can manage identity, rules, and flairs to keep this community organized.';
    }

    return 'Members can browse, vote, comment, and post once they join.';
  }

  get postingGuidance(): string {
    if (!this.isLoggedIn) {
      return 'Log in first, then join to start your own thread.';
    }

    if (!this.isMember) {
      return 'Join this community before publishing a new post.';
    }

    return 'Use flairs and clear titles so people can answer faster.';
  }

  get canLeaveCommunity(): boolean {
    const role = this.community?.userRole;
    return role === 'MEMBER' || role === 'MODERATOR';
  }

  get filteredMemberPreview(): CommunityMember[] {
    const term = this.memberPreviewSearch.trim().toLowerCase();
    if (!term) {
      return this.orderedMembers;
    }

    return this.orderedMembers.filter((member) => {
      const name = this.memberDisplayName(member).toLowerCase();
      const role = (member.role || '').toLowerCase();
      return name.includes(term) || role.includes(term);
    });
  }

  get filteredModeratorMembers(): CommunityMember[] {
    const term = this.moderatorSearch.trim().toLowerCase();
    if (!term) {
      return this.orderedMembers;
    }

    return this.orderedMembers.filter((member) => {
      const name = this.memberDisplayName(member).toLowerCase();
      const role = (member.role || '').toLowerCase();
      return name.includes(term) || role.includes(term);
    });
  }

  bannerFallbackColor(community: Community): string {
    const seed = `${community.id}|${community.slug}|${community.name}`;
    return this.pickBannerColor(seed);
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

  editForm: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private communityService: CommunityService,
    private postService: PostService,
    private auth: AuthService,
    private fb: FormBuilder,
    private confirmDialog: ConfirmDialogService,
    private dialog: MatDialog
  ) {
    this.editForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(20)]],
      type: ['PUBLIC'],
      bannerUrl: [''],
      iconUrl: ['']
    });
  }

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.error = 'Community not found.';
      this.loading = false;
      return;
    }

    this.setupSearchStream();
    this.updateSearchDockProgress();

    this.communityService.getBySlug(slug, this.userId).subscribe({
      next: (community) => {
        this.community = community;
        this.actionError = '';
        this.editForm.patchValue({
          name: community.name,
          description: community.description,
          type: community.type,
          bannerUrl: community.bannerUrl || '',
          iconUrl: community.iconUrl || ''
        });
        this.communityService.getFlairs(community.id).subscribe({
          next: (flairs) => (this.flairs = flairs),
          error: () => (this.flairs = [])
        });
        this.communityService.getRules(community.id).subscribe({
          next: (rules) => (this.rules = rules),
          error: () => (this.rules = [])
        });
        if (this.isLoggedIn && community.userRole) {
          this.loadMembers();
          this.loadNotificationPreferences();
        }
        this.loadPosts();
        this.openNotificationSettingsFromQueryIfNeeded();
      },
      error: () => {
        this.error = 'Unable to load community.';
        this.loading = false;
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

  loadPosts(): void {
    if (!this.community) return;
    this.error = '';
    this.postService.getPosts(this.community.id, this.sort, this.sortWindow, this.selectedFlairId, undefined, this.userId).subscribe({
      next: (posts) => {
        this.posts = this.filterPostsByWindow(posts, this.sortWindow);
        this.error = '';
        this.loading = false;
      },
      error: () => {
        this.error = 'Unable to load posts.';
        this.loading = false;
      }
    });
  }

  onSortChange(mode: FeedSort): void {
    this.sort = mode;
    this.loadPosts();
  }

  onSortWindowChange(window: FeedWindow): void {
    if (this.sortWindow === window) {
      return;
    }

    this.sortWindow = window;
    this.loadPosts();
  }

  filterFlair(flairId?: number): void {
    this.selectedFlairId = flairId;
    this.loadPosts();
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

  join(): void {
    if (!this.community) return;
    if (!this.userId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.joining = true;
    this.actionError = '';
    this.communityService.join(this.community.id, this.userId).subscribe({
      next: () => {
        if (this.community) {
          this.community.memberCount += 1;
          this.community.userRole = 'MEMBER';
        }
        this.loadMembers();
        this.loadNotificationPreferences();
        this.joining = false;
      },
      error: (error) => {
        this.actionError = this.readErrorMessage(error, 'Unable to join this community.');
        this.joining = false;
      }
    });
  }

  get editNameLength(): number {
    return String(this.editForm.get('name')?.value || '').length;
  }

  get editDescriptionLength(): number {
    return String(this.editForm.get('description')?.value || '').length;
  }

  get flairNameLength(): number {
    return this.newFlairName.trim().length;
  }

  trackByPostId(_index: number, post: Post): number {
    return post.id;
  }

  canManagePost(post: Post): boolean {
    const role = this.community?.userRole;
    const isModerator = role === 'CREATOR' || role === 'MODERATOR';
    return isModerator;
  }

  trackByFlairId(_index: number, flair: Flair): number {
    return flair.id;
  }

  trackByMemberId(_index: number, member: CommunityMember): number {
    return member.userId;
  }

  trackByRuleOrder(_index: number, rule: CommunityRule): number {
    return rule.id ?? rule.ruleOrder ?? _index;
  }

  get orderedMembers(): CommunityMember[] {
    const rolePriority: Record<CommunityMember['role'], number> = {
      CREATOR: 0,
      MODERATOR: 1,
      MEMBER: 2
    };

    return [...this.members].sort((a, b) => {
      const roleDiff = rolePriority[a.role] - rolePriority[b.role];
      if (roleDiff !== 0) {
        return roleDiff;
      }

      const nameA = this.sortableMemberName(a);
      const nameB = this.sortableMemberName(b);
      return nameA.localeCompare(nameB);
    });
  }

  memberDisplayName(member: CommunityMember): string {
    const raw = String(member.name || '').trim();
    if (!raw || /^unknown/i.test(raw)) {
      return 'Member';
    }

    return raw;
  }

  memberInitial(member: CommunityMember): string {
    const label = this.memberDisplayName(member);
    const first = label.charAt(0).toUpperCase();
    return first || 'M';
  }

  private sortableMemberName(member: CommunityMember): string {
    const raw = String(member.name || '').trim();
    if (!raw || /^unknown/i.test(raw)) {
      // Push unknown names to the bottom within the same role.
      return `~${member.userId}`;
    }

    return raw.toLowerCase();
  }

  typeLabel(type: 'PUBLIC' | 'PRIVATE'): string {
    return type === 'PRIVATE' ? 'Private' : 'Public';
  }

  roleLabel(role?: 'MEMBER' | 'MODERATOR' | 'CREATOR' | null): string {
    if (role === 'CREATOR') {
      return 'Creator';
    }

    if (role === 'MODERATOR') {
      return 'Moderator';
    }

    if (role === 'MEMBER') {
      return 'Member';
    }

    return 'Visitor';
  }

  workspaceStatusTone(): string {
    if (this.community?.userRole === 'CREATOR') {
      return 'detail-status-card-creator';
    }

    if (this.community?.userRole === 'MODERATOR') {
      return 'detail-status-card-moderator';
    }

    if (this.community?.userRole === 'MEMBER') {
      return 'detail-status-card-member';
    }

    return 'detail-status-card-visitor';
  }

  leave(): void {
    if (!this.community) return;
    if (!this.userId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.leaving = true;
    this.actionError = '';
    this.communityService.leave(this.community.id, this.userId).subscribe({
      next: () => {
        if (this.community) {
          this.community.memberCount = Math.max(0, this.community.memberCount - 1);
          this.community.userRole = null;
        }
        this.members = [];
        this.membersError = '';
        this.memberPreviewSearch = '';
        this.moderatorSearch = '';
        this.notificationPreferences = undefined;
        this.notificationPreferencesError = '';
        this.leaving = false;
      },
      error: (error) => {
        this.actionError = this.readErrorMessage(error, 'Unable to leave this community.');
        this.leaving = false;
      }
    });
  }

  loadMembers(): void {
    if (!this.community) return;
    const currentUserId = this.userId;
    if (!currentUserId) {
      this.members = [];
      this.membersError = '';
      return;
    }

    this.communityService.getMembers(this.community.id, currentUserId).subscribe({
      next: (members) => {
        this.members = members;
        this.membersError = '';
        this.memberActionError = '';
      },
      error: () => {
        this.members = [];
        this.membersError = 'Unable to load members.';
      }
    });
  }

  loadNotificationPreferences(): void {
    if (!this.community || !this.userId || !this.isMember) {
      this.notificationPreferences = undefined;
      this.notificationPreferencesError = '';
      return;
    }

    this.loadingNotificationPreferences = true;
    this.notificationPreferencesError = '';
    this.communityService.getNotificationPreferences(this.community.id, this.userId).subscribe({
      next: (preferences) => {
        this.notificationPreferences = preferences;
        this.loadingNotificationPreferences = false;
      },
      error: (error) => {
        this.notificationPreferences = undefined;
        this.notificationPreferencesError = this.readErrorMessage(error, 'Unable to load notification preferences.');
        this.loadingNotificationPreferences = false;
      }
    });
  }

  updateNotificationPreference(
    key: 'emailOnPostReply' | 'emailOnMention' | 'weeklyDigestEnabled',
    value: boolean
  ): void {
    if (!this.community || !this.userId || !this.notificationPreferences) {
      return;
    }

    const previousValue = this.notificationPreferences[key];
    this.notificationPreferences = { ...this.notificationPreferences, [key]: value };
    this.savingNotificationPreferenceKey = key;
    this.notificationPreferencesError = '';

    this.communityService.updateNotificationPreferences(this.community.id, { [key]: value }, this.userId).subscribe({
      next: (preferences) => {
        this.notificationPreferences = preferences;
        this.savingNotificationPreferenceKey = undefined;
      },
      error: (error) => {
        this.notificationPreferences = { ...this.notificationPreferences!, [key]: previousValue };
        this.notificationPreferencesError = this.readErrorMessage(error, 'Unable to save notification preferences.');
        this.savingNotificationPreferenceKey = undefined;
      }
    });
  }

  isSavingNotificationPreference(key: keyof CommunityNotificationPreferences): boolean {
    return this.savingNotificationPreferenceKey === key;
  }

  enableEditCommunity(): void {
    this.setManagementSectionState('identity');
    this.editingCommunity = true;
  }

  openManagementDialog(
    dialogTemplate: TemplateRef<unknown>,
    section: 'identity' | 'rules' | 'flairs' | 'moderators' | 'notifications' = this.canEditCommunity ? 'identity' : 'notifications'
  ): void {
    if (!this.canOpenSettings) {
      return;
    }
    this.setManagementSectionState(section);
    this.dialog.open(dialogTemplate, {
      width: '760px',
      maxWidth: '92vw',
      maxHeight: '88vh',
      autoFocus: false,
      panelClass: 'community-settings-dialog-panel',
      backdropClass: 'community-settings-backdrop'
    });
  }

  closeActiveSettingsDialog(): void {
    this.dialog.closeAll();
  }

  activateManagementSection(section: 'identity' | 'rules' | 'flairs' | 'moderators' | 'notifications'): void {
    this.setManagementSectionState(section);
  }

  isManagementSectionOpen(section: 'identity' | 'rules' | 'flairs' | 'moderators' | 'notifications'): boolean {
    if (section === 'identity') {
      return this.managementIdentityOpen;
    }

    if (section === 'rules') {
      return this.managementRulesOpen;
    }

    if (section === 'flairs') {
      return this.managementFlairsOpen;
    }

    if (section === 'notifications') {
      return this.managementNotificationsOpen;
    }

    return this.managementModeratorsOpen;
  }

  toggleManagementSection(section: 'identity' | 'rules' | 'flairs' | 'moderators' | 'notifications'): void {
    if (this.isManagementSectionOpen(section)) {
      this.setManagementSectionState(undefined);
      return;
    }

    this.setManagementSectionState(section);
  }

  private setManagementSectionState(active?: 'identity' | 'rules' | 'flairs' | 'moderators' | 'notifications'): void {
    this.managementIdentityOpen = active === 'identity';
    this.managementRulesOpen = active === 'rules';
    this.managementFlairsOpen = active === 'flairs';
    this.managementModeratorsOpen = active === 'moderators';
    this.managementNotificationsOpen = active === 'notifications';
  }

  cancelEditCommunity(): void {
    this.editingCommunity = false;
    if (!this.community) return;
    this.editForm.patchValue({
      name: this.community.name,
      description: this.community.description,
      type: this.community.type,
      bannerUrl: this.community.bannerUrl || '',
      iconUrl: this.community.iconUrl || ''
    });
  }

  saveCommunity(): void {
    if (!this.community || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    if (!this.userId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.savingCommunity = true;
    this.actionError = '';
    const bannerUrl = this.cleanOptional(this.editForm.get('bannerUrl')?.value);
    const iconUrl = this.cleanOptional(this.editForm.get('iconUrl')?.value);
    const imageValidationError = this.validateCommunityImageSize(bannerUrl, iconUrl);
    if (imageValidationError) {
      this.actionError = imageValidationError;
      this.savingCommunity = false;
      return;
    }

    this.communityService.update(this.community.id, {
      ...this.editForm.value,
      bannerUrl,
      iconUrl
    }, this.userId).subscribe({
      next: (updated) => {
        this.community = updated;
        this.editingCommunity = false;
        this.savingCommunity = false;
        this.actionError = '';
      },
      error: (error) => {
        this.actionError = this.readErrorMessage(error, 'Unable to update community.');
        this.savingCommunity = false;
      }
    });
  }

  onEditImagePicked(event: Event, target: 'bannerUrl' | 'iconUrl'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : '';
      if (!value) return;
      this.editForm.patchValue({ [target]: value });
    };
    reader.readAsDataURL(file);

    input.value = '';
  }

  clearEditImage(target: 'bannerUrl' | 'iconUrl'): void {
    this.editForm.patchValue({ [target]: '' });
  }

  createFlair(): void {
    if (!this.community || !this.canEditCommunity) return;
    if (!this.userId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    const name = this.newFlairName.trim();
    if (!name) {
      this.flairError = 'Flair name is required.';
      return;
    }

    this.creatingFlair = true;
    this.flairError = '';
    this.communityService.addFlair(this.community.id, {
      name,
      color: this.newFlairColor,
      textColor: this.newFlairTextColor
    }, this.userId).subscribe({
      next: (flair) => {
        this.flairs = [...this.flairs, flair];
        this.newFlairName = '';
        this.newFlairColor = '#3A9282';
        this.newFlairTextColor = '#FFFFFF';
        this.creatingFlair = false;
      },
      error: (error) => {
        this.flairError = this.readErrorMessage(error, 'Could not create flair.');
        this.creatingFlair = false;
      }
    });
  }

  startEditFlair(flair: Flair): void {
    this.editingFlairId = flair.id;
    this.editFlairName = (flair.name || '').trim();
    this.editFlairColor = (flair.color || '#3A9282').trim();
    this.editFlairTextColor = (flair.textColor || '#FFFFFF').trim();
    this.flairError = '';
  }

  cancelEditFlair(): void {
    this.editingFlairId = undefined;
    this.savingFlairId = undefined;
    this.editFlairName = '';
    this.editFlairColor = '#3A9282';
    this.editFlairTextColor = '#FFFFFF';
  }

  saveFlair(flair: Flair): void {
    if (!this.community || !this.canEditCommunity) return;
    if (!this.userId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    const name = this.editFlairName.trim();
    if (!name) {
      this.flairError = 'Flair name is required.';
      return;
    }

    this.savingFlairId = flair.id;
    this.flairError = '';
    this.communityService.updateFlair(this.community.id, flair.id, {
      name,
      color: this.editFlairColor,
      textColor: this.editFlairTextColor
    }, this.userId).subscribe({
      next: (updatedFlair) => {
        this.flairs = this.flairs.map((f) => f.id === flair.id ? updatedFlair : f);
        this.cancelEditFlair();
      },
      error: (error) => {
        this.flairError = this.readErrorMessage(error, 'Could not update flair.');
        this.savingFlairId = undefined;
      }
    });
  }

  createRule(): void {
    if (!this.community || !this.canEditCommunity) return;
    if (!this.userId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    const title = this.newRuleTitle.trim();
    const description = this.newRuleDescription.trim();
    if (!title) {
      this.ruleError = 'Rule title is required.';
      return;
    }

    this.creatingRule = true;
    this.ruleError = '';
    const nextRuleOrder = (this.rules.reduce((max, rule) => Math.max(max, rule.ruleOrder || 0), 0) || 0) + 1;

    this.communityService.addRule(this.community.id, {
      title,
      description,
      ruleOrder: nextRuleOrder
    }, this.userId).subscribe({
      next: (rule) => {
        this.rules = [...this.rules, rule].sort((a, b) => (a.ruleOrder || 0) - (b.ruleOrder || 0));
        this.newRuleTitle = '';
        this.newRuleDescription = '';
        this.creatingRule = false;
      },
      error: (error) => {
        this.ruleError = this.readErrorMessage(error, 'Could not create rule.');
        this.creatingRule = false;
      }
    });
  }

  startEditRule(rule: CommunityRule): void {
    this.editingRuleId = rule.id;
    this.editRuleTitle = (rule.title || '').trim();
    this.editRuleDescription = (rule.description || '').trim();
    this.editRuleOrder = Number.isFinite(rule.ruleOrder) ? rule.ruleOrder : undefined;
    this.ruleError = '';
  }

  cancelEditRule(): void {
    this.editingRuleId = undefined;
    this.savingRuleId = undefined;
    this.editRuleTitle = '';
    this.editRuleDescription = '';
    this.editRuleOrder = undefined;
  }

  saveRule(rule: CommunityRule): void {
    if (!this.community || !this.canEditCommunity) return;
    if (!this.userId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    const title = this.editRuleTitle.trim();
    if (!title) {
      this.ruleError = 'Rule title is required.';
      return;
    }

    let ruleOrder = Number(this.editRuleOrder);
    if (!Number.isFinite(ruleOrder) || ruleOrder < 0) {
      ruleOrder = rule.ruleOrder || 0;
    }

    this.savingRuleId = rule.id;
    this.ruleError = '';
    this.communityService.updateRule(this.community.id, rule.id, {
      title,
      description: this.editRuleDescription.trim(),
      ruleOrder
    }, this.userId).subscribe({
      next: (updatedRule) => {
        this.rules = this.rules
          .map((r) => r.id === rule.id ? updatedRule : r)
          .sort((a, b) => (a.ruleOrder || 0) - (b.ruleOrder || 0));
        this.cancelEditRule();
      },
      error: (error) => {
        this.ruleError = this.readErrorMessage(error, 'Could not update rule.');
        this.savingRuleId = undefined;
      }
    });
  }

  promoteMemberToModerator(member: CommunityMember): void {
    if (!this.community || !this.canManageModerators || member.role !== 'MEMBER') return;
    if (!this.userId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.promotingMemberId = member.userId;
    this.memberActionError = '';
    this.communityService.promoteMemberToModerator(this.community.id, member.userId, this.userId).subscribe({
      next: () => {
        this.members = this.members.map((m) => m.userId === member.userId ? { ...m, role: 'MODERATOR' } : m);
        this.promotingMemberId = undefined;
      },
      error: (error) => {
        this.memberActionError = this.readErrorMessage(error, 'Could not promote member.');
        this.promotingMemberId = undefined;
      }
    });
  }

  demoteModeratorToMember(member: CommunityMember): void {
    if (!this.community || !this.canManageModerators || member.role !== 'MODERATOR') return;
    if (!this.userId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.demotingMemberId = member.userId;
    this.memberActionError = '';
    this.communityService.demoteModeratorToMember(this.community.id, member.userId, this.userId).subscribe({
      next: () => {
        this.members = this.members.map((m) => m.userId === member.userId ? { ...m, role: 'MEMBER' } : m);
        this.demotingMemberId = undefined;
      },
      error: (error) => {
        this.memberActionError = this.readErrorMessage(error, 'Could not demote moderator.');
        this.demotingMemberId = undefined;
      }
    });
  }

  deleteFlair(flair: Flair): void {
    if (!this.community || !this.canEditCommunity) return;
    if (!this.userId) {
      this.router.navigate(['/auth/login']);
      return;
    }
    if (!this.confirmDialog.confirmDelete(`flair \"${flair.name}\"`)) {
      return;
    }

    this.deletingFlairId = flair.id;
    this.flairError = '';
    this.communityService.deleteFlair(this.community.id, flair.id, this.userId).subscribe({
      next: () => {
        this.flairs = this.flairs.filter((f) => f.id !== flair.id);
        if (this.selectedFlairId === flair.id) {
          this.selectedFlairId = undefined;
          this.loadPosts();
        }
        this.deletingFlairId = undefined;
      },
      error: (error) => {
        this.flairError = this.readErrorMessage(error, 'Could not delete flair.');
        this.deletingFlairId = undefined;
      }
    });
  }

  private readErrorMessage(error: unknown, fallback: string): string {
    const candidate = error as {
      status?: number;
      statusText?: string;
      message?: string;
      error?: {
        error?: string;
        message?: string;
      };
    };

    const message = candidate?.error?.error || candidate?.error?.message || candidate?.message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }

    if (typeof candidate?.status === 'number' && candidate.status > 0) {
      if (candidate.status === 200) {
        return `${fallback} (server response format error)`;
      }

      const statusText = typeof candidate.statusText === 'string' && candidate.statusText.trim().length > 0
        ? ` ${candidate.statusText}`
        : '';
      return `${fallback} (HTTP ${candidate.status}${statusText})`;
    }

    return fallback;
  }

  private cleanOptional(value: unknown): string | undefined {
    const str = String(value ?? '').trim();
    return str.length ? str : undefined;
  }

  private validateCommunityImageSize(bannerUrl?: string, iconUrl?: string): string | undefined {
    if (this.isTooLargeImagePayload(bannerUrl) || this.isTooLargeImagePayload(iconUrl)) {
      return 'Image payload is too large. Please upload a smaller image.';
    }

    return undefined;
  }

  private isTooLargeImagePayload(value?: string): boolean {
    return !!value && value.length > 1_500_000;
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
          if (!query || !this.community) {
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

  private updateSearchDockProgress(): void {
    if (typeof window === 'undefined') {
      this.searchDockProgress = 0;
      return;
    }

    const scrollTop = window.scrollY || window.pageYOffset || 0;
    const rawProgress = (scrollTop - this.searchShrinkStart) / this.searchShrinkDistance;
    this.searchDockProgress = Math.max(0, Math.min(1, rawProgress));
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

    if (!query || !this.community) {
      this.searchPosts = [];
      this.searchMode = 'ALL';
      this.aiSearchResult = null;
      return;
    }

    this.searchMode = 'ALL';
    this.searching = true;
    this.aiSearchRunning = true;
    this.searchPosts = [];

    this.postService.ask(query, this.userId, this.community.id).subscribe({
      next: (result) => {
        this.aiSearchResult = result;
        this.searchPosts = result.posts ?? [];
        this.searching = false;
        this.aiSearchRunning = false;
      },
      error: (error) => {
        this.aiSearchError = `${this.extractAiErrorMessage(error)} Showing keyword results instead.`;
        this.postService.search(query, this.userId).subscribe({
          next: (posts) => {
            this.searchPosts = posts;
            this.searching = false;
            this.aiSearchRunning = false;
          },
          error: () => {
            this.searchPosts = [];
            this.searching = false;
            this.aiSearchRunning = false;
          }
        });
      }
    });
  }

  private extractAiErrorMessage(error: HttpErrorResponse): string {
    if (error?.error?.detail) {
      return error.error.detail;
    }
    return 'AI search temporarily unavailable.';
  }

  onSearchModeChange(mode: 'ALL' | 'POSTS' | 'COMMUNITIES' | 'FLAIRS' | 'RULES'): void {
    this.searchMode = mode;
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

  private openNotificationSettingsFromQueryIfNeeded(): void {
    if (!this.communitySettingsDialog || !this.canOpenSettings) {
      return;
    }

    const requestedSection = (this.route.snapshot.queryParamMap.get('settings') || '').trim().toLowerCase();
    if (requestedSection !== 'notifications') {
      return;
    }

    window.setTimeout(() => {
      if (!this.communitySettingsDialog) {
        return;
      }
      this.openManagementDialog(this.communitySettingsDialog, 'notifications');
    }, 0);
  }
}

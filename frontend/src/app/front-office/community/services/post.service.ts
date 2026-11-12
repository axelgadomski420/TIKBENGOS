import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { Community } from '../models/community.model';
import { Post } from '../models/post.model';
import { environment } from '../../../../environments/environment';

export type FeedSort = 'HOT' | 'NEW' | 'TOP' | 'CONTROVERSIAL';
export type FeedWindow = 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'ALL';

export interface ThreadSummary {
  postId: number;
  summary: string;
  model: string;
  generatedAt: string;
  commentCount: number;
  truncated: boolean;
}

export interface CommunityAskResponse {
  query: string;
  normalizedQuery: string;
  answer: string;
  model: string;
  aiEnhanced: boolean;
  followUps: string[];
  posts: Post[];
  communities: Community[];
}

interface AgentSearchApiResponse {
  query: string;
  normalized_query: string;
  answer: string;
  follow_ups: string[];
  referenced_posts: Post[];
  referenced_communities: Array<Partial<Community>>;
  model: string;
}

@Injectable({ providedIn: 'root' })
export class PostService {
  private api = environment.communityApiBaseUrl;
  private communityAgentApiUrl = environment.communityAgentApiUrl;

  constructor(private http: HttpClient) {}

  private headers(userId?: number, actingUserId?: number): { headers?: HttpHeaders } {
    if (!userId && !actingUserId) return {};

    let headers = new HttpHeaders();
    if (userId) {
      headers = headers.set('X-User-Id', String(userId));
    }
    if (actingUserId) {
      headers = headers.set('X-Act-As-User-Id', String(actingUserId));
    }

    return { headers };
  }

  getPosts(
    communityId: number,
    sort: FeedSort = 'HOT',
    window: FeedWindow = 'ALL',
    flairId?: number,
    type?: 'DISCUSSION' | 'QUESTION',
    userId?: number
  ): Observable<Post[]> {
    let params = new HttpParams()
      .set('sort', sort)
      .set('window', window);
    if (flairId) params = params.set('flairId', flairId);
    if (type) params = params.set('type', type);
    return this.http.get<Post[]>(`${this.api}/communities/${communityId}/posts`, {
      params,
      ...this.headers(userId)
    });
  }

  getPost(id: number, userId?: number): Observable<Post> {
    return this.http.get<Post>(`${this.api}/posts/${id}`, this.headers(userId));
  }

  getTrending(
    limit?: number,
    sort: FeedSort = 'HOT',
    window: FeedWindow = 'ALL',
    userId?: number
  ): Observable<Post[]> {
    let params = new HttpParams()
      .set('sort', sort)
      .set('window', window);
    if (limit != null) {
      params = params.set('limit', String(limit));
    }
    return this.http.get<Post[]>(`${this.api}/posts/trending`, {
      params,
      ...this.headers(userId)
    });
  }

  create(communityId: number, payload: Partial<Post>, userId: number, actingUserId?: number): Observable<Post> {
    return this.http.post<Post>(`${this.api}/communities/${communityId}/posts`, payload, this.headers(userId, actingUserId));
  }

  update(postId: number, payload: Partial<Post>, userId: number): Observable<Post> {
    return this.http.put<Post>(`${this.api}/posts/${postId}`, payload, this.headers(userId));
  }

  delete(postId: number, userId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/posts/${postId}`, this.headers(userId));
  }

  pin(postId: number, userId: number): Observable<Post> {
    return this.http.post<Post>(`${this.api}/posts/${postId}/pin`, {}, this.headers(userId));
  }

  unpin(postId: number, userId: number): Observable<Post> {
    return this.http.delete<Post>(`${this.api}/posts/${postId}/pin`, this.headers(userId));
  }

  hardDelete(postId: number, userId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/posts/${postId}/hard`, this.headers(userId));
  }

  vote(targetId: number, targetType: 'POST' | 'COMMENT', value: 1 | -1, userId: number): Observable<void> {
    return this.http.post<void>(`${this.api}/vote`, { targetId, targetType, value }, this.headers(userId));
  }

  removeVote(targetId: number, targetType: 'POST' | 'COMMENT', userId: number): Observable<void> {
    return this.http.request<void>('delete', `${this.api}/vote`, {
      ...this.headers(userId),
      body: { targetId, targetType }
    });
  }

  search(query: string, userId?: number): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.api}/posts/search`, {
      params: { q: query },
      ...this.headers(userId)
    });
  }

  ask(query: string, userId?: number, communityId?: number): Observable<CommunityAskResponse> {
    const payload: any = {
      query,
      user_id: userId ?? null,
      include_trace: false
    };
    if (communityId) {
      payload.community_id = communityId;
    }
    return this.http
      .post<AgentSearchApiResponse>(`${this.communityAgentApiUrl}/v1/community/agent-search`, payload)
      .pipe(
        map((payload) => ({
          query: payload.query,
          normalizedQuery: payload.normalized_query,
          answer: payload.answer,
          model: payload.model,
          aiEnhanced: true,
          followUps: payload.follow_ups ?? [],
          posts: (payload.referenced_posts ?? []).map((post) => ({
            ...post,
            createdAt: post.createdAt || new Date().toISOString(),
            viewCount: post.viewCount ?? 0,
            voteScore: post.voteScore ?? 0
          })),
          communities: (payload.referenced_communities ?? [])
            .filter((community): community is Partial<Community> & Pick<Community, 'id' | 'name' | 'slug'> =>
              typeof community.id === 'number' &&
              typeof community.name === 'string' &&
              typeof community.slug === 'string'
            )
            .map((community) => ({
              id: community.id,
              name: community.name,
              slug: community.slug,
              description: community.description ?? '',
              type: community.type === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
              memberCount: community.memberCount ?? 0,
              createdAt: community.createdAt ?? new Date().toISOString(),
              bannerUrl: community.bannerUrl,
              iconUrl: community.iconUrl,
              userRole: community.userRole ?? null
            }))
        }))
      );
  }

  summarizeThread(postId: number, userId?: number): Observable<ThreadSummary> {
    return this.http.get<ThreadSummary>(`${this.api}/posts/${postId}/summary`, this.headers(userId));
  }
}

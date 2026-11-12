function browserOrigin(): string {
  if (typeof window === 'undefined' || !window.location?.host) {
    return 'http://localhost:8087';
  }
  return window.location.origin;
}

function browserWsOrigin(): string {
  if (typeof window === 'undefined' || !window.location?.host) {
    return 'ws://localhost:8087';
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}`;
}

const origin = browserOrigin();
const wsOrigin = browserWsOrigin();

export const environment = {
  production: true,
  /** Same OAuth 2.0 Web Client ID as backend `GOOGLE_CLIENT_ID` / `app.google.client-id` */
  googleClientId: '',
  backendBaseUrl: origin,
  backendContextPath: '/elif',
  communityApiBaseUrl: `${origin}/elif/api/community`,
  communityMessagesApiUrl: `${origin}/elif/api/community/messages`,
  communityGifsApiUrl: `${origin}/elif/api/community/gifs`,
  communityAgentApiUrl: 'http://localhost:8095',
  notificationsApiUrl: `${origin}/elif/api/notifications`,
  marketplaceReclamationApiUrl: `${origin}/elif/api/reclamations`,
  userApiUrl: `${origin}/elif/user`,
  communityWsUrl: `${wsOrigin}/elif/ws-community`
};

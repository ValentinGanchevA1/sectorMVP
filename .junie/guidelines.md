## Real-Time Social Location Platform — Project Guidelines

These guidelines capture project-wide decisions, architecture, and quality bars for the real-time social location super-app built with React Native and TypeScript. They are intended to guide future contributors and ensure consistent, production-grade delivery.

Last updated: 2025-11-12


## Vision & Scope

Revolutionary RTLS Super-App: a location-based, real-time social and commercial ecosystem centered on a GPS map interface. Users appear as interactive avatars on a live map, enabling instant connections, trading, events, and hyperlocal experiences.

Core capabilities to deliver:
- Dating: profiles, matching, messaging, safety/consent controls
- Trading: basic listings → advanced commerce, one-tap payments
- Events: browse, create, join, with geo-bound notifications
- Local trends: hyperlocal analytics/heatmaps
- Messaging: real-time DMs with receipts and moderation
- Discovery: proximity + interests + AI recommendations
- Notifications: proximity- and event-triggered push
- Privacy/Security: phone verification, encryption, GDPR options


## Tech Stack (current, from package.json)

- React Native 0.82, React 19
- TypeScript 5
- Navigation: @react-navigation/native, native-stack, bottom-tabs
- State: Redux Toolkit + redux-persist
- Networking: axios
- Realtime messaging: socket.io-client
- Storage: @react-native-async-storage/async-storage (consider secure storage for secrets)
- Maps: react-native-maps
- Permissions: react-native-permissions
- Geolocation: @react-native-community/geolocation
- Icons: react-native-vector-icons
- Tests: Jest, react-test-renderer (recommend adding @testing-library/react-native)

Node: >= 20

Package scripts:
- start: Metro bundler
- android / ios: platform runs
- test: Jest


## Architecture Pattern — Clean Architecture + MVVM

Target structure (map to current src/):

typescriptsrc/
├─ core/            Business entities and use-cases (pure TS)
├─ data/            Repositories, DTOs, API, persistence abstractions
├─ presentation/    Screens, view models (MVVM), UI components
├─ infrastructure/  Integrations: sockets, notifications, analytics, payments
└─ shared/          Common types, constants, utils

Notes for this repo:
- Present code is under `src/`. When adding features, keep Clean Architecture boundaries. UI never calls API directly—only via use-cases and repositories.
- MVVM: Screens (View) bind to ViewModels via hooks or class instances; ViewModels depend on use-cases; use-cases depend on repository interfaces.
- Path aliases exist in tsconfig. Ensure they match physical structure when migrating files into the architecture layout.


## Development Workflow

1) Install dependencies: `yarn` (or `npm ci`). Ensure Node >= 20.
2) Run app: `yarn start`, then `yarn android` or `yarn ios`.
3) Tests: `yarn test`.
4) Lint/format: configured ESLint + Prettier; adhere to code style (2-space indentation typical RN standards).

Environment and secrets:
- DO NOT store secrets in repo or AsyncStorage. Use environment files with native secure storage for tokens (see Security section).

Known configuration issue to address (do not block current work):
- tsconfig.json → `typeRoots` has a typo: `"./nod, e_modules/@types"`. Correct to `"./node_modules/@types"` in a dedicated PR.


## Key Development Principles

1) Real-Time Performance Priority
- GPS updates every 30s active mode; adaptive throttling in background.
- WebSocket (Socket.IO) for instant messaging and presence.
- Efficient map rendering for 1000+ users via clustering and incremental rendering.
- Battery optimization: batch uploads, coalesce location updates, avoid excessive background activity.

2) Privacy & Security First
- Mandatory phone verification (OTP) for registration.
- Granular privacy controls (invisible mode, block, ghost radius, “share approximate”).
- Location encrypted at rest and in transit; minimum data retention.
- GDPR/CCPA: export and delete data; consent tracking and purpose limitation.

3) Scalable Architecture
- Feature modules and repository-driven boundaries.
- Backend microservices-ready design (Auth, Profiles, Location, Messaging, Events, Commerce).
- Horizontal scaling (stateless services, sticky sessions for sockets if needed, or use Redis adapter).
- Observability: logging, distributed tracing, RUM, performance metrics.


## Feature Implementation Guidelines (Priority Order)

Authentication & User Management
- Phone verification with OTP (SMS)
- Profile creation (images, bio, interests)
- Privacy settings configuration (visibility, block list, geofence exceptions)

Map & Location Services
- Background/foreground location tracking with throttling
- Interactive map dots/avatars, cluster large counts
- Distance-based visibility rules and geofencing

Social Interactions
- Profile viewing from map taps
- Real-time chat with read receipts and typing indicators
- Matching algorithms (interest + proximity + behavioral features)

Advanced Features
- Event management system (create, join, RSVP, reminders)
- Trading marketplace (listings, chat-to-buy, payments)
- Business profiles and storefronts
- Payment integration (PCI-aware, tokenized)


## Phased Development Roadmap

Phase 1 — Foundation & Core Infrastructure
- Scope: Authentication with phone OTP, basic profile schema, map integration (read-only), backend baseline, CI scripts.
- Client:
  - Auth screens + OTP verification flow; secure token handling (Keychain/Keystore via `react-native-encrypted-storage`).
  - Map screen with permissions and current-user marker; background/foreground location service scaffolding with throttling hooks.
  - App shell: navigation stacks, theme, Redux slices for auth/profile/location; error/reporting utilities.
  - Networking layer (axios instance with interceptors, retry/backoff, JWT refresh); env config loader.
- Backend (suggested): Node/NestJS or Go microservices baseline; Postgres; Redis; gateway; Socket.IO server (auth namespace only for now). Geospatial: PostGIS enabled.
- Deliverables: Stable builds (Android/iOS), basic telemetry/logging, unit tests for reducers/use-cases, smoke tests for auth flow.
- Risks: SMS delivery reliability → add rate limiting, fallbacks, resend cooldown; permission denial → UX education screens.
- Dependencies: SMS provider (Twilio/MessageBird), domain + TLS, push certificates (prepare).

Phase 2 — Core Social Interaction
- Scope: Direct messaging MVP, presence, discovery with proximity filter, privacy controls.
- Client:
  - Socket.IO client with JWT; chat screens; message store with optimistic updates and id/ack dedupe.
  - Presence indicators; typing/read receipts; block/report UI.
  - Discovery feed powered by proximity + basic interest tags; map taps open profile modal.
  - Privacy settings: invisible mode, approximate location mode, per-feature toggles.
- Backend: Messaging service with Redis adapter for Socket.IO; presence in Redis; proximity queries via PostGIS/RedisGeo; moderation hooks.
- Deliverables: E2E tests for chat happy path; load test sockets to target 1k concurrent per room cluster; background task policies documented.
- Risks: Battery drain from sockets + GPS → coalesce updates, exponential backoff, single socket; abuse/spam → server rules + client limits.
- Dependencies: Push setup for message notifications (queued for Phase 3 delivery).

Phase 3 — MVP Feature Set
- Scope: Dating flows, basic Trading listings, push notifications, UX polish.
- Client:
  - Dating: profiles with media, like/pass, match creation, in-match chat reuse.
  - Trading: create/browse simple listings; chat-to-buy; basic reporting.
  - Push: FCM/APNs device registration, topic/user targeting; in-app banners via Notifee.
  - UI polish: skeleton loaders, accessibility passes, error toasts.
- Backend: Matchmaking endpoints; Listings service; Notification service orchestrating push.
- Deliverables: Production beta; analytics events; crash reporting; privacy/legal pages.
- Risks: Media upload costs/latency → presigned URLs, image compression, background uploads.
- Dependencies: S3/GCS for images, CDN for media.

Phase 4 — Full Feature Development
- Scope: Events system, Local Trends (Hyperlocal Pulse), Advanced Trading (Instant Storefront), AI features (Social Radar), business profiles, advanced UI.
- Client:
  - Events: create/join/RSVP, map overlays; reminders; event chat channel.
  - Hyperlocal Pulse: heatmap overlay using clustered tiles; cache + periodic updates.
  - Instant Storefront: AR anchors (later milestone), payments sheet with tokenized cards.
  - Social Radar: on-device lightweight ranking; icebreaker prompts.
- Backend: Stream pipeline (Kafka/Flink or Kinesis) to compute tile relevance; payments provider integration (Stripe/Adyen) with tokens only; business accounts and verification.
- Deliverables: Performance budgets met (<16ms per frame on map), A/B flags for sensitive features, compliance checklists (GDPR/CCPA, Store policies).
- Risks: Complexity explosion → feature flags and staged rollout; privacy concerns → differential privacy for trends, opt-outs.
- Dependencies: Analytics + RUM (Sentry/Datadog), payments provider, map tile hosting for heatmap.


## Patent-Grade Innovations — Technical Notes

1) Hyperlocal Pulse
- Real-time heatmap + AI relevance scoring per tile/cluster.
- Use `supercluster` for spatial clustering, combine with server-side stream analytics (e.g., Kafka + Flink) producing relevance scores.
- Client renders heat overlays via `react-native-maps` heatmap. Cache tiles; update every 15–30s.

2) Social Radar
- Proximity-based connection graph with interest vector similarity (e.g., TF-IDF or embeddings) and behavioral icebreakers.
- ML: on-device lightweight ranking + server-side re-ranking. Respect privacy filters (invisible mode, block list).

3) Instant Storefront
- AR-powered commerce: anchors virtual items at geo-locations.
- One-tap payments: tokenize card with provider; minimal PII stored on-device; backend stores tokens only.


## Security & Privacy

Data in transit:
- TLS 1.2+ only; pin backend certs where feasible (mobile certificate pinning).

Data at rest:
- Do NOT store tokens or sensitive info in AsyncStorage. Use `react-native-encrypted-storage` or Keychain/Keystore wrappers. Persist non-sensitive preferences in AsyncStorage.
- Encrypt cached location data (if cached), rotate keys.

Auth:
- Phone verification (OTP via provider e.g., Twilio/MessageBird), rate-limited and replay-protected.
- Use short-lived access tokens (JWT) + refresh tokens; store refresh tokens securely.

Location privacy controls:
- Invisible mode, blur radius, approximate-only mode, and per-feature visibility toggles.
- Consent prompts detailing data usage; in-app data export/delete.

Abuse prevention:
- Rate-limit messaging, anti-spam heuristics, block/report flows, server-side moderation hooks.


## Performance & Battery

Location strategy:
- Foreground: request high accuracy up to every 30s; batch uploads.
- Background: switch to significant-change updates or >2–5 minutes intervals, OS permitting. Avoid continuous GPS in background.

Map rendering:
- Cluster markers (e.g., supercluster) and lazy render details.
- Avoid re-render storms: memoized marker components; move heavy computations off UI thread.

Messaging:
- Keep a single socket connection; exponential backoff reconnect; heartbeat/ping.

Networking:
- Compress payloads; delta updates for location; ETags for lists.


## Backend & Realtime Integration (high level)

Suggested services:
- Auth Service (OTP, tokens), Profile Service, Location Service (write-optimized, geospatial index), Messaging (Socket.IO), Events, Commerce.
- Data stores: Postgres for core entities; Redis for presence + sockets; Elastic/Opensearch for search; S3/GCS for images.
- Geospatial: PostGIS or RedisGeo for proximity queries.

Push notifications:
- Use FCM (Android) + APNs (iOS). Client lib options: Notifee/react-native-push-notification for local scheduling and rich features. Server triggers proximity or event notifications.


## State Management

- Redux Toolkit slices per feature (auth, profile, location, chat, events, commerce, theme).
- Persist limited non-sensitive state via redux-persist. Exclude tokens from persistence unless using secure storage integration.

Example store pattern (excerpt from current project):
```ts
import { configureStore } from '@reduxjs/toolkit';
import themeReducer from '@/store/slices/themeSlice';

export const store = configureStore({
  reducer: { theme: themeReducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```


## Navigation

- Use native-stack for performance. Structure: AuthStack → MainTabs (Map, Discover, Messages, Profile) → modal stacks for Listings, Events.
- Deep linking setup for shared content and notifications.


## Location & Maps — Client Implementation Notes

Libraries: `react-native-maps`, `@react-native-community/geolocation`, `react-native-permissions`.

Guidelines:
- Request permissions with clear rationale screens; handle denied/limited states.
- Throttle updates; use watchPosition with filters; stop listeners when off-screen.
- Apply distance filter (e.g., 25–50m) to reduce noise.
- Use clustering for >200 users; for heatmaps, prefer tile- or grid-based aggregation.

Types and error handling example:
```ts
interface UserLocation {
  userId: string;
  latitude: number;
  longitude: number;
  timestamp: number; // ms
  isVisible: boolean;
}

async function safeUpdateLocation(getUserLocation: () => Promise<UserLocation>,
                                  updateLocationInDatabase: (loc: UserLocation) => Promise<void>,
                                  handleLocationError: (e: unknown) => void) {
  try {
    const userLocation = await getUserLocation();
    await updateLocationInDatabase(userLocation);
  } catch (error) {
    handleLocationError(error);
  }
}
```


## Messaging & Presence

- Socket.IO client with JWT auth, namespaces per feature (chat, presence).
- Delivery semantics: at-least-once with ids/acks, client deduplication.
- Read receipts and typing indicators emitted via lightweight events.


## Notifications

- Use FCM/APNs via server. Client shows in-app banners for foreground via Notifee.
- Proximity triggers computed server-side using geofencing and user preferences.


## Events & Trading (MVP → Advanced)

Events:
- Entities: Event, Attendance, Chat channel; reminders via push.

Trading:
- MVP: simple listings with chat-to-buy.
- Advanced: AR storefront (Instant Storefront), inventory anchored to geo; payments integration.


## Testing Strategy

Unit tests
- Use Jest for pure logic (use-cases, reducers, selectors).

Integration tests
- `@testing-library/react-native` for component behavior and navigation.
- Socket and location mocks for deterministic tests.

Performance tests
- Measure map render times, marker counts, socket throughput; target <16ms per frame critical paths.

End-to-end (optional)
- Detox or Maestro for flows (auth, map, messaging).


## Code Quality Standards

- Always use TypeScript interfaces and explicit types for public APIs.
- Keep ViewModels/UI free of business logic; push logic to use-cases.
- Error handling: never swallow; surface actionable messages and telemetry.
- Formatting: Prettier; ESLint rules from RN config; avoid ts-ignore unless documented.


## Response Format for Future Feature Proposals

When proposing/implementing a feature, use this template:

## Feature: [Name]

### Requirements Analysis
- [Key requirements]
- [Technical constraints]
- [Performance considerations]

### Implementation Approach
1. [Step-by-step breakdown]
2. [Code examples]
3. [Integration points]

### Code Example
```typescript
// Relevant implementation code
```

### Testing Strategy
- [Unit tests]
- [Integration tests]
- [Performance tests]

### Security Considerations
- [Privacy implications]
- [Data protection]
- [Authentication requirements]


## Contributor Notes

- Coordinate schema/contracts with backend early; define OpenAPI/Protobuf where applicable.
- Observe platform permission policies (Play Store, App Store) for background location and tracking disclosures.
- Use feature flags for incremental rollout of sensitive features.


## Future Tasks Backlog (non-breaking)

- Fix tsconfig `typeRoots` typo.
- Add `@testing-library/react-native` and basic component tests.
- Introduce secure storage for tokens (`react-native-encrypted-storage`).
- Add map clustering library and heatmap overlay; evaluate `supercluster`.
- Add Notifee (or equivalent) for rich notifications.
- Introduce analytics and performance monitoring (Sentry/Datadog + RUM).


---

Remember: production-ready solutions only—proper error handling, clear TypeScript types, security and privacy by design, and measured performance at scale. This is a complex, real-time application where quality and security cannot be compromised.

# LinkedLoom System Architecture & Implementation Plan

## 1. System Architecture

The system follows a **Modern Distributed Architecture** separating the Frontend (Client) from the Backend (API & Workers) to ensure scalability and reliability.

### High-Level Data Flow
`UI (Next.js)` <--> `API Gateway (NestJS/Express)` <--> `Database (Postgres)`
                                      ^
                                      |
                                  `Worker Service (BullMQ)` <--> `LinkedIn API`
                                      ^
                                      |
                                  `AI Service (Gemini)`

### Services & Responsibilities
1.  **Frontend (Vercel)**: Next.js 14 App Router. Handles UI, Auth state, and calls Backend API.
2.  **Backend API (Railway/Supabase)**: NestJS (recommended) or Express. RESTful API. Handles business logic, user management, and prompt orchestration.
3.  **Database (Supabase/Neon)**: PostgreSQL. Stores users, posts, schedules, and analytics.
4.  **Task Queue (Redis + BullMQ)**: Manages scheduled posts and background analytics fetching to avoid timeouts.
5.  **AI Engine**: Gemini API interface for generating content.

## 2. Database Design (PostgreSQL + Prisma)

### Schema (Prisma DSL)

```prisma
// schema.prisma

model User {
  id              String            @id @default(uuid())
  email           String            @unique
  name            String?
  picture         String?
  linkedinId      String?           @unique // LinkedIn Sub ID
  accessToken     String?           // Encrypted
  refreshToken    String?           // Encrypted
  tokenExpiresAt  DateTime?
  createdAt       DateTime          @default(now())
  posts           Post[]
  settings        Settings?
}

model Settings {
  id              String    @id @default(uuid())
  userId          String    @unique
  theme           String    @default("system") // light, dark, system
  defaultTone     String    @default("professional")
  user            User      @relation(fields: [userId], references: [id])
}

model Post {
  id              String      @id @default(uuid())
  userId          String
  content         String      @db.Text
  promptUsed      String?
  status          PostStatus  @default(DRAFT) // DRAFT, SCHEDULED, PUBLISHED, FAILED
  scheduledFor    DateTime?
  publishedAt     DateTime?
  linkedinPostId  String?     // URN from LinkedIn
  metrics         Metric[]
  errorLog        String?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  user            User        @relation(fields: [userId], references: [id])
  
  @@index([userId])
  @@index([status, scheduledFor]) // Critical for poller
}

model Metric {
  id        String   @id @default(uuid())
  postId    String
  likes     Int      @default(0)
  comments  Int      @default(0)
  shares    Int      @default(0)
  views     Int      @default(0)
  fetchedAt DateTime @default(now())
  post      Post     @relation(fields: [postId], references: [id])
}

enum PostStatus {
  DRAFT
  SCHEDULED
  PUBLISHED
  FAILED
}
```

### Strategy
-   **Encryption**: `accessToken` and `refreshToken` MUST be encrypted at rest (AES-256).
-   **Indexing**: Compound index on `[status, scheduledFor]` allows the worker to efficiently find posts ready to publish.

## 3. API Design

### Authentication & User
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/auth/linkedin` | Initiates OAuth flow |
| `GET` | `/auth/linkedin/callback` | Handles callback, exchanges code for tokens |
| `GET` | `/user/me` | Get current user profile & settings |
| `PATCH` | `/user/settings` | Update theme/defaults |

### Posts & Scheduling
| Method | Route | Body | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/posts/generate` | `{ prompt, tone, length }` | Generates post content via AI |
| `POST` | `/posts` | `{ content, scheduledFor? }` | Save draft or schedule |
| `GET` | `/posts` | `?status=SCHEDULED&page=1` | List posts with pagination |
| `PATCH` | `/posts/:id` | `{ content, scheduledFor }` | Update post content or time |
| `POST` | `/posts/:id/publish` | `{}` | Immediate publish |
| `DELETE`| `/posts/:id` | - | Delete a post |

### Analytics
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/analytics/dashboard` | Aggregated stats (Total views, top posts) |
| `GET` | `/posts/:id/metrics` | History of metrics for a specific post |

## 4. AI Prompt Engineering

System prompt strategy for Gemini:

```javascript
/* 
  Role: Expert LinkedIn Copywriter
  Context: You are writing for {user_role} (e.g., Founder, Dev).
  Tone: {tone} (Professional, Casual, Viral, Founder)
  Constraints:
  - Formatting: Use short paragraphs, bullet points, and appropriate emojis.
  - Hook: First line must be attention-grabbing but not clickbait.
  - CTA: End with a question or call to action.
  - No hashtags in body, only 3-5 at the absolute end.
*/

// Example Prompt Construction
const prompt = `
  Topic: "${user_input}"
  Tone: "Viral/Storytelling"
  Structure: 
  1. Hook (Pain point)
  2. Story (The realization)
  3. Lesson (The value)
  4. Engagement (Ask the reader)
`;
```

**Guardrails**:
-   Check output length (LinkedIn max 3000 chars).
-   Filter offensive content using Gemini safety settings.
-   Retry logic for empty or hallucinated responses.

## 5. Scheduler & Background Jobs

**Architecture**: Distributed Queue (BullMQ + Redis) running on the Backend.
*Why not Cron?* Cron is hard to scale and recover from failures. Queues allow individual job retrying.

### Queue Setup (NestJS + BullMQ)
1.  **Scheduled Queue**: When a user schedules a post for `2024-12-25T10:00:00`, a job is added with a `delay` parameter.
    -   `queue.add('publish-post', { postId }, { delay: differenceInMs })`
2.  **Publish Processor**:
    -   Worker picks up job.
    -   Checks DB: Is status still `SCHEDULED`? (Idempotency).
    -   Calls LinkedIn API.
    -   On Success: Update DB `PUBLISHED`, save `linkedinPostId`.
    -   On Fail: Update DB `FAILED`, log error.
    -   Retry Strategy: Exponential backoff (1m, 5m, 15m) for network errors. No retry for 400/Auth errors.

## 6. LinkedIn API Integration

### OAuth 2.0 Flow
1.  **Authorization**: Redirect user to `https://www.linkedin.com/oauth/v2/authorization` with `w_member_social r_basicprofile`.
2.  **Token Exchange**: Swap `code` for `access_token` and `refresh_token`.
3.  **Storage**: Encrypt tokens before saving to DB.

### Posting (UGC API)
Endpoint: `POST https://api.linkedin.com/v2/ugcPosts`
Payload:
```json
{
  "author": "urn:li:person:{id}",
  "lifecycleState": "PUBLISHED",
  "specificContent": {
    "com.linkedin.ugc.ShareContent": {
      "shareCommentary": { "text": "Post content here..." },
      "shareMediaCategory": "NONE"
    }
  },
  "visibility": { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" }
}
```

**Error Handling**:
-   **401 Unauthorized**: Refresh token immediately. If refresh fails, flag account as "Needs Re-auth" in DB.
-   **429 Too Many Requests**: BullMQ automatically handles delay/retry.

## 7. Analytics Collection

**Strategy**: "Lazy + Scheduled" Hybrid.
1.  **Scheduled**: A nightly cron job adds tasks to the queue to fetch metrics for all "Active" posts (published in last 30 days).
2.  **Lazy**: When user visits Dashboard, trigger a "hot refresh" for top 5 recent posts if data is > 1 hour old.

**Data Consistency**: Always treat LinkedIn API as source of truth. DB is a cache.

## 8. Error Handling Strategy

### Backend (NestJS Filter)
-   Global Exception Filter catches all errors.
-   **Standardized Response**:
    ```json
    {
      "statusCode": 400,
      "message": "QuotaExceeded",
      "friendlyMessage": "You've reached your daily AI limit. Please try again tomorrow.",
      "timestamp": "..."
    }
    ```

### Frontend (React Boundary)
-   **Toast Notifications**: For temporary errors ("Failed to save draft").
-   **Error Components**: For section failures (e.g., "Analytics failed to load" card with "Retry" button).
-   **Form handling**: Zod validation via React Hook Form to prevent bad data submission.

## 9. UI / UX Design System

**Framework**: TailwindCSS + shadcn/ui
**Theme**: "Zinc" (Neutral, Professional).

### Key Components from shadcn/ui:
-   `Card`: For post previews and dashboard widgets.
-   `Textarea`: Auto-resizing for editor.
-   `Calendar`: For date scheduling.
-   `Tabs`: To switch between "Write", "Preview", "Schedule".
-   `Sheet`: For mobile menu.
-   `Skeleton`: For loading states.

### Pages Layout
1.  **Dashboard**:
    -   Top: 3 'Stat Cards' (Total Views, Posts, Engagement).
    -   Middle: 'Recent Posts' table (Status badge, Date, Actions).
2.  **Create/Edit**:
    -   Split Screen (Desktop): Left = Editor + AI Controls. Right = Real-time Phone/Desktop Preview.
    -   Floating "Generate AI" button near input.
3.  **Scheduler**:
    -   Calendar View showing distributed posts.

## 10. Dark / Light Mode

-   Use `next-themes` provider wrapping the app.
-   Tailwind `darkMode: 'class'`.
-   **Toggle**: In Navbar.
-   **Persistence**: Saves to `localStorage` (via next-themes) and syncs with `User.Settings` in DB when logged in.

## 11. Step-by-Step Implementation Plan

### Phase 1: MVP (The Core)
-   **Goal**: Auth + AI Generate + Manual Publish.
-   **Steps**:
    1.  Setup Next.js & NestJS repos.
    2.  Implement LinkedIn OAuth.
    3.  Build Editor UI + Gemini integration.
    4.  Implement "Publish Now" via backend proxy.
-   **Test**: Verify full flow from "Generate" -> "Edit" -> "Post to LinkedIn".

### Phase 2: Scheduling System
-   **Goal**: Deferred posting.
-   **Steps**:
    1.  Setup Redis + BullMQ.
    2.  Add DateTime picker to UI.
    3.  Implement Queue processor.
    4.  Handle timezone offsets (store UTC, display local).

### Phase 3: Analytics
-   **Goal**: Close the loop.
-   **Steps**:
    1.  Create `Metric` table.
    2.  Build "Fetch Metrics" job.
    3.  Implement Recharts on Dashboard.

### Phase 4: Polish & Scale
-   **Goal**: Production readiness.
-   **Steps**:
    1.  Mobile responsiveness audit.
    2.  Rate limiting (ThrottlerGuard).
    3.  Dark mode refinement.
    4.  Error boundary implementation.

## 12. Security & Scalability

-   **Secrets**: Use Environment Variables (Railwey/Vercel) for API Keys.
-   **CSRF**: NextAuth handles this for Frontend. Backend validates JWTs.
-   **Rate Limiting**: Use `redis-rate-limit` middleware on API `HOST /posts/generate` to prevent AI abuse.
-   **Data isolation**: All DB queries must include `where: { userId }` to prevent data leaks.

# LinkedLoom System Architecture & Implementation Plan

## 1. System Architecture

The system follows a **Serverless Architecture** leveraging Google Firebase to ensure scalability, low maintenance, and real-time capabilities.

### High-Level Data Flow
`UI (Next.js)` <--> `Firebase SDK (Auth/Firestore)`
                                      ^
                                      |
                                  `Cloud Functions` <--> `External APIs (LinkedIn, Twitter, Reddit)`
                                      ^
                                      |
                                  `AI Service (Gemini)`

### Services & Responsibilities
1.  **Frontend (Vercel)**: Next.js 14 App Router. Handles UI, Auth state via Firebase SDK, and direct Firestore subscriptions.
2.  **Backend Logic (Firebase Cloud Functions)**: Serverless functions for heavy lifting:
    -   **Callable Functions**: `generatePost` (AI), `socialAuth` (OAuth exchanges).
    -   **Scheduled Functions**: `checkScheduledPosts` (Cron jobs) for automated publishing.
3.  **Database (Firestore)**: NoSQL document store. Stores users, posts, schedules, and analytics.
4.  **Authentication (Firebase Auth)**: Handles user identity, JWTs, and session hygiene.
5.  **AI Engine**: Google Gemini Pro via Cloud Functions to keep API keys secure.

## 2. Database Design (Firestore)

### Schema

#### `/users/{userId}`
- `displayName`: string
- `email`: string
- `photoURL`: string
- `createdAt`: timestamp

#### `/users/{userId}/connections/socials` (Restricted Access)
- `linkedin`: { accessToken, refreshToken, expiresAt, urn }
- `twitter`: { accessToken, refreshToken, expiresAt, id }

#### `/posts/{postId}`
- `user_id`: string (Indexed)
- `content`: string
- `tone`: string
- `status`: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "FAILED" (Indexed)
- `scheduledFor`: timestamp (Indexed)
- `publishedAt`: timestamp
- `createdAt`: timestamp
- `updatedAt`: timestamp
- `versions`: string[] (AI interaction history)
- `linkedinPostId`: string

#### `/analytics/{userId}/dashboard/data`
- `totalPosts`: number
- `totalLikes`: number
- `engagement`: number
- `chartData`: array

### Strategy
-   **Security Rules**: Strictly enforce `request.auth.uid == resource.data.user_id` for posts.
-   **Indexing**: Composite index on `status` and `scheduledFor` ensures the scheduler function runs efficiently.

## 3. Cloud Functions Design

### 1. AI Content Generation
- **Type**: Callable Function (`onCall`)
- **Name**: `generatePost`
- **Input**: `{ topic, tone, length }`
- **Logic**: Calls Google Gemini Pro to generate content.
- **Security**: Validates `context.auth`.

### 2. Scheduled Publishing
- **Type**: Scheduled Function (`pubsub.schedule`)
- **Frequency**: Every 10 minutes (`*/10 * * * *`)
- **Logic**:
    1.  Query `posts` where `status == 'SCHEDULED'` AND `scheduledFor <= now()`.
    2.  Loop through docs.
    3.  Fetch user's social tokens from `users/{uid}/connections/socials`.
    4.  Call social APIs (LinkedIn/X).
    5.  Update post status to `PUBLISHED` or `FAILED`.

## 4. Social Media Integration

### OAuth Flow
Since we are serverless, we use a hybrid flow or Firebase Extensions (if available), or a custom Function:
1.  **Frontend**: Redirects user to provider.
2.  **Callback**: Frontend receives code -> calls `exchangeToken` Cloud Function.
3.  **Function**: Swaps code for tokens -> Encrypts/Stores in Firestore.

## 5. Security & Scalability

-   **Secrets**: Use **Google Cloud Secret Manager** or Firebase Environment Config for API Keys (Gemini, LinkedIn Client Secrets).
-   **Rate Limiting**: Firebase App Check to prevent abuse of callable functions.
-   **Cold Starts**: 2nd Gen functions allow for concurrency and global deployment to minimize latency.

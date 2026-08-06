# LinkedLoom

🚀 **AI-Powered Social Media Post Generator & Scheduler**

LinkedLoom is a modern SaaS application designed to help founders and creators scale their presence across LinkedIn and Reddit. It combines AI-powered content generation with a robust scheduling and analytics dashboard.

## ✨ Features

-   **🤖 AI Post Generator**: Create viral, professional, or storytelling posts in seconds using Google Gemini.
-   **📝 Rich Editor**: Split-screen editor with real-time platform previews for LinkedIn and Reddit.
-   **🔗 Multi-Platform Publishing**: Connect LinkedIn and Reddit and publish or schedule posts to both simultaneously.
-   **📅 Smart Scheduler**: Automatic publishing via Cloud Functions — schedule once, publish everywhere.
-   **📊 Analytics Dashboard**: Track post counts, engagement (upvotes, comments), and growth metrics per platform.
-   **🖼️ AI Image Generation**: Generate and attach images to posts using Vertex AI (Gemini image model).
-   **🖼️ Image Optimization Pipeline**: Automatic generation of WebP variants (200×200, 400×400, 800×800) via Firebase Storage trigger. `<SmartImage />` shows low-res previews with progressive fade-in.
-   **🎨 Modern UI**: Built with **shadcn/ui** and **Tailwind CSS v4**, featuring full Dark/Light/System theme support.

## 🛠️ Tech Stack

-   **Framework**: [Next.js 16](https://nextjs.org/) (App Router, React 19)
-   **Backend**: [Firebase Cloud Functions](https://firebase.google.com/docs/functions) v2 (Node 22)
-   **Database**: [Firebase Firestore](https://firebase.google.com/docs/firestore)
-   **Storage**: [Firebase Storage](https://firebase.google.com/docs/storage)
-   **Authentication**: [Firebase Auth](https://firebase.google.com/docs/auth) (Email, Google, LinkedIn OAuth)
-   **AI**: Google Gemini (`gemini-2.5-flash-lite` for text, Vertex AI for images)
-   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
-   **Components**: [shadcn/ui](https://ui.shadcn.com/) (Radix UI)
-   **Icons**: [Lucide React](https://lucide.dev/)
-   **Theming**: `next-themes` (System/Light/Dark)

## 🚀 Getting Started

Follow these steps to run the project locally:

1.  **Clone the repository**
    ```bash
    git clone https://github.com/deepsingh245/LinkedLoom.git
    cd LinkedLoom
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Firebase Setup**
    - Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/).
    - Enable **Authentication**, **Firestore**, **Storage**, and **Functions**.
    - **Important**: Upgrade project to **Blaze (Pay-as-you-go)** plan to use Cloud Functions and external APIs (Gemini).
    - Copy your Firebase config keys to `.env.local`.

4.  **Social Platform Setup** (optional — required for publishing)

    **LinkedIn:**
    - Create a LinkedIn App at [https://www.linkedin.com/developers/apps](https://www.linkedin.com/developers/apps)
    - Add OAuth redirect URL: `https://yourdomain.com/integrations/linkedin/callback`
    - Set `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI` in `functions/.env`

    **Reddit:**
    - Create a Reddit App at [https://www.reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)
    - App type: **web app**
    - Add redirect URI: `https://yourdomain.com/integrations/reddit/callback`
    - Set `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_REDIRECT_URI` in `functions/.env`

5.  **Run the development server**
    ```bash
    npm run dev
    ```

6.  **Open your browser**
    Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

## 📂 Project Structure

```text
/
├── app/                  # Next.js App Router Pages
│   ├── (auth)/           # Authentication Routes
│   ├── (dashboard)/      # Protected Dashboard Routes
│   ├── (settings)/       # Account & Preferences Settings
│   └── layout.tsx        # Root Layout
├── components/
│   ├── features/         # Feature-specific components (post-editor, scheduler, dashboard, analytics)
│   ├── landing/          # Landing Page components
│   ├── layout/           # App Shell, Sidebar, Navigation
│   ├── providers/        # Context Providers (auth, data, theme)
│   ├── shared/           # Reusable components & shared Icons
│   └── ui/               # shadcn/ui primitive components
├── lib/                  # Services & helper utility functions
└── types/                # TypeScript Interfaces & Schemas
```

## 🤝 Contributing

1.  Fork the repository
2.  Create your feature branch (`git checkout -b feature/amazing-feature`)
3.  Commit your changes (`git commit -m 'Add some amazing feature'`)
4.  Push to the branch (`git push origin feature/amazing-feature`)
5.  Open a Pull Request

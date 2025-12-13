# LinkedLoom (LinkGenie AI)

🚀 **AI-Powered LinkedIn Post Generator & Scheduler**

LinkedLoom is a modern SaaS application designed to help founders and creators scale their LinkedIn presence. It combines AI-powered content generation with a robust scheduling and analytics dashboard.

## ✨ Features

-   **🤖 AI Post Generator**: Create viral, professional, or storytelling posts in seconds using advanced AI prompts.
-   **📝 Rich Editor**: Split-screen editor with real-time LinkedIn preview (Mobile & Desktop).
-   **📅 Smart Scheduler**: (UI Ready) visual calendar to plan your content strategy.
-   **📊 Analytics Dashboard**: (UI Ready) Track views, engagement, and growth metrics.
-   **🎨 Modern UI**: Built with **shadcn/ui** and **Tailwind CSS**, featuring full Dark Mode support.

## 🛠️ Tech Stack

-   **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
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
    # or
    yarn install
    ```

3.  **Run the development server**
    ```bash
    npm run dev
    ```

4.  **Open your browser**
    Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

## 📂 Project Structure

```text
/
├── app/                  # Next.js App Router Pages
│   ├── (auth)/           # Authentication Routes
│   ├── (dashboard)/      # Protected Dashboard Routes
│   └── layout.tsx        # Root Layout & ThemeProvider
├── components/
│   ├── features/         # Feature-specific components (Editor, etc.)
│   ├── layout/           # App Shell, Sidebar, Navigation
│   └── ui/               # shadcn/ui primitive components
├── lib/                  # Utilities
└── types/                # TypeScript Interfaces
```

## 🤝 Contributing

1.  Fork the repository
2.  Create your feature branch (`git checkout -b feature/amazing-feature`)
3.  Commit your changes (`git commit -m 'Add some amazing feature'`)
4.  Push to the branch (`git push origin feature/amazing-feature`)
5.  Open a Pull Request

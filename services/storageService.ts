import { Post, PostStatus, AnalyticsData, Tone } from "../types";

const STORAGE_KEY_POSTS = 'linkgenie_posts';

// Seed data to make the app look populated
const SEED_POSTS: Post[] = [
  {
    id: '1',
    content: "Just shipped a new feature! 🚀\n\nIt wasn't easy. We faced 3 critical bugs in production.\n\nBut the team rallied. We fixed it.\n\nThat's the startup life.",
    tone: Tone.FOUNDER,
    status: PostStatus.PUBLISHED,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    stats: { impressions: 1250, likes: 45, comments: 12, shares: 3 }
  },
  {
    id: '2',
    content: "Why Remote Work is actually harder than Office Work.\n\n1. No clear boundaries.\n2. Zoom fatigue is real.\n3. Loneliness creeps in.\n\nAgree or disagree?",
    tone: Tone.VIRAL,
    status: PostStatus.PUBLISHED,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
    stats: { impressions: 3400, likes: 210, comments: 85, shares: 15 }
  },
  {
    id: '3',
    content: "Looking forward to speaking at the React Summit next week!",
    tone: Tone.CASUAL,
    status: PostStatus.SCHEDULED,
    createdAt: new Date().toISOString(),
    scheduledFor: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
  }
];

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getPosts = async (): Promise<Post[]> => {
  await delay(300); // Simulate API latency
  const stored = localStorage.getItem(STORAGE_KEY_POSTS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(SEED_POSTS));
    return SEED_POSTS;
  }
  return JSON.parse(stored);
};

export const savePost = async (post: Post): Promise<void> => {
  await delay(300);
  const posts = await getPosts();
  // Check if exists, update if so
  const index = posts.findIndex(p => p.id === post.id);
  if (index >= 0) {
    posts[index] = post;
  } else {
    posts.unshift(post);
  }
  localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(posts));
};

export const deletePost = async (id: string): Promise<void> => {
    await delay(200);
    const posts = await getPosts();
    const filtered = posts.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(filtered));
}

export const getAnalytics = async (): Promise<AnalyticsData[]> => {
  await delay(500);
  // Generate mock trend data for the last 7 days
  const data: AnalyticsData[] = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    data.push({
      date: d.toLocaleDateString('en-US', { weekday: 'short' }),
      impressions: Math.floor(Math.random() * 2000) + 500,
      engagement: Math.floor(Math.random() * 200) + 20,
    });
  }
  return data;
};

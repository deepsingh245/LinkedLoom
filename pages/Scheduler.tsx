import React, { useEffect, useState } from 'react';
import { Calendar, Clock, MoreVertical, Trash2, Send } from 'lucide-react';
import { getPosts, deletePost, savePost } from '../services/storageService';
import { Post, PostStatus } from '../types';

export const Scheduler: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'scheduled' | 'drafts'>('scheduled');
  const [isLoading, setIsLoading] = useState(true);

  const fetchPosts = async () => {
    setIsLoading(true);
    const allPosts = await getPosts();
    const filtered = allPosts.filter(p => 
      activeTab === 'scheduled' 
        ? p.status === PostStatus.SCHEDULED 
        : p.status === PostStatus.DRAFT
    );
    setPosts(filtered);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, [activeTab]);

  const handleDelete = async (id: string) => {
    if(confirm('Are you sure you want to delete this post?')) {
        await deletePost(id);
        fetchPosts();
    }
  };

  const handlePostNow = async (post: Post) => {
      const updated = { ...post, status: PostStatus.PUBLISHED, createdAt: new Date().toISOString() };
      await savePost(updated);
      fetchPosts();
      alert('Post published successfully to LinkedIn! (Simulated)');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Content Calendar</h1>
      </div>

      <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('scheduled')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'scheduled'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          Scheduled
        </button>
        <button
          onClick={() => setActiveTab('drafts')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'drafts'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          Drafts
        </button>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
           <div className="text-center py-12 text-slate-500">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <Calendar className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">No posts found</h3>
            <p className="text-slate-500 dark:text-slate-400">
              {activeTab === 'scheduled' ? "You haven't scheduled anything yet." : "No drafts saved."}
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-3">
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                    activeTab === 'scheduled' 
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {post.tone}
                  </span>
                  {post.scheduledFor && (
                    <span className="flex items-center text-xs text-slate-500">
                      <Clock size={12} className="mr-1" />
                      {new Date(post.scheduledFor).toLocaleString()}
                    </span>
                  )}
                </div>
                <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap line-clamp-3">
                  {post.content}
                </p>
              </div>
              
              <div className="flex md:flex-col justify-end space-x-2 md:space-x-0 md:space-y-2 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-6">
                <button 
                  onClick={() => handlePostNow(post)}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center justify-center"
                  title="Post Now"
                >
                  <Send size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(post.id)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

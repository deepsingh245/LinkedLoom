import React, { useState } from 'react';
import { Sparkles, Copy, Calendar, Save, RotateCcw, Check, Clock } from 'lucide-react';
import { generatePost } from '../services/geminiService';
import { savePost } from '../services/storageService';
import { PostStatus, Tone } from '../types';

export const Generator: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<Tone>(Tone.PROFESSIONAL);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setError('');
    setIsSaved(false);
    
    try {
      const content = await generatePost(topic, tone);
      setGeneratedContent(content);
    } catch (e) {
      setError('Failed to generate content. Please check your API key.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async (status: PostStatus) => {
    const postDate = status === PostStatus.SCHEDULED && scheduleDate 
      ? new Date(scheduleDate).toISOString() 
      : undefined;

    const newPost = {
      id: Date.now().toString(),
      content: generatedContent,
      tone,
      status,
      createdAt: new Date().toISOString(),
      scheduledFor: postDate,
      stats: { impressions: 0, likes: 0, comments: 0, shares: 0 }
    };

    await savePost(newPost);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
    if (status === PostStatus.SCHEDULED) setShowScheduleModal(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-8rem)]">
      {/* Input Section */}
      <div className="flex flex-col space-y-6 h-full">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">New Post</h1>
          <p className="text-slate-500 dark:text-slate-400">Describe what you want to write about, and AI will do the rest.</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 flex flex-col">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Topic or Idea</label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Lessons learned from scaling a SaaS product..."
            className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none dark:text-white mb-6"
          />

          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tone</label>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {Object.values(Tone).map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`px-4 py-2 text-sm rounded-lg border transition-all ${
                  tone === t
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 dark:border-brand-500'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-brand-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="mt-auto">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !topic.trim()}
              className="w-full flex items-center justify-center py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-lg font-medium transition-all shadow-md shadow-brand-500/20"
            >
              {isGenerating ? (
                <>
                  <RotateCcw className="animate-spin mr-2" size={18} />
                  Generating Magic...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2" size={18} />
                  Generate Post
                </>
              )}
            </button>
            {error && <p className="mt-2 text-red-500 text-sm text-center">{error}</p>}
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <div className="flex flex-col space-y-6 h-full">
        <div className="flex items-center justify-between h-10">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Preview</h2>
          {generatedContent && (
            <div className="flex items-center space-x-2">
               {isSaved && <span className="text-green-500 text-sm flex items-center mr-2"><Check size={14} className="mr-1"/> Saved</span>}
              <button 
                onClick={copyToClipboard}
                className="p-2 text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Copy to clipboard"
              >
                <Copy size={18} />
              </button>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 flex flex-col overflow-hidden relative">
          {!generatedContent ? (
             <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
               <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                 <Sparkles size={24} className="text-slate-300 dark:text-slate-600" />
               </div>
               <p>Your AI-generated masterpiece will appear here.</p>
             </div>
          ) : (
            <>
              {/* LinkedIn Post Mockup Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-3">
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                <div>
                  <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-1"></div>
                  <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded"></div>
                </div>
              </div>
              
              <textarea
                value={generatedContent}
                onChange={(e) => setGeneratedContent(e.target.value)}
                className="flex-1 p-6 w-full bg-transparent border-none resize-none focus:ring-0 text-slate-800 dark:text-slate-200 text-base leading-relaxed"
                spellCheck={false}
              />

              {/* Action Bar */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button 
                  onClick={() => handleSave(PostStatus.DRAFT)}
                  className="flex items-center px-4 py-2 text-slate-600 dark:text-slate-400 font-medium hover:text-brand-600 transition-colors"
                >
                  <Save size={18} className="mr-2" />
                  Save Draft
                </button>
                <button 
                  onClick={() => setShowScheduleModal(true)}
                  className="flex items-center px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  <Calendar size={18} className="mr-2" />
                  Schedule
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Schedule Post</h3>
            <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Pick a date and time</label>
            <input 
              type="datetime-local" 
              className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-lg mb-6 dark:bg-slate-950 dark:text-white"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
            />
            <div className="flex space-x-3">
              <button 
                onClick={() => setShowScheduleModal(false)}
                className="flex-1 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleSave(PostStatus.SCHEDULED)}
                disabled={!scheduleDate}
                className="flex-1 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
              >
                Confirm Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

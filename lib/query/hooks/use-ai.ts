import { useMutation } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { FirebaseFunctions } from '@/lib/firebase/functions';
import { dangerToast } from '@/lib/toast';

/**
 * Generate post content via Gemini AI.
 */
export function useGeneratePost() {
  return useMutation({
    mutationFn: async (params: {
      topic: string;
      tone: string;
      length: number;
      excludeIcons: boolean;
      creativeExpansion: boolean;
    }) => {
      const generatePost = httpsCallable(functions, FirebaseFunctions.GENERATE_POST);
      const result = await generatePost(params);
      const data = result.data as { content: string };
      if (!data.content) throw new Error('No content received');
      return data;
    },
    onError: () => {
      dangerToast('Failed to generate content.');
    },
  });
}

/**
 * Generate an image via Vertex AI.
 */
export function useGenerateImage() {
  return useMutation({
    mutationFn: async (params: { prompt: string; referenceImage?: string }) => {
      const generateImage = httpsCallable(functions, FirebaseFunctions.GENERATE_IMAGE);
      const result = await generateImage(params);
      const data = result.data as { imageUrl: string };
      if (!data.imageUrl) throw new Error('No image received');
      return data;
    },
    onError: () => {
      dangerToast('Failed to generate image.');
    },
  });
}

/**
 * Enhance an image prompt via Gemini AI.
 */
export function useEnhanceImagePrompt() {
  return useMutation({
    mutationFn: async (params: { prompt: string }) => {
      const enhance = httpsCallable(functions, FirebaseFunctions.ENHANCE_IMAGE_PROMPT);
      const result = await enhance(params);
      const data = result.data as { enhancedPrompt: string };
      if (!data.enhancedPrompt) throw new Error('No enhanced prompt received');
      return data;
    },
    onError: () => {
      dangerToast('Failed to enhance prompt.');
    },
  });
}

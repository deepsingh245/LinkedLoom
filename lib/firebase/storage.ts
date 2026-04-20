import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

/**
 * Extracts the storage path from a full Firebase Storage download URL.
 * @param url The download URL.
 * @returns The extracted storage path, or null if it cannot be extracted.
 */
export const getStoragePathFromUrl = (url: string): string | null => {
  try {
    const decodedUrl = decodeURIComponent(url);
    const matches = decodedUrl.match(/\/o\/(.*?)\?alt=media/);
    if (matches && matches[1]) {
      return matches[1];
    }
  } catch (error) {
    console.error("Failed to parse storage URL:", url);
  }
  return null;
};

export interface ImageVariants {
  low: string | null;
  medium: string | null;
  high: string | null;
}

/**
 * Given a full URL to an original image, attempts to resolve URLs for its resized variants.
 * @param originalUrl The original download URL.
 */
export const getImageVariants = async (originalUrl: string): Promise<ImageVariants> => {
  const variants: ImageVariants = {
    low: null,
    medium: null,
    high: originalUrl,
  };

  const path = getStoragePathFromUrl(originalUrl);
  if (!path) return variants;

  const getVariantUrl = async (sizePrefix: string): Promise<string | null> => {
    try {
      const parts = path.split('/');
      const fileName = parts.pop() || '';
      const dir = parts.join('/');
      
      const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
      const resizedPath = `resized/${dir}/${fileNameWithoutExt}_${sizePrefix}.webp`;
      
      return await getDownloadURL(ref(storage, resizedPath));
    } catch (error) {
      return null;
    }
  };

  const [low, medium] = await Promise.all([
    getVariantUrl("200x200"),
    getVariantUrl("400x400")
  ]);

  variants.low = low;
  variants.medium = medium;

  return variants;
};

/**
 * Uploads an image or file attachment to Firebase Storage
 * and returns the public download URL to be used in LinkedIn posts.
 * 
 * @param userId - The ID of the user uploading the file
 * @param file - The native File object from the browser `<input type="file">`
 * @returns The public URL of the uploaded image
 */
export const uploadPostAttachment = async (userId: string, file: File): Promise<string> => {
  try {
    // Create a unique file name using timestamp to prevent overwriting
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-]/g, "_")}`;
    
    // Path: users/{userId}/attachments/{filename}
    const storageRef = ref(storage, `users/${userId}/attachments/${fileName}`);
    
    // Upload the file to Firebase Storage
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get the generated public download URL
    const downloadUrl = await getDownloadURL(snapshot.ref);
    
    console.log("File uploaded successfully! URL:", downloadUrl);
    return downloadUrl;
  } catch (error) {
    console.error("Error uploading attachment to Firebase Storage:", error);
    throw error;
  }
};

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

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

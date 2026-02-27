/**
 * Gets the direct image URL (Cloudinary URLs are already direct)
 * This function now just validates and returns the URL as-is
 * since we're using Cloudinary for all image uploads
 */
export const getDirectImageUrl = (url: string): string => {
  if (!url) return '';
  
  // If it's already a valid URL (http/https), return it
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If it's not a valid URL, return empty string
  return '';
};

/**
 * Validates if a URL is a valid image URL
 */
export const isValidImageUrl = (url: string): boolean => {
  if (!url) return false;
  
  // Check if it's a valid URL
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};


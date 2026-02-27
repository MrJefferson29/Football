/**
 * Typography system for the app
 * Serif fonts for headings, Sans-serif for body text
 * 
 * Font files required:
 * - PlayfairDisplay-Bold.ttf
 * - PlayfairDisplay-Regular.ttf
 * - Inter-Regular.ttf
 * - Inter-Medium.ttf
 * - Inter-SemiBold.ttf
 * 
 * Download from: https://fonts.google.com/
 * See: frontend/assets/fonts/README.md for instructions
 */
export const fonts = {
  heading: "Serif-Bold",
  headingRegular: "Serif-Regular",
  body: "Sans-Regular",
  bodyMedium: "Sans-Medium",
  bodySemiBold: "Sans-SemiBold",
};

/**
 * Helper function to get font with fallback
 * React Native will automatically fallback to system font if custom font is not loaded
 */
export const getFont = (fontKey: keyof typeof fonts): string => {
  return fonts[fontKey];
};


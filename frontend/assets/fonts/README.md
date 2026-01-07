# Custom Fonts Setup

This app uses custom fonts for a professional typography system:
- **Serif fonts (Headings):** Playfair Display
- **Sans-serif fonts (Body):** Inter

## 📥 Download Fonts

Download the following font files from [Google Fonts](https://fonts.google.com/):

### Serif Fonts (Headings)
1. **Playfair Display Bold**: https://fonts.google.com/specimen/Playfair+Display
   - Download: PlayfairDisplay-Bold.ttf
2. **Playfair Display Regular**: https://fonts.google.com/specimen/Playfair+Display
   - Download: PlayfairDisplay-Regular.ttf

### Sans-serif Fonts (Body)
1. **Inter Regular**: https://fonts.google.com/specimen/Inter
   - Download: Inter-Regular.ttf
2. **Inter Medium**: https://fonts.google.com/specimen/Inter
   - Download: Inter-Medium.ttf
3. **Inter SemiBold**: https://fonts.google.com/specimen/Inter
   - Download: Inter-SemiBold.ttf

## 📁 File Structure

Place all downloaded font files in this directory:

```
frontend/assets/fonts/
├── PlayfairDisplay-Bold.ttf
├── PlayfairDisplay-Regular.ttf
├── Inter-Regular.ttf
├── Inter-Medium.ttf
├── Inter-SemiBold.ttf
└── SpaceMono-Regular.ttf (already exists)
```

## ✅ After Downloading

Once you've placed the font files in this directory, restart your Expo development server:

```bash
npm start
# or
expo start
```

The fonts will be automatically loaded and applied throughout the app.

## 🔄 Fallback Behavior

If font files are missing, the app will gracefully fall back to system fonts, so the app will still work without the custom fonts.


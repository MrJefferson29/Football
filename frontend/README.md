# Football Analytics App

A modern, visually appealing football analytics mobile application built with React Native and Expo. The app provides comprehensive football match analysis, community features, and rewards system.

## Features

### 🏠 Home Screen
- **Daily News Polls**: Interactive polls for upcoming matches
- **Today's Matches**: Live match schedule with team information
- **Fan Battles**: Player comparison polls with real-time voting
- **Quick Stats**: User prediction accuracy and points overview

### ⚽ Matches Screen
- **Active Leagues**: Horizontal scrollable league cards (EPL, La Liga, UCL, Bundesliga)
- **Fixtures & Results**: Match listings with betting odds from multiple platforms
- **Leaderboard**: Prediction accuracy rankings across different leagues
- **Betting Odds Integration**: Real-time odds display for upcoming matches

### 💬 Community Screen
- **Live Chat**: Real-time match discussions
- **Fan Groups**: Team-specific communities with member counts
- **Create Polls**: User-generated content and polls
- **Tab Navigation**: Switch between Live Chat and Fan Groups

### 🎁 Rewards Screen
- **Points System**: Track user points and redeemable rewards
- **Redeemable Rewards**: Jersey, match tickets, and premium access
- **Refer & Earn**: Invite friends and earn bonus points
- **Achievements**: Badge system for user accomplishments

### 📊 Poll Results Screen
- **Player Comparison**: Visual comparison between players
- **Percentage Breakdown**: Interactive progress bars
- **Country Breakdown**: Geographic voting distribution
- **Share Functionality**: Share poll results with friends

## Design Features

### 🎨 Visual Design
- **Dark Theme**: Modern dark blue color scheme (#1A202C)
- **Card-based Layout**: Clean, organized content presentation
- **Rounded Corners**: Consistent 12px border radius throughout
- **Color-coded Elements**: Distinct colors for different leagues and teams

### 📱 Responsive Design
- **Safe Area Support**: Proper handling of device notches and status bars
- **Scrollable Content**: Optimized for various screen sizes
- **Touch-friendly**: Large touch targets and intuitive navigation
- **Cross-platform**: Works on iOS, Android, and Web

### 🎯 User Experience
- **Intuitive Navigation**: Bottom tab navigation with clear icons
- **Interactive Elements**: Voting, sharing, and real-time updates
- **Visual Feedback**: Loading states, animations, and transitions
- **Accessibility**: Proper contrast ratios and readable fonts

## Technical Stack

- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and toolchain
- **TypeScript**: Type-safe development
- **Expo Router**: File-based navigation system
- **React Native Safe Area Context**: Safe area handling
- **Expo Vector Icons**: Comprehensive icon library

## Project Structure

```
app/
├── (tabs)/
│   ├── index.tsx          # Home screen
│   ├── matches.tsx        # Matches and leagues screen
│   ├── community.tsx      # Community and chat screen
│   ├── rewards.tsx        # Rewards and points screen
│   └── _layout.tsx        # Tab navigation layout
├── poll-results.tsx       # Poll results modal
└── _layout.tsx            # Root layout

components/
├── TeamLogo.tsx           # Reusable team logo component
├── PollResults.tsx        # Poll results component
└── ...                    # Other shared components
```

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm start
   ```

3. **Run on Device/Simulator**
   ```bash
   npm run ios     # iOS simulator
   npm run android # Android emulator
   npm run web     # Web browser
   ```

## Key Components

### TeamLogo Component
Reusable component for displaying team logos with consistent styling and sizing.

### Poll Results
Interactive poll results with country breakdown and sharing functionality.

### Betting Odds Integration
Real-time odds display for multiple betting platforms on upcoming matches.

## Color Palette

- **Primary Background**: #1A202C (Dark Blue)
- **Secondary Background**: #2D3748 (Card Background)
- **Accent Color**: #3B82F6 (Blue)
- **Text Primary**: #FFFFFF (White)
- **Text Secondary**: #9CA3AF (Gray)
- **Success**: #10B981 (Green)
- **Warning**: #F59E0B (Orange)
- **Error**: #EF4444 (Red)

## Future Enhancements

- [ ] Real-time match updates
- [ ] Push notifications for match events
- [ ] Social media integration
- [ ] Advanced analytics and statistics
- [ ] User profiles and achievements
- [ ] Live streaming integration
- [ ] Multi-language support
- [ ] Offline mode support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

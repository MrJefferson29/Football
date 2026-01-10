import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { DataCacheProvider } from '@/contexts/DataCacheContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Load custom fonts with fallback handling
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    // Serif fonts for headings (Playfair Display)
    'Serif-Bold': require('../assets/fonts/PlayfairDisplay-Bold.ttf'),
    'Serif-Regular': require('../assets/fonts/PlayfairDisplay-Regular.ttf'),
    // Sans-serif fonts for body text (Inter)
    'Sans-Regular': require('../assets/fonts/Inter_18pt-Regular.ttf'),
    'Sans-Medium': require('../assets/fonts/Inter_18pt-Medium.ttf'),
    'Sans-SemiBold': require('../assets/fonts/Inter_18pt-SemiBold.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <DataCacheProvider>
        <RootLayoutNav />
      </DataCacheProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, loading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [hasNavigated, setHasNavigated] = useState(false);
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    // Wait for auth check to complete
    if (loading) {
      return;
    }

    // Only run navigation logic once on initial auth check, not on every segment change
    if (hasNavigated) {
      return;
    }

    // Small delay to ensure router and segments are ready
    const timer = setTimeout(() => {
      const currentSegment = segments[0];
      const inAuthGroup = currentSegment === '(tabs)';
      const isAuthPage = currentSegment === 'login' || currentSegment === 'register';

      // Handle navigation based on auth state (only on initial check)
      if (isAuthenticated) {
        // User is authenticated - NEVER show login screen
        if (isAuthPage) {
          // User is authenticated but on login/register page - redirect to home
          router.replace('/(tabs)');
          // Keep loader shown until navigation completes to prevent login screen flash
          setTimeout(() => {
            setHasNavigated(true);
            setShowLoader(false);
          }, 400); // Give navigation time to complete
        } else if (!currentSegment) {
          // Initial route when app starts and user is authenticated - redirect to tabs
          router.replace('/(tabs)');
          setTimeout(() => {
            setHasNavigated(true);
            setShowLoader(false);
          }, 400);
        } else {
          // User is on any valid route (tabs, profile, prediction-forums, etc.) - allow it
          // Don't redirect - just mark as navigated to stop showing loader
          setHasNavigated(true);
          setShowLoader(false);
        }
      } else {
        // User is not authenticated
        if (inAuthGroup) {
          // User is not authenticated but trying to access protected routes
          router.replace('/login');
          // Keep loader shown briefly during redirect
          setTimeout(() => {
            setHasNavigated(true);
            setShowLoader(false);
          }, 200);
        } else {
          // User is on login/register page or other public routes - good
          setHasNavigated(true);
          setShowLoader(false);
        }
      }
    }, 150); // Small delay to ensure router is ready

    return () => clearTimeout(timer);
  }, [isAuthenticated, loading, segments, router]); // Include segments for initial check, but hasNavigated prevents re-running

  // Show loading screen while checking auth OR if authenticated user hasn't navigated yet
  // CRITICAL: Never show login screen for authenticated users - always show loader until navigation completes
  // If user is authenticated, we MUST show loader until navigation to tabs is complete
  // This prevents any brief flash of the login screen
  const shouldShowLoader = loading || (isAuthenticated && !hasNavigated) || showLoader;
  
  if (shouldShowLoader) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }
  
  // For unauthenticated users, only show login after loader is hidden
  // This ensures authenticated users never see the login screen

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="poll-results" options={{ headerShown: false }} />
        <Stack.Screen name="all-matches" options={{ headerShown: false }} />
        <Stack.Screen name="live-matches" options={{ headerShown: false }} />
        <Stack.Screen name="highlights" options={{ headerShown: false }} />
        <Stack.Screen name="trending" options={{ headerShown: false }} />
        <Stack.Screen name="news" options={{ headerShown: false }} />
        <Stack.Screen name="statistics" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="club-battle-stats" options={{ headerShown: false }} />
        <Stack.Screen name="goat-competition" options={{ headerShown: false }} />
        <Stack.Screen name="prediction-forums" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A202C',
  },
});

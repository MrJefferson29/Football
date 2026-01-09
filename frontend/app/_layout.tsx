import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
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
  const { isAuthenticated, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const isAuthPage = segments[0] === 'login' || segments[0] === 'register';

    if (!isAuthenticated && inAuthGroup) {
      // User is not authenticated but trying to access protected routes
      router.replace('/login');
    } else if (isAuthenticated && isAuthPage) {
      // User is authenticated but on login/register page - redirect to home
      router.replace('/(tabs)');
    }
    // Allow authenticated users to access other routes (poll-results, all-matches, etc.)
  }, [isAuthenticated, loading, segments]);

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

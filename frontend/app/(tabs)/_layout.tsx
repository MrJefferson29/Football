import FontAwesome from '@expo/vector-icons/FontAwesome';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

function IoniconsTabBarIcon({
  name,
  color,
  focused,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  focused: boolean;
}) {
  return (
    <Ionicons
      size={focused ? 26 : 24}
      name={name}
      color={color}
      style={{
        marginBottom: focused ? -2 : -3,
      }}
    />
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  const [fontsLoaded] = useFonts({
    'Serif-Bold': require('../../assets/fonts/PlayfairDisplay-Bold.ttf'),
    'Serif-Regular': require('../../assets/fonts/PlayfairDisplay-Regular.ttf'),
    'Sans-Regular': require('../../assets/fonts/Inter_18pt-Regular.ttf'),
    'Sans-Medium': require('../../assets/fonts/Inter_18pt-Medium.ttf'),
    'Sans-SemiBold': require('../../assets/fonts/Inter_18pt-SemiBold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#9CA3AF',

        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'Sans-Medium',
          marginBottom: 6,
        },

        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: insets.bottom + 10,

          height: 64,
          paddingTop: 6,

          backgroundColor: '#1A202C',
          borderRadius: 20,
          borderTopWidth: 0,

          // iOS shadow
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 10,

          // Android elevation
          elevation: 12,
        },

        tabBarItemStyle: {
          borderRadius: 14,
          marginHorizontal: 4,
        },

        tabBarActiveBackgroundColor: 'rgba(59, 130, 246, 0.15)',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <IoniconsTabBarIcon name="home" color={color} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          tabBarIcon: ({ color, focused }) => (
            <IoniconsTabBarIcon name="football" color={color} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="local-leagues"
        options={{
          title: 'Leagues',
          tabBarIcon: ({ color, focused }) => (
            <IoniconsTabBarIcon name="trophy" color={color} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ color, focused }) => (
            <IoniconsTabBarIcon name="people" color={color} focused={focused} />
          ),
          tabBarStyle: { display: 'none' },
        }}
      />

      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Predict',
          tabBarIcon: ({ color, focused }) => (
            <IoniconsTabBarIcon
              name="play-circle"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}

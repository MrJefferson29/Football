import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { storage } from '@/utils/storage';
import { authAPI } from '@/utils/api';
import { router } from 'expo-router';

interface User {
  _id: string;
  username: string;
  email: string;
  role: string;
  avatar?: string;
  points?: number;
  accuracy?: number;
  country?: string;
  age?: number | null;
  rank?: string;
  referralCode?: string;
  totalPredictions?: number;
  correctPredictions?: number;
  referrals?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
    country?: string,
    age?: number,
    referralCode?: string
  ) => Promise<void>;
  updateProfile: (updates: { username?: string; avatar?: string; country?: string; age?: number }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // First, optimistically load user from storage for immediate UI
      const token = await storage.getToken();
      const storedUser = await storage.getUser();

      if (token && storedUser) {
        // Optimistically set user immediately for faster UI
        const userData = {
          ...storedUser,
          _id: storedUser._id || storedUser.id,
        };
        setUser(userData);
        setLoading(false); // Allow UI to render immediately

        // Verify token in background (non-blocking) with timeout
        const verifyToken = async () => {
          try {
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Token verification timeout')), 5000)
            );

            const response = await Promise.race([
              authAPI.getMe(),
              timeoutPromise,
            ]) as any;

            if (response?.success && response?.data) {
              // Token is valid, update with fresh data
              const freshUserData = {
                ...response.data,
                _id: response.data._id || response.data.id,
              };
              setUser(freshUserData);
              await storage.setUser(freshUserData);
            } else {
              // Token invalid, clear storage
              await storage.clearAuth();
              setUser(null);
            }
          } catch (error: any) {
            // Token invalid, expired, or network error - clear auth but don't block UI
            if (error?.message?.includes('timeout')) {
              console.warn('Token verification timed out - using cached user');
              // Don't clear auth on timeout - user might just have poor connection
              // Token will be verified on next API call
            } else if (error?.message?.includes('401') || error?.message?.includes('expired')) {
              console.warn('Token expired or invalid - clearing auth');
              await storage.clearAuth();
              setUser(null);
            } else {
              console.warn('Token verification failed:', error?.message || error);
              // Don't clear auth on network errors - might be temporary
            }
          }
        };

        // Verify in background without blocking
        verifyToken();
      } else {
        // No token or user in storage
        setUser(null);
        setLoading(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);
      if (response.success && response.token && response.user) {
        // Ensure user has _id field
        const userData = {
          ...response.user,
          _id: response.user._id || response.user.id,
        };
        setUser(userData);
        await storage.setUser(userData);
        router.replace('/(tabs)');
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Login failed');
    }
  };

  const register = async (
    username: string,
    email: string,
    password: string,
    country?: string,
    age?: number,
    referralCode?: string
  ) => {
    try {
      const response = await authAPI.register(username, email, password, country, age, referralCode);
      
      if (!response) {
        throw new Error('No response from server');
      }
      
      if (response.success && response.token && response.user) {
        // Ensure user has _id field
        const userData = {
          ...response.user,
          _id: response.user._id || response.user.id,
        };
        setUser(userData);
        try {
          await storage.setUser(userData);
        } catch (storageError) {
          console.error('Error storing user:', storageError);
        }
        router.replace('/(tabs)');
      } else {
        const errorMsg = response?.message || 'Registration failed';
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      // Extract error message safely
      let errorMessage = 'Registration failed';
      if (error && typeof error === 'object' && error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      throw new Error(errorMessage);
    }
  };

  const updateProfile = async (updates: { username?: string; avatar?: string; country?: string; age?: number }) => {
    try {
      const response = await authAPI.updateMe(updates);
      if (response.success && response.data) {
        const updatedUser = {
          ...response.data,
          _id: response.data._id || response.data.id,
        };
        setUser(updatedUser);
        await storage.setUser(updatedUser);
      } else {
        throw new Error(response?.message || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Update profile error:', error);
      throw new Error(error?.message || 'Failed to update profile');
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
      setUser(null);
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Clear local state even if API call fails
      setUser(null);
      await storage.clearAuth();
      router.replace('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        checkAuth,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


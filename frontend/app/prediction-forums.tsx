import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { 
  ActivityIndicator, 
  Alert, 
  Image, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  RefreshControl,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts } from '@/utils/typography';
import { predictionForumsAPI } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useDataCache } from '@/contexts/DataCacheContext';

// --- Types ---
interface ForumMember {
  _id: string;
  username: string;
  avatar?: string;
}

interface Forum {
  _id: string;
  name: string;
  description?: string;
  profilePicture?: string;
  memberCount: number;
  members: (string | ForumMember)[];
  headUserId: {
    _id: string;
    username: string;
  };
}

export default function PredictionForumsScreen() {
  const { user } = useAuth();
  const { getCacheData, setCacheData } = useDataCache();
  
  const [forums, setForums] = useState<Forum[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- Logic ---

  const loadForums = useCallback(async (isPullToRefresh = false) => {
    // 1. Initial Load: Try to show cached data first
    if (!isPullToRefresh) {
      const cachedData = getCacheData('predictionForums');
      if (cachedData) {
        setForums(cachedData);
        setLoading(false);
      }
    } else {
      setRefreshing(true);
    }

    // 2. Fetch Fresh Data
    try {
      const response = await predictionForumsAPI.getPredictionForums();
      if (response.success) {
        setCacheData('predictionForums', response.data);
        setForums(response.data);
      }
    } catch (error: any) {
      // Only show error alert if we have no data to show at all
      if (forums.length === 0 && !isPullToRefresh) {
        Alert.alert('Error', error.message || 'Failed to load prediction forums');
      }
      console.error("Forum Fetch Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getCacheData, setCacheData, forums.length]);

  useEffect(() => {
    loadForums();
  }, []);

  const handleJoinForum = async (forum: Forum) => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to join forums');
      return;
    }

    try {
      const response = await predictionForumsAPI.joinPredictionForum(forum._id);
      if (response.success) {
        Alert.alert('Success', `You've joined ${forum.name}!`);
        loadForums(true); // Silent refresh to update UI
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join forum');
    }
  };

  const handleViewForum = (forum: Forum) => {
    if (!user) {
      // Non-logged-in users see preview
      router.push({
        pathname: '/forum-preview',
        params: { id: forum._id }
      });
      return;
    }

    const isMember = user && forum.members?.some((m: any) =>
      (typeof m === 'string' ? m : m._id) === user._id
    );
    const isHead = user && forum.headUserId?._id === user._id;
    
    // Only members and heads can access the full forum
    if (isMember || isHead) {
      router.push({
        pathname: '/prediction-forum-detail',
        params: { id: forum._id }
      });
    } else {
      // Non-members see the preview/statistics screen
      router.push({
        pathname: '/forum-preview',
        params: { id: forum._id }
      });
    }
  };

  // --- Render Helpers ---

  if (loading && forums.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Prediction Forums</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading forums...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prediction Forums</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadForums(true)}
            tintColor="#3B82F6"
            colors={['#3B82F6']} // Android
          />
        }
      >
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>Expert Prediction Forums</Text>
          <Text style={styles.introDescription}>
            Connect with top football analysts, get exclusive insights, and improve your prediction accuracy
          </Text>
        </View>

        {forums.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>No prediction forums yet</Text>
            <Text style={styles.emptySubtext}>Check back later for new forums!</Text>
          </View>
        ) : (
          forums.map((forum) => {
            const isMember = user && forum.members?.some((m: any) => 
              (typeof m === 'string' ? m : m._id) === user._id
            );
            const isHead = user && forum.headUserId?._id === user._id;

            return (
              <TouchableOpacity
                key={forum._id}
                style={styles.forumCard}
                onPress={() => handleViewForum(forum)}
              >
                <View style={styles.forumHeader}>
                  {forum.profilePicture ? (
                    <Image source={{ uri: forum.profilePicture }} style={styles.forumImage} />
                  ) : (
                    <View style={styles.forumIconContainer}>
                      <Ionicons name="trophy" size={24} color="#3B82F6" />
                    </View>
                  )}
                  <View style={styles.forumInfo}>
                    <Text style={styles.forumName}>{forum.name}</Text>
                    <Text style={styles.forumDescription} numberOfLines={2}>
                      {forum.description || 'No description available'}
                    </Text>
                    <View style={styles.forumStats}>
                      <View style={styles.statItem}>
                        <Ionicons name="people" size={14} color="#3B82F6" />
                        <Text style={styles.memberCount}>{forum.memberCount || 0} members</Text>
                      </View>
                      <View style={styles.badgeContainer}>
                        {isHead && (
                          <View style={styles.headBadge}>
                            <Text style={styles.headBadgeText}>Head</Text>
                          </View>
                        )}
                        {isMember && !isHead && (
                          <View style={styles.memberBadge}>
                            <Text style={styles.memberBadgeText}>Member</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    {forum.headUserId && (
                      <View style={styles.headInfo}>
                        <Text style={styles.headLabel}>Head: </Text>
                        <Text style={styles.headName}>{forum.headUserId.username}</Text>
                      </View>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            );
          })
        )}
        {/* Extra padding at bottom for scroll breathing room */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A202C',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3748',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  introSection: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  introTitle: {
    fontSize: 24,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  introDescription: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
  },
  forumCard: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    marginBottom: 15,
    padding: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  forumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#9CA3AF',
    fontSize: 16,
    fontFamily: fonts.body,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    marginTop: 5,
  },
  forumImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  forumIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  forumInfo: {
    flex: 1,
  },
  forumName: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginBottom: 5,
  },
  forumDescription: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 8,
    lineHeight: 18,
    fontFamily: fonts.body,
  },
  forumStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberCount: {
    fontSize: 12,
    color: '#3B82F6',
    marginLeft: 4,
    fontFamily: fonts.body,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  memberBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  memberBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  headInfo: {
    flexDirection: 'row',
    marginTop: 8,
    alignItems: 'center',
  },
  headLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: fonts.body,
  },
  headName: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: '#3B82F6',
  },
});
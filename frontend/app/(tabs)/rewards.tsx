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
  TextInput,
  TouchableOpacity, 
  TouchableWithoutFeedback,
  View, 
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts } from '@/utils/typography';
import { predictionForumsAPI, forumJoinRequestsAPI } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useDataCache } from '@/contexts/DataCacheContext';

// --- Types ---
interface Forum {
  _id: string;
  name: string;
  description?: string;
  profilePicture?: string;
  memberCount?: number;
  members: (string | { _id: string })[];
  headUserId: {
    _id: string;
    username: string;
  };
}

interface JoinRequest {
  _id: string;
  status: 'pending' | 'approved' | 'rejected';
  forumId: string | { _id: string };
}

export default function PredictionForumsScreen() {
  const { user } = useAuth();
  const { getCacheData, setCacheData } = useDataCache();
  
  const [forums, setForums] = useState<Forum[]>([]);
  const [filteredForums, setFilteredForums] = useState<Forum[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // --- Data Loading ---

  const loadPendingRequests = async () => {
    if (!user) return;
    try {
      const response = await forumJoinRequestsAPI.getMyJoinRequests();
      if (response.success) {
        const pending = new Set<string>(
          response.data
            .filter((req: JoinRequest) => req.status === 'pending')
            .map((req: JoinRequest) => 
              typeof req.forumId === 'string' ? req.forumId : req.forumId._id
            )
        );
        setPendingRequests(pending);
      }
    } catch (error) {
      console.error('Failed to load pending requests:', error);
    }
  };

  const loadForums = useCallback(async (isPullToRefresh = false) => {
    if (!isPullToRefresh) {
      const cachedData = getCacheData('predictionForums');
      if (cachedData) {
        setForums(cachedData);
        setLoading(false);
      }
    } else {
      setRefreshing(true);
    }

    try {
      // Fetch both forums and requests in parallel
      const [forumRes] = await Promise.all([
        predictionForumsAPI.getPredictionForums(),
        loadPendingRequests()
      ]);

      if (forumRes.success) {
        setCacheData('predictionForums', forumRes.data);
        setForums(forumRes.data);
        setFilteredForums(forumRes.data);
      }
    } catch (error: any) {
      if (forums.length === 0) {
        Alert.alert('Error', error.message || 'Failed to load forums');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getCacheData, setCacheData, forums.length, user]);

  useEffect(() => {
    loadForums();
  }, []);

  // Filter forums based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredForums(forums);
    } else {
      const query = searchQuery.toLowerCase().trim();
      const filtered = forums.filter(forum => 
        forum.name.toLowerCase().includes(query) ||
        forum.description?.toLowerCase().includes(query) ||
        forum.headUserId?.username.toLowerCase().includes(query)
      );
      setFilteredForums(filtered);
    }
  }, [searchQuery, forums]);

  // --- Handlers ---

  const handleRequestToJoin = async (forum: Forum) => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to request to join forums');
      return;
    }

    try {
      const response = await forumJoinRequestsAPI.createJoinRequest(forum._id);
      if (response.success) {
        Alert.alert('Success', `Your request to join ${forum.name} has been sent!`);
        setPendingRequests(prev => new Set(prev).add(forum._id));
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send join request');
    }
  };

  const handleViewForum = (forum: Forum) => {
    const isMemberOrHead = isMember(forum) || isHead(forum);
    
    router.push({
      pathname: isMemberOrHead ? '/prediction-forum-detail' : '/forum-preview',
      params: { id: forum._id }
    });
  };

  // --- Helper Functions ---

  const isMember = (forum: Forum) => {
    if (!user) return false;
    return forum.members?.some((member) => 
      (typeof member === 'string' ? member : member._id) === user._id
    );
  };

  const isHead = (forum: Forum) => {
    if (!user) return false;
    return forum.headUserId?._id === user._id;
  };

  // --- Renders ---

  if (loading && forums.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Prediction Forums</Text>
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
        <Text style={styles.headerTitle}>Prediction Forums</Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            style={styles.content} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadForums(true)}
                tintColor="#3B82F6"
                colors={['#3B82F6']}
              />
            }
          >
            <View style={styles.introSection}>
              <Text style={styles.introTitle}>Join Expert Forums</Text>
              <Text style={styles.introDescription}>
                Connect with top football analysts and get exclusive insights.
              </Text>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search forums..."
                placeholderTextColor="#6B7280"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  onPress={() => setSearchQuery('')}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            {forums.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color="#9CA3AF" />
                <Text style={styles.emptyText}>No Prediction Forums Yet</Text>
              </View>
            ) : filteredForums.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={64} color="#9CA3AF" />
                <Text style={styles.emptyText}>No forums found</Text>
                <Text style={styles.emptySubtext}>Try a different search term</Text>
              </View>
            ) : (
              filteredForums.map((forum) => {
            const memberStatus = isMember(forum);
            const headStatus = isHead(forum);
            const isPending = pendingRequests.has(forum._id);

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
                    <Text style={styles.forumName} numberOfLines={1}>{forum.name}</Text>
                    <Text style={styles.forumDescription} numberOfLines={1}>
                      {forum.description || 'No description available'}
                    </Text>
                    
                    <View style={styles.forumStats}>
                      <View style={styles.statItem}>
                        <Ionicons name="people" size={14} color="#9CA3AF" />
                        <Text style={styles.memberCount}>
                          {forum.members?.length || forum.memberCount || 0}
                        </Text>
                      </View>
                      {forum.headUserId && (
                        <View style={styles.headInfo}>
                          <Text style={styles.headLabel}>Head: </Text>
                          <Text style={styles.headName}>{forum.headUserId.username}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {headStatus ? (
                    <View style={styles.headBadge}>
                      <Text style={styles.headBadgeText}>Head</Text>
                    </View>
                  ) : memberStatus ? (
                    <View style={styles.memberBadge}>
                      <Text style={styles.memberBadgeText}>Member</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.joinButton, isPending && styles.pendingButton]}
                      onPress={(e) => {
                        e.stopPropagation();
                        if (!isPending) handleRequestToJoin(forum);
                      }}
                      disabled={isPending}
                    >
                      <Text style={styles.joinButtonText}>
                        {isPending ? 'Pending' : 'Join'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Join forums to access exclusive predictions and insights.
          </Text>
        </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A202C',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3748',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
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
    marginBottom: 8,
    textAlign: 'center',
  },
  introDescription: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: fonts.body,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D3748',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#9CA3AF',
    fontFamily: fonts.body,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
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
    marginTop: 8,
  },
  forumCard: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
  },
  forumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  forumImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  forumIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  forumInfo: {
    flex: 1,
    marginRight: 8,
  },
  forumName: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  forumDescription: {
    fontSize: 13,
    color: '#9CA3AF',
    fontFamily: fonts.body,
    marginVertical: 2,
  },
  forumStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  memberCount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  headInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  headName: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: '#3B82F6',
  },
  joinButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pendingButton: {
    backgroundColor: '#4B5563',
  },
  joinButtonText: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  headBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderColor: '#3B82F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  headBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    color: '#3B82F6',
  },
  memberBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  memberBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    color: '#10B981',
  },
  footer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    fontFamily: fonts.body,
  },
});
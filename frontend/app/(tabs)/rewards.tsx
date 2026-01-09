import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts } from '@/utils/typography';
import { predictionForumsAPI } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useDataCache } from '@/contexts/DataCacheContext';

export default function RewardsScreen() {
  const { user } = useAuth();
  const { getCacheData, setCacheData } = useDataCache();
  const [forums, setForums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadForums();
  }, []);

  const loadForums = async () => {
    // First check cache
    const cachedData = getCacheData('predictionForums');
    if (cachedData) {
      setForums(cachedData);
      setLoading(false);
    }

    // Refresh in background
    try {
      const response = await predictionForumsAPI.getPredictionForums();
      if (response.success) {
        setCacheData('predictionForums', response.data);
        setForums(response.data);
      }
    } catch (error: any) {
      if (!cachedData) {
        Alert.alert('Error', error.message || 'Failed to load prediction forums');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchForums = loadForums;

  const handleJoinForum = async (forum: any) => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to join forums');
      return;
    }

    try {
      const response = await predictionForumsAPI.joinPredictionForum(forum._id);
      if (response.success) {
        Alert.alert('Success', `You've joined ${forum.name}!`);
        fetchForums(); // Refresh list to show updated membership
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join forum');
    }
  };

  const handleViewForum = (forum: any) => {
    router.push({
      pathname: '/prediction-forum-detail',
      params: { id: forum._id }
    });
  };

  const isMember = (forum: any) => {
    if (!user) return false;
    return forum.members?.some((member: any) => 
      (typeof member === 'string' ? member : member._id) === user._id
    );
  };

  const isHead = (forum: any) => {
    if (!user) return false;
    return forum.headUserId?._id === user._id;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
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
        <Text style={styles.headerTitle}>Prediction Forums</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>Join Expert Prediction Forums</Text>
          <Text style={styles.introDescription}>
            Connect with top football analysts, get exclusive insights, and improve your prediction accuracy
          </Text>
        </View>

        {forums.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>No Prediction Forums Yet</Text>
            <Text style={styles.emptySubtext}>Check back later for new forums!</Text>
          </View>
        ) : (
          forums.map((forum) => {
            const memberStatus = isMember(forum);
            const headStatus = isHead(forum);

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
                        <Ionicons name="people" size={14} color="#9CA3AF" />
                        <Text style={styles.memberCount}>{forum.members?.length || forum.memberCount || 0} members</Text>
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
                      style={styles.joinButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleJoinForum(forum);
                      }}
                    >
                      <Text style={styles.joinButtonText}>Join</Text>
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
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    color: '#9CA3AF',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    marginTop: 5,
  },
  forumCard: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    marginBottom: 15,
    padding: 15,
  },
  forumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 18,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginBottom: 5,
  },
  forumDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
    lineHeight: 20,
  },
  forumStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  memberCount: {
    fontSize: 12,
    color: '#3B82F6',
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
    marginLeft: 4,
  },
  joinButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginLeft: 'auto',
  },
  joinButtonText: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  headBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 'auto',
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
    marginLeft: 'auto',
  },
  memberBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

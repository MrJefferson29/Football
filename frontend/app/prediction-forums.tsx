import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts } from '@/utils/typography';
import { predictionForumsAPI } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useDataCache } from '@/contexts/DataCacheContext';

export default function PredictionForumsScreen() {
  const { user } = useAuth();
  const { getCacheData, setCacheData } = useDataCache();
  const [forums, setForums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForum, setSelectedForum] = useState<string | null>(null);

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
        fetchForums();
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

  if (loading) {
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
  },
  forumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginBottom: 5,
  },
  forumDescription: {
    fontSize: 13,
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
  headInfo: {
    flexDirection: 'row',
    marginTop: 8,
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

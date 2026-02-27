import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts } from '@/utils/typography';
import { predictionForumsAPI, forumJoinRequestsAPI } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

export default function ForumPreviewScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [forum, setForum] = useState<any>(null);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchForumData();
      checkPendingRequest();
    }
  }, [id]);

  const fetchForumData = async () => {
    try {
      setLoading(true);
      const response = await predictionForumsAPI.getForumStatistics(id as string);
      if (response.success) {
        setForum(response.data.forum);
        setStatistics(response.data.statistics);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load forum information');
    } finally {
      setLoading(false);
    }
  };

  const checkPendingRequest = async () => {
    if (!user) return;
    try {
      const response = await forumJoinRequestsAPI.getMyJoinRequests();
      if (response.success) {
        const pending = response.data.some(
          (req: any) => 
            req.status === 'pending' && 
            (req.forumId._id === id || req.forumId === id)
        );
        setHasPendingRequest(pending);
      }
    } catch (error) {
      // Silently fail
      console.error('Failed to check pending request:', error);
    }
  };

  const handleRequestToJoin = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to request to join forums');
      return;
    }

    try {
      setRequesting(true);
      const response = await forumJoinRequestsAPI.createJoinRequest(id as string);
      if (response.success) {
        Alert.alert('Success', `Your request to join ${forum?.name} has been sent to the forum head!`);
        setHasPendingRequest(true);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send join request');
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Forum Preview</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading forum...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!forum) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Forum Preview</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyText}>Forum not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Forum Preview</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Locked Banner */}
        <View style={styles.lockedBanner}>
          <Ionicons name="lock-closed" size={24} color="#F59E0B" />
          <Text style={styles.lockedText}>
            You need to be a member to access this forum
          </Text>
        </View>

        {/* Forum Info Card */}
        <View style={styles.forumCard}>
          <View style={styles.forumHeader}>
            {forum.profilePicture ? (
              <Image source={{ uri: forum.profilePicture }} style={styles.forumImage} />
            ) : (
              <View style={styles.forumImagePlaceholder}>
                <Ionicons name="trophy" size={40} color="#3B82F6" />
              </View>
            )}
            <View style={styles.forumInfo}>
              <Text style={styles.forumName}>{forum.name}</Text>
              {forum.headUserId && (
                <View style={styles.headInfo}>
                  <Ionicons name="person" size={14} color="#9CA3AF" />
                  <Text style={styles.headName}>Head: {forum.headUserId.username}</Text>
                </View>
              )}
            </View>
          </View>

          {forum.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionLabel}>Description</Text>
              <Text style={styles.descriptionText}>{forum.description}</Text>
            </View>
          )}

          <View style={styles.memberCountContainer}>
            <Ionicons name="people" size={20} color="#3B82F6" />
            <Text style={styles.memberCountText}>
              {forum.memberCount || 0} members
            </Text>
          </View>
        </View>

        {/* Statistics Card */}
        {statistics && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Forum Statistics</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="stats-chart" size={24} color="#3B82F6" />
                </View>
                <Text style={styles.statValue}>{statistics.totalPredictions}</Text>
                <Text style={styles.statLabel}>Total Predictions</Text>
              </View>

              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: '#10B98120' }]}>
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                </View>
                <Text style={styles.statValue}>{statistics.completedPredictions}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>

              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: '#10B98120' }]}>
                  <Ionicons name="trophy" size={24} color="#10B981" />
                </View>
                <Text style={styles.statValue}>{statistics.correctPredictions}</Text>
                <Text style={styles.statLabel}>Correct</Text>
              </View>

              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: '#F59E0B20' }]}>
                  <Ionicons name="time" size={24} color="#F59E0B" />
                </View>
                <Text style={styles.statValue}>{statistics.pendingPredictions}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
            </View>

            {statistics.completedPredictions > 0 && (
              <View style={styles.accuracyContainer}>
                <View style={styles.accuracyBar}>
                  <View 
                    style={[
                      styles.accuracyFill, 
                      { width: `${statistics.accuracy}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.accuracyText}>
                  {statistics.accuracy}% Accuracy Rate
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Request to Join Button */}
        {user && (
          <TouchableOpacity
            style={[
              styles.requestButton,
              (hasPendingRequest || requesting) && styles.requestButtonDisabled
            ]}
            onPress={handleRequestToJoin}
            disabled={hasPendingRequest || requesting}
          >
            {requesting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons 
                  name={hasPendingRequest ? "checkmark-circle" : "person-add"} 
                  size={20} 
                  color="#FFFFFF" 
                />
                <Text style={styles.requestButtonText}>
                  {hasPendingRequest ? 'Request Pending' : 'Request to Join'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {!user && (
          <View style={styles.loginPrompt}>
            <Text style={styles.loginPromptText}>
              Please log in to request to join this forum
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B141A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#202C33',
    borderBottomWidth: 1,
    borderBottomColor: '#2A3942',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
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
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginTop: 15,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B20',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F59E0B40',
  },
  lockedText: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: '#F59E0B',
    marginLeft: 12,
    flex: 1,
  },
  forumCard: {
    backgroundColor: '#202C33',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A3942',
  },
  forumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  forumImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  forumImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  forumInfo: {
    flex: 1,
  },
  forumName: {
    fontSize: 22,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headName: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#9CA3AF',
  },
  descriptionContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2A3942',
  },
  descriptionLabel: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: '#8696A0',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#D1D5DB',
    lineHeight: 20,
  },
  memberCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2A3942',
    gap: 8,
  },
  memberCountText: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: '#3B82F6',
  },
  statsCard: {
    backgroundColor: '#202C33',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A3942',
  },
  statsTitle: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statItem: {
    width: '47%',
    backgroundColor: '#1A202C',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F620',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  accuracyContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#2A3942',
  },
  accuracyBar: {
    height: 8,
    backgroundColor: '#1A202C',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  accuracyFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  accuracyText: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: '#10B981',
    textAlign: 'center',
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    marginBottom: 16,
  },
  requestButtonDisabled: {
    backgroundColor: '#6B7280',
    opacity: 0.7,
  },
  requestButtonText: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  loginPrompt: {
    backgroundColor: '#202C33',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  loginPromptText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

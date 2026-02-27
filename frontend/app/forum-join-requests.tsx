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
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts } from '@/utils/typography';
import { forumJoinRequestsAPI } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

export default function ForumJoinRequestsScreen() {
  const { forumId } = useLocalSearchParams();
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (forumId) {
      fetchRequests();
    } else {
      fetchAllRequests();
    }
  }, [forumId]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await forumJoinRequestsAPI.getJoinRequestsByForum(forumId as string);
      if (response.success) {
        setRequests(response.data);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load join requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllRequests = async () => {
    try {
      setLoading(true);
      const response = await forumJoinRequestsAPI.getMyForumJoinRequests();
      if (response.success) {
        setRequests(response.data);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load join requests');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (forumId) {
      await fetchRequests();
    } else {
      await fetchAllRequests();
    }
    setRefreshing(false);
  };

  const handleApprove = async (requestId: string) => {
    try {
      setProcessingIds(prev => new Set(prev).add(requestId));
      const response = await forumJoinRequestsAPI.approveJoinRequest(requestId);
      if (response.success) {
        Alert.alert('Success', 'Join request approved');
        if (forumId) {
          await fetchRequests();
        } else {
          await fetchAllRequests();
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to approve request');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      setProcessingIds(prev => new Set(prev).add(requestId));
      const response = await forumJoinRequestsAPI.declineJoinRequest(requestId);
      if (response.success) {
        Alert.alert('Success', 'Join request declined');
        if (forumId) {
          await fetchRequests();
        } else {
          await fetchAllRequests();
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to decline request');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
  };

  const renderRequest = ({ item }: { item: any }) => {
    const isProcessing = processingIds.has(item._id);
    const isPending = item.status === 'pending';
    const isApproved = item.status === 'approved';
    const isDeclined = item.status === 'declined';

    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <View style={styles.userInfo}>
            {item.userId?.avatar ? (
              <Image source={{ uri: item.userId.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={20} color="#3B82F6" />
              </View>
            )}
            <View style={styles.userDetails}>
              <Text style={styles.username}>{item.userId?.username || 'Unknown User'}</Text>
              <Text style={styles.userEmail}>{item.userId?.email || ''}</Text>
            </View>
          </View>
          {!forumId && item.forumId && (
            <View style={styles.forumBadge}>
              <Text style={styles.forumBadgeText} numberOfLines={1}>
                {item.forumId.name}
              </Text>
            </View>
          )}
        </View>

        {item.message && (
          <View style={styles.messageContainer}>
            <Text style={styles.messageText}>{item.message}</Text>
          </View>
        )}

        <View style={styles.requestFooter}>
          <Text style={styles.timeText}>{getTimeAgo(item.createdAt)}</Text>
          <View style={styles.statusContainer}>
            {isPending ? (
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => handleApprove(item._id)}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Approve</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.declineButton]}
                  onPress={() => handleDecline(item._id)}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="close-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Decline</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[
                styles.statusBadge,
                isApproved && styles.approvedBadge,
                isDeclined && styles.declinedBadge
              ]}>
                <Text style={[
                  styles.statusText,
                  isApproved && styles.approvedText,
                  isDeclined && styles.declinedText
                ]}>
                  {isApproved ? 'Approved' : 'Declined'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Join Requests</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join Requests</Text>
        <View style={{ width: 40 }} />
      </View>

      {requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="person-add-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyText}>No Join Requests</Text>
          <Text style={styles.emptySubtext}>
            {forumId ? 'No requests for this forum yet' : 'No pending requests from any of your forums'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={[
            ...(pendingRequests.length > 0 ? [{ type: 'header', title: 'Pending Requests', count: pendingRequests.length }] : []),
            ...pendingRequests,
            ...(processedRequests.length > 0 ? [{ type: 'header', title: 'Processed Requests', count: processedRequests.length }] : []),
            ...processedRequests,
          ]}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderText}>{item.title}</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{item.count}</Text>
                  </View>
                </View>
              );
            }
            return renderRequest({ item });
          }}
          keyExtractor={(item, index) => item.type === 'header' ? `header-${item.title}-${index}` : item._id || `request-${index}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3B82F6"
            />
          }
        />
      )}
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
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  countBadge: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  requestCard: {
    backgroundColor: '#202C33',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A3942',
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 12,
    color: '#8696A0',
  },
  forumBadge: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 120,
  },
  forumBadgeText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: '#3B82F6',
  },
  messageContainer: {
    backgroundColor: '#1A202C',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  messageText: {
    fontSize: 14,
    color: '#D1D5DB',
    fontFamily: fonts.body,
  },
  requestFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 12,
    color: '#8696A0',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  declineButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  approvedBadge: {
    backgroundColor: '#10B981',
  },
  declinedBadge: {
    backgroundColor: '#6B7280',
  },
  statusText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  approvedText: {
    color: '#FFFFFF',
  },
  declinedText: {
    color: '#FFFFFF',
  },
});

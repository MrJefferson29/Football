import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts } from '@/utils/typography';
import { predictionForumsAPI, predictionsAPI } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

export default function PredictionForumDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [forum, setForum] = useState<any>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [predictionsLoading, setPredictionsLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchForum();
      fetchPredictions();
    }
  }, [id]);

  const fetchForum = async () => {
    try {
      setLoading(true);
      const response = await predictionForumsAPI.getPredictionForum(id as string);
      if (response.success) {
        setForum(response.data);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load forum');
    } finally {
      setLoading(false);
    }
  };

  const fetchPredictions = async () => {
    try {
      setPredictionsLoading(true);
      const response = await predictionsAPI.getPredictionsByForum(id as string);
      if (response.success) {
        setPredictions(response.data);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load predictions');
    } finally {
      setPredictionsLoading(false);
    }
  };

  const handleJoinForum = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to join forums');
      return;
    }

    try {
      const response = await predictionForumsAPI.joinPredictionForum(id as string);
      if (response.success) {
        Alert.alert('Success', `You've joined ${forum?.name}!`);
        fetchForum();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join forum');
    }
  };

  const isHead = user && forum?.headUserId?._id === user._id;
  const isMember = user && forum?.members?.some((m: any) =>
    (typeof m === 'string' ? m : m._id) === user._id
  );

  const renderPrediction = ({ item }: { item: any }) => {
    const isPending = item.status === 'pending';
    const isCompleted = item.status === 'completed';
    const isCorrect = item.isCorrect === true;

    return (
      <TouchableOpacity
        style={styles.predictionCard}
        onPress={() => router.push({
          pathname: '/prediction-detail',
          params: { id: item._id }
        })}
      >
        <View style={styles.predictionHeader}>
          <View style={styles.teamsContainer}>
            <View style={styles.team}>
              {item.team1.logo ? (
                <Image source={{ uri: item.team1.logo }} style={styles.teamLogo} />
              ) : (
                <View style={styles.teamLogoPlaceholder}>
                  <Text style={styles.teamLogoText}>{item.team1.name.charAt(0)}</Text>
                </View>
              )}
              <Text style={styles.teamName} numberOfLines={1}>{item.team1.name}</Text>
            </View>
            <View style={styles.vsContainer}>
              <Text style={styles.vsText}>VS</Text>
            </View>
            <View style={styles.team}>
              {item.team2.logo ? (
                <Image source={{ uri: item.team2.logo }} style={styles.teamLogo} />
              ) : (
                <View style={styles.teamLogoPlaceholder}>
                  <Text style={styles.teamLogoText}>{item.team2.name.charAt(0)}</Text>
                </View>
              )}
              <Text style={styles.teamName} numberOfLines={1}>{item.team2.name}</Text>
            </View>
          </View>
        </View>

        <View style={styles.scoreContainer}>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Predicted</Text>
            <Text style={styles.scoreValue}>
              {item.predictedScore.team1} - {item.predictedScore.team2}
            </Text>
          </View>
          {isCompleted && item.actualScore && (
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>Actual</Text>
              <Text style={[
                styles.scoreValue,
                isCorrect && styles.correctScore,
                !isCorrect && styles.incorrectScore
              ]}>
                {item.actualScore.team1} - {item.actualScore.team2}
              </Text>
            </View>
          )}
        </View>

        {item.league && (
          <Text style={styles.leagueText}>{item.league}</Text>
        )}

        <View style={styles.predictionFooter}>
          <View style={styles.statusBadge}>
            <Text style={[
              styles.statusText,
              isPending && styles.pendingStatus,
              isCompleted && isCorrect && styles.correctStatus,
              isCompleted && !isCorrect && styles.incorrectStatus
            ]}>
              {isPending ? 'Pending' : isCorrect ? 'Correct ✓' : 'Incorrect ✗'}
            </Text>
          </View>
          <View style={styles.predictionStats}>
            <Ionicons name="heart-outline" size={14} color="#9CA3AF" />
            <Text style={styles.likeCount}>{item.likes || 0}</Text>
            {item.comments && item.comments.length > 0 && (
              <>
                <Ionicons name="chatbubble-outline" size={14} color="#9CA3AF" style={{ marginLeft: 12 }} />
                <Text style={styles.commentCount}>{item.comments.length}</Text>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Forum Details</Text>
          <View style={styles.placeholder} />
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
          <Text style={styles.headerTitle}>Forum Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyText}>Forum not found</Text>
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
        <Text style={styles.headerTitle} numberOfLines={1}>{forum.name}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Forum Info */}
        <View style={styles.forumInfoCard}>
          {forum.profilePicture ? (
            <Image source={{ uri: forum.profilePicture }} style={styles.forumImage} />
          ) : (
            <View style={styles.forumImagePlaceholder}>
              <Ionicons name="trophy" size={40} color="#3B82F6" />
            </View>
          )}
          <Text style={styles.forumName}>{forum.name}</Text>
          {forum.description && (
            <Text style={styles.forumDescription}>{forum.description}</Text>
          )}
          <View style={styles.forumStats}>
            <View style={styles.statItem}>
              <Ionicons name="people" size={16} color="#3B82F6" />
              <Text style={styles.statText}>{forum.memberCount || 0} members</Text>
            </View>
            {forum.headUserId && (
              <View style={styles.statItem}>
                <Ionicons name="person" size={16} color="#3B82F6" />
                <Text style={styles.statText}>Head: {forum.headUserId.username}</Text>
              </View>
            )}
          </View>

          {isHead && (
            <TouchableOpacity
              style={styles.manageButton}
              onPress={() => router.push({
                pathname: '/manage-forum',
                params: { id: forum._id }
              })}
            >
              <Ionicons name="settings" size={20} color="#FFFFFF" />
              <Text style={styles.manageButtonText}>Manage Forum</Text>
            </TouchableOpacity>
          )}

          {!isHead && !isMember && (
            <TouchableOpacity
              style={styles.joinButton}
              onPress={handleJoinForum}
            >
              <Text style={styles.joinButtonText}>Join Forum</Text>
            </TouchableOpacity>
          )}

          {isHead && (
            <TouchableOpacity
              style={styles.createPredictionButton}
              onPress={() => router.push({
                pathname: '/create-prediction',
                params: { forumId: forum._id }
              })}
            >
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text style={styles.createPredictionButtonText}>Create Prediction</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Predictions Section */}
        <View style={styles.predictionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Predictions</Text>
            {predictionsLoading && (
              <ActivityIndicator size="small" color="#3B82F6" />
            )}
          </View>

          {predictions.length === 0 ? (
            <View style={styles.emptyPredictions}>
              <Ionicons name="football-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyPredictionsText}>No predictions yet</Text>
              {isHead && (
                <Text style={styles.emptyPredictionsSubtext}>
                  Create your first prediction to get started!
                </Text>
              )}
            </View>
          ) : (
            <FlatList
              data={predictions}
              renderItem={renderPrediction}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
              contentContainerStyle={styles.predictionsList}
            />
          )}
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
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
    flex: 1,
    marginHorizontal: 10,
    textAlign: 'center',
  },
  placeholder: {
    width: 34,
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  forumInfoCard: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    alignItems: 'center',
  },
  forumImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  forumImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  forumName: {
    fontSize: 24,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  forumDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 20,
  },
  forumStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15,
    marginBottom: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
    marginBottom: 10,
  },
  manageButtonText: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  joinButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginBottom: 10,
  },
  joinButtonText: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  createPredictionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  createPredictionButtonText: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  predictionsSection: {
    marginTop: 30,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
  },
  predictionsList: {
    gap: 15,
  },
  predictionCard: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  predictionHeader: {
    marginBottom: 15,
  },
  teamsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  team: {
    flex: 1,
    alignItems: 'center',
  },
  teamLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 8,
  },
  teamLogoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  teamLogoText: {
    fontSize: 20,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
  },
  teamName: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  vsContainer: {
    paddingHorizontal: 15,
  },
  vsText: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#9CA3AF',
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#4A5568',
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 5,
  },
  scoreValue: {
    fontSize: 20,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
  },
  correctScore: {
    color: '#10B981',
  },
  incorrectScore: {
    color: '#EF4444',
  },
  leagueText: {
    fontSize: 12,
    color: '#3B82F6',
    marginBottom: 10,
    textAlign: 'center',
  },
  predictionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#374151',
  },
  statusText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
  },
  pendingStatus: {
    color: '#F59E0B',
  },
  correctStatus: {
    color: '#10B981',
  },
  incorrectStatus: {
    color: '#EF4444',
  },
  predictionStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  commentCount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  emptyPredictions: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyPredictionsText: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginTop: 15,
  },
  emptyPredictionsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 5,
    textAlign: 'center',
  },
});

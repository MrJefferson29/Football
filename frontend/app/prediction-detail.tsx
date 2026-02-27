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
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts } from '@/utils/typography';
import { predictionsAPI } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

export default function PredictionDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPrediction();
    }
  }, [id]);

  const fetchPrediction = async () => {
    try {
      setLoading(true);
      const response = await predictionsAPI.getPrediction(id as string);
      if (response.success) {
        setPrediction(response.data);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load prediction');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to like predictions');
      return;
    }

    try {
      const response = await predictionsAPI.likePrediction(id as string);
      if (response.success) {
        fetchPrediction(); // Refresh to get updated likes
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to like prediction');
    }
  };

  const handleAddComment = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to comment');
      return;
    }

    if (!commentText.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    try {
      setPostingComment(true);
      const response = await predictionsAPI.addComment(id as string, commentText);
      if (response.success) {
        setCommentText('');
        fetchPrediction(); // Refresh to get new comment
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add comment');
    } finally {
      setPostingComment(false);
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Prediction Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading prediction...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!prediction) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Prediction Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyText}>Prediction not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isPending = prediction.status === 'pending';
  const isCompleted = prediction.status === 'completed';
  const isCorrect = prediction.isCorrect === true;
  const isHead = user && prediction.headUserId?._id === user._id;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prediction Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Prediction Card */}
        <View style={styles.predictionCard}>
          {/* Status Badge - Top */}
          <View style={styles.statusContainerTop}>
            <View style={[
              styles.statusBadge,
              isPending && styles.pendingBadge,
              isCompleted && isCorrect && styles.correctBadge,
              isCompleted && !isCorrect && styles.incorrectBadge
            ]}>
              <Ionicons 
                name={isPending ? 'time-outline' : isCorrect ? 'checkmark-circle' : 'close-circle'} 
                size={16} 
                color={isPending ? '#F59E0B' : isCorrect ? '#10B981' : '#EF4444'} 
              />
              <Text style={[
                styles.statusText,
                isPending && styles.pendingText,
                isCompleted && isCorrect && styles.correctText,
                isCompleted && !isCorrect && styles.incorrectText
              ]}>
                {isPending ? 'Pending' : isCorrect ? 'Correct' : 'Incorrect'}
              </Text>
            </View>
          </View>

          {/* Teams */}
          <View style={styles.teamsContainer}>
            <View style={styles.team}>
              {prediction.team1.logo ? (
                <Image source={{ uri: prediction.team1.logo }} style={styles.teamLogo} />
              ) : (
                <View style={styles.teamLogoPlaceholder}>
                  <Text style={styles.teamLogoText}>{prediction.team1.name.charAt(0)}</Text>
                </View>
              )}
              <Text style={styles.teamName} numberOfLines={2}>{prediction.team1.name}</Text>
            </View>

            <View style={styles.vsContainer}>
              <View style={styles.vsCircle}>
                <Text style={styles.vsText}>VS</Text>
              </View>
              <View style={styles.scoreDivider} />
            </View>

            <View style={styles.team}>
              {prediction.team2.logo ? (
                <Image source={{ uri: prediction.team2.logo }} style={styles.teamLogo} />
              ) : (
                <View style={styles.teamLogoPlaceholder}>
                  <Text style={styles.teamLogoText}>{prediction.team2.name.charAt(0)}</Text>
                </View>
              )}
              <Text style={styles.teamName} numberOfLines={2}>{prediction.team2.name}</Text>
            </View>
          </View>

          {/* Scores */}
          <View style={styles.scoresContainer}>
            <View style={styles.scoreRow}>
              <View style={styles.scoreBox}>
                <Text style={styles.scoreLabel}>Predicted</Text>
                <Text style={styles.scoreValue}>
                  {prediction.predictedScore.team1} - {prediction.predictedScore.team2}
                </Text>
              </View>

              {isCompleted && prediction.actualScore && (
                <View style={[
                  styles.scoreBox,
                  isCorrect && styles.scoreBoxCorrect,
                  !isCorrect && styles.scoreBoxIncorrect
                ]}>
                  <Text style={styles.scoreLabel}>Actual</Text>
                  <Text style={[
                    styles.scoreValue,
                    isCorrect && styles.correctScore,
                    !isCorrect && styles.incorrectScore
                  ]}>
                    {prediction.actualScore.team1} - {prediction.actualScore.team2}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Match Details */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Match Information</Text>
            <View style={styles.detailsGrid}>
              {prediction.league && (
                <View style={styles.detailCard}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="trophy" size={20} color="#3B82F6" />
                  </View>
                  <Text style={styles.detailLabel}>League</Text>
                  <Text style={styles.detailText}>{prediction.league}</Text>
                </View>
              )}
              {prediction.competition && (
                <View style={styles.detailCard}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="football" size={20} color="#10B981" />
                  </View>
                  <Text style={styles.detailLabel}>Competition</Text>
                  <Text style={styles.detailText}>{prediction.competition}</Text>
                </View>
              )}
              {prediction.matchDate && (
                <View style={styles.detailCard}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="calendar" size={20} color="#F59E0B" />
                  </View>
                  <Text style={styles.detailLabel}>Date & Time</Text>
                  <Text style={styles.detailText}>
                    {new Date(prediction.matchDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>
                  <Text style={styles.detailTimeText}>
                    {new Date(prediction.matchDate).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </Text>
                </View>
              )}
              {prediction.odds && (
                <View style={styles.detailCard}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="trending-up" size={20} color="#EF4444" />
                  </View>
                  <Text style={styles.detailLabel}>Odds</Text>
                  <Text style={styles.detailText}>{prediction.odds}</Text>
                </View>
              )}
            </View>
          </View>

          {prediction.additionalInfo && (
            <View style={styles.additionalInfoSection}>
              <Text style={styles.sectionTitle}>Additional Notes</Text>
              <View style={styles.additionalInfoContainer}>
                <Text style={styles.additionalInfoText}>{prediction.additionalInfo}</Text>
              </View>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleLike}
            >
              <Ionicons name="heart" size={22} color="#EF4444" />
              <Text style={styles.actionText}>{prediction.likes || 0}</Text>
              <Text style={styles.actionLabel}>Likes</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    fontFamily: fonts.heading,
    color: '#FFFFFF',
    flex: 1,
    marginHorizontal: 10,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    color: '#8696A0',
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
    paddingHorizontal: 16,
  },
  predictionCard: {
    backgroundColor: '#202C33',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusContainerTop: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pendingBadge: {
    backgroundColor: '#F59E0B20',
  },
  correctBadge: {
    backgroundColor: '#10B98120',
  },
  incorrectBadge: {
    backgroundColor: '#EF444420',
  },
  statusText: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
  },
  pendingText: {
    color: '#FBBF24',
  },
  correctText: {
    color: '#34D399',
  },
  incorrectText: {
    color: '#F87171',
  },
  teamsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  team: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
  },
  teamLogo: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#2A3942',
  },
  teamLogoPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#2A3942',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamLogoText: {
    fontSize: 36,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
  },
  teamName: {
    fontSize: 15,
    fontFamily: fonts.bodySemiBold,
    color: '#E9EDEF',
    textAlign: 'center',
  },
  vsContainer: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  vsCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2A3942',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  vsText: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: '#8696A0',
  },
  scoreDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#2A3942',
  },
  scoresContainer: {
    marginBottom: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#2A3942',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  scoreBox: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2A3942',
    borderRadius: 12,
    minHeight: 90,
    justifyContent: 'center',
  },
  scoreBoxCorrect: {
    backgroundColor: '#10B98115',
    borderWidth: 1,
    borderColor: '#10B98140',
  },
  scoreBoxIncorrect: {
    backgroundColor: '#EF444415',
    borderWidth: 1,
    borderColor: '#EF444440',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#8696A0',
    marginBottom: 8,
    fontFamily: fonts.body,
  },
  scoreValue: {
    fontSize: 32,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
  },
  correctScore: {
    color: '#34D399',
  },
  incorrectScore: {
    color: '#F87171',
  },
  detailsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#2A3942',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  detailIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1A202C',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 11,
    color: '#8696A0',
    fontFamily: fonts.body,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailText: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: '#E9EDEF',
    textAlign: 'center',
  },
  detailTimeText: {
    fontSize: 12,
    color: '#8696A0',
    fontFamily: fonts.body,
    marginTop: 2,
  },
  additionalInfoSection: {
    marginBottom: 24,
  },
  additionalInfoContainer: {
    padding: 16,
    backgroundColor: '#2A3942',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  additionalInfoText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#E9EDEF',
    lineHeight: 22,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#2A3942',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2A3942',
    borderRadius: 24,
    minWidth: 120,
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
  },
  actionLabel: {
    fontSize: 12,
    color: '#8696A0',
    fontFamily: fonts.body,
    marginLeft: 4,
  },
});

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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prediction</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Prediction Card */}
        <View style={styles.predictionCard}>
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
              <Text style={styles.teamName}>{prediction.team1.name}</Text>
            </View>

            <View style={styles.vsContainer}>
              <Text style={styles.vsText}>VS</Text>
            </View>

            <View style={styles.team}>
              {prediction.team2.logo ? (
                <Image source={{ uri: prediction.team2.logo }} style={styles.teamLogo} />
              ) : (
                <View style={styles.teamLogoPlaceholder}>
                  <Text style={styles.teamLogoText}>{prediction.team2.name.charAt(0)}</Text>
                </View>
              )}
              <Text style={styles.teamName}>{prediction.team2.name}</Text>
            </View>
          </View>

          {/* Scores */}
          <View style={styles.scoresContainer}>
            <View style={styles.scoreSection}>
              <Text style={styles.scoreLabel}>Predicted Score</Text>
              <Text style={styles.scoreValue}>
                {prediction.predictedScore.team1} - {prediction.predictedScore.team2}
              </Text>
            </View>

            {isCompleted && prediction.actualScore && (
              <View style={styles.scoreSection}>
                <Text style={styles.scoreLabel}>Actual Score</Text>
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

          {/* Status Badge */}
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusBadge,
              isPending && styles.pendingBadge,
              isCompleted && isCorrect && styles.correctBadge,
              isCompleted && !isCorrect && styles.incorrectBadge
            ]}>
              <Text style={[
                styles.statusText,
                isPending && styles.pendingText,
                isCompleted && isCorrect && styles.correctText,
                isCompleted && !isCorrect && styles.incorrectText
              ]}>
                {isPending ? 'Pending' : isCorrect ? 'Correct ✓' : 'Incorrect ✗'}
              </Text>
            </View>
          </View>

          {/* Match Details */}
          <View style={styles.detailsContainer}>
            {prediction.league && (
              <View style={styles.detailItem}>
                <Ionicons name="trophy" size={16} color="#3B82F6" />
                <Text style={styles.detailText}>{prediction.league}</Text>
              </View>
            )}
            {prediction.competition && (
              <View style={styles.detailItem}>
                <Ionicons name="football" size={16} color="#3B82F6" />
                <Text style={styles.detailText}>{prediction.competition}</Text>
              </View>
            )}
            {prediction.matchDate && (
              <View style={styles.detailItem}>
                <Ionicons name="calendar" size={16} color="#3B82F6" />
                <Text style={styles.detailText}>
                  {new Date(prediction.matchDate).toLocaleString()}
                </Text>
              </View>
            )}
            {prediction.odds && (
              <View style={styles.detailItem}>
                <Ionicons name="trending-up" size={16} color="#3B82F6" />
                <Text style={styles.detailText}>Odds: {prediction.odds}</Text>
              </View>
            )}
          </View>

          {prediction.additionalInfo && (
            <View style={styles.additionalInfoContainer}>
              <Text style={styles.additionalInfoLabel}>Additional Information</Text>
              <Text style={styles.additionalInfoText}>{prediction.additionalInfo}</Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleLike}
            >
              <Ionicons name="heart" size={20} color="#EF4444" />
              <Text style={styles.actionText}>{prediction.likes || 0}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>
            Comments ({prediction.comments?.length || 0})
          </Text>

          {prediction.comments && prediction.comments.length > 0 ? (
            prediction.comments.map((comment: any) => (
              <View key={comment._id || comment.createdAt} style={styles.commentItem}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentUser}>
                    {comment.userId?.username || 'User'}
                  </Text>
                  <Text style={styles.commentTime}>
                    {getTimeAgo(comment.createdAt)}
                  </Text>
                </View>
                <Text style={styles.commentText}>{comment.message}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyComments}>
              <Text style={styles.emptyCommentsText}>
                No comments yet. Be the first to comment!
              </Text>
            </View>
          )}

          {/* Add Comment */}
          {user && (
            <View style={styles.addCommentContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor="#9CA3AF"
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[
                  styles.sendCommentButton,
                  (!commentText.trim() || postingComment) && styles.sendCommentButtonDisabled
                ]}
                onPress={handleAddComment}
                disabled={!commentText.trim() || postingComment}
              >
                {postingComment ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
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
  predictionCard: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
  },
  teamsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  team: {
    flex: 1,
    alignItems: 'center',
  },
  teamLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  teamLogoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  teamLogoText: {
    fontSize: 32,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
  },
  teamName: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  vsContainer: {
    paddingHorizontal: 20,
  },
  vsText: {
    fontSize: 18,
    fontFamily: fonts.body,
    color: '#9CA3AF',
  },
  scoresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#4A5568',
  },
  scoreSection: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 28,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
  },
  correctScore: {
    color: '#10B981',
  },
  incorrectScore: {
    color: '#EF4444',
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statusBadge: {
    paddingHorizontal: 20,
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
    color: '#F59E0B',
  },
  correctText: {
    color: '#10B981',
  },
  incorrectText: {
    color: '#EF4444',
  },
  detailsContainer: {
    marginBottom: 20,
    gap: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  additionalInfoContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#1A202C',
    borderRadius: 8,
  },
  additionalInfoLabel: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  additionalInfoText: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#4A5568',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#374151',
    borderRadius: 20,
  },
  actionText: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  commentsSection: {
    marginTop: 30,
    marginBottom: 20,
  },
  commentsTitle: {
    fontSize: 20,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
    marginBottom: 15,
  },
  commentItem: {
    backgroundColor: '#2D3748',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentUser: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: '#3B82F6',
  },
  commentTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  commentText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  emptyComments: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyCommentsText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#4A5568',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#2D3748',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#FFFFFF',
    maxHeight: 100,
  },
  sendCommentButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    padding: 10,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendCommentButtonDisabled: {
    backgroundColor: '#4A5568',
    opacity: 0.5,
  },
});

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState, useEffect } from 'react';
import { ActivityIndicator, Alert, Dimensions, Linking, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View, FlatList, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { highlightsAPI } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { fonts } from '@/utils/typography';
import { getDirectImageUrl } from '@/utils/imageUtils';
import YoutubePlayer from 'react-native-youtube-iframe';

export default function VideoDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { id, videoId, title, youtubeUrl } = params;
  const { user } = useAuth();
  const [highlight, setHighlight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const flatListRef = useRef(null);

  useEffect(() => {
    fetchHighlight();
  }, [id]);

  const fetchHighlight = async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout - please try again')), 15000)
      );
      
      const response = await Promise.race([
        highlightsAPI.getHighlight(id),
        timeoutPromise
      ]);
      
      if (response.success && response.data) {
        setHighlight(response.data);
      } else {
        Alert.alert('Error', response.message || 'Failed to load highlight');
      }
    } catch (error) {
      console.error('Error fetching highlight:', error);
      setError(error.message || 'Failed to load highlight');
      // Don't show alert if it's just a route not found - might be a temporary issue
      if (error.message && error.message.includes('Route not found')) {
        console.warn('Route not found - this might be a backend routing issue');
      } else if (!error.message?.includes('timeout')) {
        Alert.alert('Error', error.message || 'Failed to load highlight');
      }
    } finally {
      setLoading(false);
    }
  };

  const getYouTubeVideoId = (url) => {
    if (!url) return '';
    
    // Handle YouTube Live URLs
    if (url.includes('youtube.com/live/')) {
      return url.split('youtube.com/live/')[1]?.split('?')[0]?.split('&')[0] || '';
    }
    // Handle standard watch URLs
    else if (url.includes('youtube.com/watch?v=')) {
      return url.split('v=')[1]?.split('&')[0] || '';
    }
    // Handle short URLs
    else if (url.includes('youtu.be/')) {
      return url.split('youtu.be/')[1]?.split('?')[0] || '';
    }
    // Handle embed URLs
    else if (url.includes('youtube.com/embed/')) {
      return url.split('embed/')[1]?.split('?')[0] || '';
    }
    // Handle YouTube Shorts
    else if (url.includes('youtube.com/shorts/')) {
      return url.split('shorts/')[1]?.split('?')[0] || '';
    }
    // Assume it's already a video ID
    else {
      return url;
    }
  };

  const actualVideoId = highlight ? getYouTubeVideoId(highlight.youtubeUrl) : (videoId || getYouTubeVideoId(youtubeUrl));
  const actualTitle = highlight ? highlight.title : title;
  const actualYoutubeUrl = highlight ? highlight.youtubeUrl : youtubeUrl;
  const thumbnailUrl = highlight?.thumbnail 
    ? getDirectImageUrl(highlight.thumbnail) 
    : (actualVideoId ? `https://img.youtube.com/vi/${actualVideoId}/maxresdefault.jpg` : null);

  const handleWatchFullVideo = () => {
    const url = actualYoutubeUrl || `https://www.youtube.com/watch?v=${actualVideoId}`;
    Linking.openURL(url)
      .catch(err => {
        console.error('Error opening YouTube link:', err);
        Alert.alert('Error', 'Something went wrong while opening the video');
      });
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !highlight || !user) return;

    const tempComment = {
      _id: Date.now().toString(),
      userId: {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
      },
      message: newComment,
      likes: 0,
      replies: [],
      createdAt: new Date().toISOString(),
    };

    // Optimistic update
    setHighlight(prev =>
      prev
        ? { ...prev, comments: [...prev.comments, tempComment] }
        : prev
    );

    const commentText = newComment;
    setNewComment('');

    try {
      await highlightsAPI.addComment(highlight._id, commentText);
      // Refresh to get updated comments with proper IDs
      await fetchHighlight();
    } catch (error) {
      // Revert optimistic update on error
      setHighlight(prev =>
        prev
          ? { ...prev, comments: prev.comments.filter(c => c._id !== tempComment._id) }
          : prev
      );
      Alert.alert('Error', error.message || 'Message failed to send');
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !replyingTo || !highlight || !user) return;

    try {
      const response = await highlightsAPI.replyToComment(highlight._id, replyingTo, replyText);
      if (response.success) {
        setReplyText('');
        setReplyingTo(null);
        await fetchHighlight(); // Refresh to get updated comments
      } else {
        Alert.alert('Error', response.message || 'Failed to send reply');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      Alert.alert('Error', error.message || 'Failed to send reply');
    }
  };

  const handleLikeComment = async (commentId) => {
    if (!highlight) return;

    try {
      const response = await highlightsAPI.likeComment(highlight._id, commentId);
      if (response.success) {
        await fetchHighlight(); // Refresh to get updated likes
      }
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const renderReply = (reply, commentId) => (
    <View key={reply._id} style={styles.replyItem}>
      <Image
        source={{ uri: reply.userId.avatar || 'https://via.placeholder.com/32' }}
        style={styles.replyAvatar}
      />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUser}>{reply.userId.username}</Text>
          <Text style={styles.commentTime}>{formatTimeAgo(reply.createdAt)}</Text>
        </View>
        <Text style={styles.commentText}>{reply.message}</Text>
        <TouchableOpacity style={styles.commentLike}>
          <Ionicons name="heart-outline" size={12} color="#9CA3AF" />
          <Text style={styles.commentLikeCount}>{reply.likes || 0}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderComment = ({ item }) => (
    <View style={styles.commentItem}>
      <Image
        source={{ uri: item.userId.avatar || 'https://via.placeholder.com/32' }}
        style={styles.commentAvatar}
      />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUser}>{item.userId.username}</Text>
          <Text style={styles.commentTime}>{formatTimeAgo(item.createdAt)}</Text>
        </View>
        <Text style={styles.commentText}>{item.message}</Text>
        <View style={styles.commentActions}>
          <TouchableOpacity
            style={styles.commentLike}
            onPress={() => handleLikeComment(item._id)}
          >
            <Ionicons name="heart-outline" size={14} color="#9CA3AF" />
            <Text style={styles.commentLikeCount}>{item.likes || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.replyButton}
            onPress={() => setReplyingTo(item._id)}
          >
            <Ionicons name="return-down-forward-outline" size={14} color="#9CA3AF" />
            <Text style={styles.replyButtonText}>Reply</Text>
          </TouchableOpacity>
        </View>
        {item.replies && item.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {item.replies.map((reply) => renderReply(reply, item._id))}
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading highlight...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!loading && !highlight && !actualVideoId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Video</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            {error ? error : 'Highlight not found'}
          </Text>
          {error && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => fetchHighlight()}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header - Keep this outside KAV so it stays pinned */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{actualTitle || 'Video'}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* KAV wraps everything else */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* The ScrollView must have flex: 1 to shrink when the keyboard appears */}
        <ScrollView
          style={styles.scrollableContent}
          contentContainerStyle={styles.scrollableContentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          {/* Video Player Section */}
          <View style={styles.videoContainer}>
            {!playing && thumbnailUrl && (
              <View style={styles.thumbnailContainer}>
                <Image
                  source={{ uri: thumbnailUrl }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
                <View style={styles.playButtonOverlay}>
                  <TouchableOpacity
                    style={styles.playButton}
                    onPress={() => setPlaying(true)}
                  >
                    <Ionicons name="play" size={48} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {playing && actualVideoId && (
              <YoutubePlayer
                height={Dimensions.get('window').height * 0.4}
                videoId={actualVideoId}
                play={playing}
                onChangeState={(state) => {
                  if (state === 'ended' || state === 'paused') {
                    setPlaying(false);
                  }
                }}
                onError={(error) => {
                  console.error('YouTube Player Error:', error);
                  setError('Failed to play video');
                  setPlaying(false);
                  Alert.alert(
                    'Playback Error',
                    'Unable to play this video. Would you like to watch it on YouTube instead?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Watch on YouTube', onPress: handleWatchFullVideo }
                    ]
                  );
                }}
                webViewProps={{
                  allowsInlineMediaPlayback: true,
                  mediaPlaybackRequiresUserAction: false,
                }}
                webViewStyle={{ opacity: 0.99 }}
              />
            )}
            {error && !playing && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={() => {
                    setError(null);
                    setPlaying(true);
                  }}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.retryButton, { marginTop: 10, backgroundColor: '#4285F4' }]}
                  onPress={handleWatchFullVideo}
                >
                  <Text style={styles.retryButtonText}>Watch on YouTube</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Description */}
          <View style={styles.descriptionContainer}>
            {highlight?.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{highlight.category}</Text>
              </View>
            )}
            <Text style={styles.descriptionText}>
              {highlight?.description || 'No description available'}
            </Text>
            {highlight?.views && (
              <Text style={styles.viewsText}>{highlight.views} views</Text>
            )}
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <View style={styles.commentsHeader}>
              <Text style={styles.commentsTitle}>Comments ({highlight?.comments?.length || 0})</Text>
            </View>

            {highlight?.comments && highlight.comments.length > 0 ? (
              highlight.comments.map((item) => renderComment({ item }))
            ) : (
              <View style={styles.emptyComments}>
                <Text style={styles.emptyCommentsText}>
                  No comments yet. Be the first to comment!
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Input sits outside the ScrollView but inside the KAV */}
        <View style={styles.bottomInputWrapper}>
          {replyingTo && (
            <View style={styles.replyingToContainer}>
              <View style={styles.replyingToContent}>
                <Ionicons name="return-down-forward" size={14} color="#3B82F6" />
                <Text style={styles.replyingToText}>
                  Replying to {highlight?.comments?.find((c) => c._id === replyingTo)?.userId.username}
                </Text>
                <Text style={styles.replyingToMessage} numberOfLines={1}>
                  {highlight?.comments?.find((c) => c._id === replyingTo)?.message || 'Comment'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setReplyingTo(null)}>
                <Ionicons name="close" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.commentInputContainer}>
            <View style={styles.inputRow}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.commentInput}
                  placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
                  placeholderTextColor="#9CA3AF"
                  value={replyingTo ? replyText : newComment}
                  onChangeText={replyingTo ? setReplyText : setNewComment}
                  multiline
                  maxLength={500}
                  returnKeyType="send"
                  blurOnSubmit={false}
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  ((replyingTo ? !replyText.trim() : !newComment.trim())) && styles.disabledSendButton
                ]}
                onPress={replyingTo ? handleSendReply : handleSendComment}
                disabled={(replyingTo ? !replyText.trim() : !newComment.trim())}
              >
                <Ionicons name="send" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  },
  placeholder: {
    width: 34,
  },
  videoContainer: {
    width: '100%',
    height: Dimensions.get('window').height * 0.4,
    backgroundColor: '#000000',
    position: 'relative',
  },
  thumbnailContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2D3748',
    padding: 20,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: fonts.body,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    fontFamily: fonts.body,
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 16,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollableContent: {
    flex: 1, // Allows the scroll area to give space to the keyboard
  },
  scrollableContentContainer: {
    paddingBottom: 20,
  },
  // Input sits outside the ScrollView but inside the KAV
  bottomInputWrapper: {
    backgroundColor: '#1A202C',
    borderTopWidth: 1,
    borderTopColor: '#2D3748',
    // Ensures the input stays above the iOS Home Indicator
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
  },
  descriptionContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3748',
  },
  commentsSection: {
    backgroundColor: '#1A202C',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#FFFFFF',
    lineHeight: 20,
    marginBottom: 8,
  },
  viewsText: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#9CA3AF',
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#2D3748',
    borderBottomWidth: 1,
    borderBottomColor: '#2D3748',
  },
  commentsTitle: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
  },
  emptyComments: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyCommentsText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#9CA3AF',
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUser: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  commentTime: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#9CA3AF',
  },
  commentText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#FFFFFF',
    lineHeight: 18,
    marginBottom: 6,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentLike: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  commentLikeCount: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyButtonText: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  repliesContainer: {
    marginTop: 10,
    marginLeft: 20,
    borderLeftWidth: 2,
    borderLeftColor: '#2D3748',
    paddingLeft: 15,
  },
  replyItem: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  replyingToContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2D3748',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 0,
    borderTopWidth: 1,
    borderTopColor: '#2D3748',
  },
  replyingToText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: '#3B82F6',
    marginLeft: 6,
    marginRight: 6,
  },
  replyingToMessage: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    flex: 1,
  },
  commentInputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    alignItems: 'flex-end',
    backgroundColor: '#1A202C',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#2D3748',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignItems: 'flex-end',
    marginRight: 10,
  },
  commentInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.body,
    color: '#FFFFFF',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    padding: 10,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledSendButton: {
    backgroundColor: '#4A5568',
    opacity: 0.5,
  },
});

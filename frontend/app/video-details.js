import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, Alert, Dimensions, Linking, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View, FlatList, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const [highlight, setHighlight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [error, setError] = useState(null);
  const [networkError, setNetworkError] = useState(false);
  const [playerLoadError, setPlayerLoadError] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [expandedReplies, setExpandedReplies] = useState(new Set());
  const flatListRef = useRef(null);

  useEffect(() => {
    fetchHighlight();
  }, [id]);

  // Auto-play video once videoId is available
  useEffect(() => {
    if (!loading && actualVideoId && !playerLoadError) {
      setPlaying(true);
      setError(null);
    }
  }, [loading, actualVideoId, playerLoadError]);

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
    // Improved Regex for YouTube ID extraction
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : url;
  };

  const actualVideoId = highlight ? getYouTubeVideoId(highlight.youtubeUrl) : (videoId || getYouTubeVideoId(youtubeUrl));
  const actualTitle = highlight ? highlight.title : title;
  const actualYoutubeUrl = highlight ? highlight.youtubeUrl : youtubeUrl;

  const onStateChange = useCallback((state) => {
    if (state === "ended") {
      setPlaying(false);
    }
  }, []);

  const onPlayerReady = useCallback(() => {
    // Start playing as soon as player is ready
    setPlaying(true);
  }, []);

  const handleWatchFullVideo = () => {
    const url = actualYoutubeUrl || `https://www.youtube.com/watch?v=${actualVideoId}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Cannot open YouTube'));
  };
  const thumbnailUrl = highlight?.thumbnail 
    ? getDirectImageUrl(highlight.thumbnail) 
    : (actualVideoId ? `https://img.youtube.com/vi/${actualVideoId}/maxresdefault.jpg` : null);


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
      const response = await highlightsAPI.addComment(highlight._id, commentText);
      if (response.success && response.data) {
        // Update the temp comment with the real one from server
        setHighlight(prev => {
          if (!prev) return prev;
          const updatedComments = prev.comments.map(c => 
            c._id === tempComment._id ? response.data : c
          );
          return { ...prev, comments: updatedComments };
        });
      }
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

    const tempReply = {
      _id: Date.now().toString(),
      userId: {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
      },
      message: replyText,
      likes: 0,
      createdAt: new Date().toISOString(),
    };

    // Optimistic update
    setHighlight(prev => {
      if (!prev) return prev;
      const updatedComments = prev.comments.map(comment => {
        if (comment._id === replyingTo) {
          return {
            ...comment,
            replies: [...(comment.replies || []), tempReply]
          };
        }
        return comment;
      });
      return { ...prev, comments: updatedComments };
    });

    const replyTextToSend = replyText;
    setReplyText('');
    setReplyingTo(null);

    try {
      const response = await highlightsAPI.replyToComment(highlight._id, replyingTo, replyTextToSend);
      if (response.success && response.data) {
        // Update the temp reply with the real one from server
        setHighlight(prev => {
          if (!prev) return prev;
          const updatedComments = prev.comments.map(comment => {
            if (comment._id === replyingTo) {
              const updatedReplies = comment.replies.map(r => 
                r._id === tempReply._id ? response.data : r
              );
              return { ...comment, replies: updatedReplies };
            }
            return comment;
          });
          return { ...prev, comments: updatedComments };
        });
      } else {
        Alert.alert('Error', response.message || 'Failed to send reply');
        // Revert optimistic update
        setHighlight(prev => {
          if (!prev) return prev;
          const updatedComments = prev.comments.map(comment => {
            if (comment._id === replyingTo) {
              return {
                ...comment,
                replies: comment.replies.filter(r => r._id !== tempReply._id)
              };
            }
            return comment;
          });
          return { ...prev, comments: updatedComments };
        });
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      Alert.alert('Error', error.message || 'Failed to send reply');
      // Revert optimistic update
      setHighlight(prev => {
        if (!prev) return prev;
        const updatedComments = prev.comments.map(comment => {
          if (comment._id === replyingTo) {
            return {
              ...comment,
              replies: comment.replies.filter(r => r._id !== tempReply._id)
            };
          }
          return comment;
        });
        return { ...prev, comments: updatedComments };
      });
    }
  };

  const handleLikeComment = async (commentId) => {
    if (!highlight || !user) return;

    // Find the comment to update
    const comment = highlight.comments.find(c => c._id === commentId);
    if (!comment) return;

    // Check if user already liked this comment
    const wasLiked = comment.likedBy?.some(id => {
      const idValue = typeof id === 'string' ? id : (id?._id || id);
      const userIdValue = typeof user._id === 'string' ? user._id : (user._id?._id || user._id);
      return idValue === userIdValue;
    }) || false;
    
    const newLikes = wasLiked ? Math.max(0, (comment.likes || 0) - 1) : (comment.likes || 0) + 1;

    // Optimistic update
    setHighlight(prev => {
      if (!prev) return prev;
      const updatedComments = prev.comments.map(c => {
        if (c._id === commentId) {
          const currentLikedBy = c.likedBy || [];
          const userIdValue = typeof user._id === 'string' ? user._id : (user._id?._id || user._id);
          
          return {
            ...c,
            likes: newLikes,
            likedBy: wasLiked 
              ? currentLikedBy.filter(id => {
                  const idValue = typeof id === 'string' ? id : (id?._id || id);
                  return idValue !== userIdValue;
                })
              : [...currentLikedBy, user._id]
          };
        }
        return c;
      });
      return { ...prev, comments: updatedComments };
    });

    try {
      const response = await highlightsAPI.likeComment(highlight._id, commentId);
      if (response.success && response.data) {
        // Update with server response to ensure consistency
        setHighlight(prev => {
          if (!prev) return prev;
          const updatedComments = prev.comments.map(c => {
            if (c._id === commentId) {
              // Merge server response with existing comment data
              return {
                ...c,
                ...response.data,
                // Ensure we preserve other fields
                userId: c.userId,
                replies: c.replies
              };
            }
            return c;
          });
          return { ...prev, comments: updatedComments };
        });
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      // Revert optimistic update on error
      setHighlight(prev => {
        if (!prev) return prev;
        const updatedComments = prev.comments.map(c => {
          if (c._id === commentId) {
            return {
              ...c,
              likes: comment.likes,
              likedBy: comment.likedBy
            };
          }
          return c;
        });
        return { ...prev, comments: updatedComments };
      });
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

  const renderReply = (reply, commentId) => {
    if (!reply || !reply.userId) {
      return null; // Skip rendering if reply or userId is missing
    }
    
    return (
      <View style={styles.replyItem}>
        <Image
          source={{ uri: reply.userId.avatar || 'https://via.placeholder.com/32' }}
          style={styles.replyAvatar}
        />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentUser}>{reply.userId.username || 'Unknown'}</Text>
            <Text style={styles.commentTime}>{formatTimeAgo(reply.createdAt)}</Text>
          </View>
          <Text style={styles.commentText}>{reply.message || ''}</Text>
          <TouchableOpacity style={styles.commentLike}>
            <Ionicons name="heart-outline" size={12} color="#9CA3AF" />
            <Text style={styles.commentLikeCount}>{reply.likes || 0}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const toggleReplies = (commentId) => {
    setExpandedReplies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const renderComment = ({ item }) => {
    // Safety check for comment userId
    if (!item || !item.userId) {
      return null;
    }

    const replies = (item.replies || []).filter(reply => reply && reply.userId);
    const replyCount = replies.length;
    const isExpanded = expandedReplies.has(item._id);
    const showSeeMore = replyCount > 2;
    const displayedReplies = showSeeMore && !isExpanded ? replies.slice(0, 2) : replies;

    return (
      <View style={styles.commentItem}>
        <Image
          source={{ uri: item.userId.avatar || 'https://via.placeholder.com/32' }}
          style={styles.commentAvatar}
        />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentUser}>{item.userId.username || 'Unknown'}</Text>
            <Text style={styles.commentTime}>{formatTimeAgo(item.createdAt)}</Text>
          </View>
          <Text style={styles.commentText}>{item.message || ''}</Text>
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
          {replyCount > 0 && (
            <View style={styles.repliesContainer}>
              {displayedReplies.map((reply) => (
                <View key={reply._id || reply.id || `reply-${item._id}-${reply.createdAt}`}>
                  {renderReply(reply, item._id)}
                </View>
              ))}
              {showSeeMore && (
                <TouchableOpacity
                  style={styles.seeMoreButton}
                  onPress={() => toggleReplies(item._id)}
                >
                  <Text style={styles.seeMoreButtonText}>
                    {isExpanded ? 'See less' : `See ${replyCount - 2} more replies`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      
      {/* Header - Keep this outside scroll so it stays pinned */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{actualTitle || 'Video'}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* KAV wraps scrollable content and input */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : null}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* The ScrollView must have flex: 1 to shrink when the keyboard appears */}
        <ScrollView
          style={styles.scrollableContent}
          contentContainerStyle={styles.scrollableContentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          {/* Video Player Section */}
          <View style={styles.videoContainer}>
            {actualVideoId && !playerLoadError ? (
              <YoutubePlayer
                height={Dimensions.get('window').height * 0.4}
                videoId={actualVideoId}
                play={playing}
                onChangeState={onStateChange}
                onReady={onPlayerReady}
                initialPlayerParams={{
                  autoplay: 1,
                }}
                onError={() => {
                  setPlayerLoadError(true);
                  setPlaying(false);
                }}
                webViewProps={{
                  allowsInlineMediaPlayback: true,
                  mediaPlaybackRequiresUserAction: false,
                }}
              />

            ) : (thumbnailUrl || playerLoadError) ? (
              <View style={styles.thumbnailContainer}>
                <Image
                  source={{ uri: thumbnailUrl }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
                <View style={styles.playButtonOverlay}>
                  <TouchableOpacity
                    style={styles.playButton}
                    onPress={handleWatchFullVideo}
                  >
                    <Ionicons name="play" size={48} color="#FFFFFF" />
                  </TouchableOpacity>
                  {playerLoadError && (
                    <View style={styles.errorOverlay}>
                      <Text style={styles.errorOverlayText}>Network Error</Text>
                      <Text style={styles.errorOverlaySubtext}>Tap play to open in YouTube</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : null}
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
              <Text style={styles.viewsText}>{highlight.views}</Text>
            )}
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <View style={styles.commentsHeader}>
              <Text style={styles.commentsTitle}>Comments ({highlight?.comments?.length || 0})</Text>
            </View>

            {highlight?.comments && highlight.comments.length > 0 ? (
              highlight.comments.filter(item => item && item.userId).map((item) => (
                <View key={item._id || item.id}>
                  {renderComment({ item })}
                </View>
              ))
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
        <View style={[styles.bottomInputWrapper, { paddingBottom: Math.max(insets.bottom, 15) }]}>
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
    height: Dimensions.get('window').height * 0.3,
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
  errorOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorOverlayText: {
    color: '#EF4444',
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    marginBottom: 4,
  },
  errorOverlaySubtext: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: fonts.body,
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
    paddingTop: 10,
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
  seeMoreButton: {
    marginTop: 8,
    paddingVertical: 6,
  },
  seeMoreButtonText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: '#3B82F6',
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
  replyingToContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
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

"use client"

import Ionicons from "@expo/vector-icons/Ionicons"
import { router, useLocalSearchParams } from "expo-router"
import { useEffect, useState, useRef } from "react"
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { fonts } from '@/utils/typography'
import { liveMatchesAPI } from '@/utils/api'
import { useAuth } from '@/contexts/AuthContext'
import { initSocket, socketEvents } from '@/utils/socket'
import YoutubePlayer from 'react-native-youtube-iframe'
import { useDataCache } from '@/contexts/DataCacheContext'

const { width, height } = Dimensions.get("window")

interface Comment {
  _id: string
  userId: {
    _id: string
    username: string
    avatar?: string
  }
  message: string
  likes: number
  replies: Reply[]
  createdAt: string
}

interface Reply {
  _id: string
  userId: {
    _id: string
    username: string
    avatar?: string
  }
  message: string
  likes: number
  createdAt: string
}

interface LiveMatch {
  _id: string
  title: string
  description: string
  homeTeam: string
  awayTeam: string
  homeLogo: string
  awayLogo: string
  youtubeUrl: string
  thumbnail: string
  matchDate: string
  matchTime: string
  isLive: boolean
  homeScore: number
  awayScore: number
  comments: Comment[]
  status?: 'upcoming' | 'live' | 'finished'
}

export default function LiveMatchScreen() {
  const { user } = useAuth()
  const { getCacheData, setCacheData } = useDataCache()
  const [match, setMatch] = useState<LiveMatch | null>(null)
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState("")
  const [showComments, setShowComments] = useState(true)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [countdown, setCountdown] = useState<string>("")
  const [isMatchLive, setIsMatchLive] = useState(false)
  const [matchStatus, setMatchStatus] = useState<'upcoming' | 'live' | 'finished'>('finished')
  const flatListRef = useRef<FlatList>(null)

  useEffect(() => {
    fetchMatch()
  }, [])

  useEffect(() => {
    if (match) {
      updateCountdown()
      const interval = setInterval(updateCountdown, 1000)
      return () => clearInterval(interval)
    }
  }, [match])

  useEffect(() => {
    // Initialize socket connection
    const socket = initSocket()
    
    if (socket && match?._id) {
      socket.emit('join-live-match', match._id)
      
      // Listen for new comments
      socket.on('new-comment', (data: { matchId: string; comment: Comment }) => {
        setMatch(prev => {
          if (!prev || prev._id !== data.matchId) return prev
      
          return {
            ...prev,
            comments: [...prev.comments, data.comment],
          }
        })
      })
      

      return () => {
        socket.off('new-comment')
        socket.emit('leave-live-match', match._id)
      }
    }
  }, [match?._id])

  const fetchMatch = async () => {
    // First check cache
    const cachedData = getCacheData('currentLiveMatch');
    if (cachedData) {
      setMatch(cachedData);
      setIsMatchLive(cachedData.isLive || cachedData.status === 'live');
      setMatchStatus(cachedData.status || 'finished');
      setLoading(false);
    }

    // Refresh in background
    try {
      setLoading(true);
      const response = await liveMatchesAPI.getCurrentMatch();
      if (response.success) {
        if (response.data) {
          setCacheData('currentLiveMatch', response.data);
          setMatch(response.data);
          setIsMatchLive(response.data.isLive || response.data.status === 'live');
          setMatchStatus(response.data.status || 'finished');
        } else {
          // No match available
          setMatch(null);
        }
      } else {
        if (!cachedData) {
          Alert.alert('Error', response.message || 'Failed to load live match');
        }
      }
    } catch (error: any) {
      console.error('Error fetching match:', error);
      if (!cachedData) {
        Alert.alert('Error', error.message || 'Failed to load live match');
      }
    } finally {
      setLoading(false);
    }
  }

  const updateCountdown = () => {
    if (!match || !match.matchDate) {
      setCountdown("")
      return
    }

    const now = new Date()
    const matchDateTime = new Date(match.matchDate)
    
    // Parse time (format: "HH:MM")
    if (match.matchTime) {
      const [hours, minutes] = match.matchTime.split(':').map(Number)
      matchDateTime.setHours(hours, minutes, 0, 0)
    }

    const diff = matchDateTime.getTime() - now.getTime()

    if (diff <= 0) {
      // Check if within 100 minutes
      const oneHundredMinutes = 100 * 60 * 1000
      if (Math.abs(diff) <= oneHundredMinutes) {
        setCountdown("LIVE")
        setIsMatchLive(true)
        setMatchStatus('live')
      } else {
        setCountdown("FINISHED")
        setIsMatchLive(false)
        setMatchStatus('finished')
      }
    } else {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (days > 0) {
        setCountdown(`${days}d ${hours}h ${minutes}m`)
      } else if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m ${seconds}s`)
      } else if (minutes > 0) {
        setCountdown(`${minutes}m ${seconds}s`)
      } else {
        setCountdown(`${seconds}s`)
      }
      setIsMatchLive(false)
      setMatchStatus('upcoming')
    }
  }

  const getYouTubeVideoId = (url: string): string => {
    // Extract video ID from various YouTube URL formats
    let videoId = ''
    
    // Handle YouTube Live URLs: https://www.youtube.com/live/VIDEO_ID
    if (url.includes('youtube.com/live/')) {
      videoId = url.split('youtube.com/live/')[1]?.split('?')[0]?.split('&')[0] || ''
    }
    // Handle standard watch URLs: https://www.youtube.com/watch?v=VIDEO_ID
    else if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('v=')[1]?.split('&')[0] || ''
    }
    // Handle short URLs: https://youtu.be/VIDEO_ID
    else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0] || ''
    }
    // Handle embed URLs: https://www.youtube.com/embed/VIDEO_ID
    else if (url.includes('youtube.com/embed/')) {
      videoId = url.split('embed/')[1]?.split('?')[0] || ''
    }
    // Handle YouTube Shorts: https://www.youtube.com/shorts/VIDEO_ID
    else if (url.includes('youtube.com/shorts/')) {
      videoId = url.split('shorts/')[1]?.split('?')[0] || ''
    }
    else {
      // Assume it's already a video ID
      videoId = url
    }
    
    return videoId
  }

  const handleSendComment = async () => {
    if (!newComment.trim() || !match || !user) return
  
    const tempComment: Comment = {
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
    }
  
    setMatch(prev =>
      prev
        ? { ...prev, comments: [...prev.comments, tempComment] }
        : prev
    )
  
    setNewComment("")
  
    try {
      await liveMatchesAPI.addComment(match._id, tempComment.message)
    } catch {
      Alert.alert("Error", "Message failed to send")
    }
  }
  

  const handleSendReply = async () => {
    if (!replyText.trim() || !replyingTo || !match) return

    try {
      const response = await liveMatchesAPI.replyToComment(match._id, replyingTo, replyText)
      if (response.success) {
        setReplyText("")
        setReplyingTo(null)
        await fetchMatch() // Refresh to get updated comments
      } else {
        Alert.alert('Error', response.message || 'Failed to send reply')
      }
    } catch (error: any) {
      console.error('Error sending reply:', error)
      Alert.alert('Error', error.message || 'Failed to send reply')
    }
  }

  const handleLikeComment = async (commentId: string) => {
    if (!match) return

    try {
      const response = await liveMatchesAPI.likeComment(match._id, commentId)
      if (response.success) {
        await fetchMatch() // Refresh to get updated likes
      }
    } catch (error: any) {
      console.error('Error liking comment:', error)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (seconds < 60) return 'now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return date.toLocaleDateString()
  }

  const renderReply = (reply: Reply, commentId: string) => (
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
  )

  const renderComment = ({ item }: { item: Comment }) => (
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
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading match...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!match) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="football-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyText}>No matches available</Text>
          <Text style={styles.emptySubtext}>Check back later for upcoming matches</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerLeft}>
          {matchStatus === 'live' && (
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
          {matchStatus === 'finished' && (
            <View style={styles.finishedIndicator}>
              <Text style={styles.finishedText}>FINISHED</Text>
            </View>
          )}
          <Text style={styles.matchTitle} numberOfLines={1}>{match.title}</Text>
        </View>
        <TouchableOpacity
          style={styles.commentsToggle}
          onPress={() => setShowComments(!showComments)}
        >
          <Ionicons name="chatbubbles" size={20} color="#FFFFFF" />
          <Text style={styles.headerButtonText}>{match.comments?.length || 0}</Text>
        </TouchableOpacity>
      </View>

      {/* Video/Thumbnail Container */}
      <View style={styles.videoContainer}>
        {isMatchLive ? (
          <YoutubePlayer
            height={height * 0.4}
            play={true}
            videoId={getYouTubeVideoId(match.youtubeUrl)}
            onChangeState={(state: string) => {
              console.log('Player state:', state);
              if (state === 'ended') {
                // Stream ended
                setIsMatchLive(false);
              }
            }}
            onError={(error: any) => {
              console.error('YouTube player error:', error);
              Alert.alert(
                'Playback Error',
                'Unable to play video. Would you like to open it in YouTube?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Open in YouTube',
                    onPress: () => {
                      const youtubeUrl = match.youtubeUrl.includes('youtube.com') 
                        ? match.youtubeUrl 
                        : `https://www.youtube.com/watch?v=${getYouTubeVideoId(match.youtubeUrl)}`;
                      Linking.openURL(youtubeUrl).catch(err => {
                        console.error('Failed to open URL:', err);
                        Alert.alert('Error', 'Could not open YouTube');
                      });
                    }
                  }
                ]
              );
            }}
            webViewStyle={{ opacity: 0.99 }}
            webViewProps={{
              allowsFullscreenVideo: true,
              mediaPlaybackRequiresUserAction: false,
            }}
          />
        ) : (
          <>
            <Image
              source={{ uri: match.thumbnail || 'https://via.placeholder.com/400' }}
              style={styles.videoThumbnail}
              resizeMode="cover"
            />
            <View style={styles.videoOverlay}>
              <View style={styles.matchInfo}>
                <View style={styles.teamInfo}>
                  <Image
                    source={{ uri: match.homeLogo || 'https://via.placeholder.com/50' }}
                    style={styles.teamLogo}
                  />
                  <Text style={styles.teamName}>{match.homeTeam}</Text>
                </View>
                <View style={styles.vsContainer}>
                  <Text style={styles.vsText}>VS</Text>
                </View>
                <View style={styles.teamInfo}>
                  <Text style={styles.teamName}>{match.awayTeam}</Text>
                  <Image
                    source={{ uri: match.awayLogo || 'https://via.placeholder.com/50' }}
                    style={styles.teamLogo}
                  />
                </View>
              </View>
              <View style={styles.countdownContainer}>
                {matchStatus === 'upcoming' && (
                  <>
                    <Text style={styles.countdownLabel}>Match starts in</Text>
                    <Text style={styles.countdownText}>{countdown}</Text>
                  </>
                )}
                {matchStatus === 'finished' && (
                  <>
                    <Text style={styles.countdownLabel}>Match has finished</Text>
                    <Text style={styles.finishedTextLarge}>This match has already taken place</Text>
                  </>
                )}
              </View>
            </View>
          </>
        )}
      </View>

      {/* Live Chat Section */}
      {showComments && (
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={styles.commentsHeader}>
            <Text style={styles.commentsTitle}>Live Chat ({match.comments?.length || 0})</Text>
            <TouchableOpacity onPress={() => setShowComments(false)}>
              <Ionicons name="close" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <FlatList
  ref={flatListRef}
  data={match.comments || []}
  renderItem={renderComment}
  keyExtractor={(item) => item._id}
  inverted
  keyboardShouldPersistTaps="handled"
  showsVerticalScrollIndicator={false}
  ListEmptyComponent={
    <View style={styles.emptyComments}>
      <Text style={styles.emptyCommentsText}>
        No comments yet. Be the first to comment!
      </Text>
    </View>
  }
/>


          <View style={styles.commentInputContainer}>
            {replyingTo && (
              <View style={styles.replyingToContainer}>
                <Text style={styles.replyingToText}>
                  Replying to {match.comments?.find((c) => c._id === replyingTo)?.userId.username}
                </Text>
                <TouchableOpacity onPress={() => setReplyingTo(null)}>
                  <Ionicons name="close" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
                placeholderTextColor="#9CA3AF"
                value={replyingTo ? replyText : newComment}
                onChangeText={replyingTo ? setReplyText : setNewComment}
                multiline
              />
              <TouchableOpacity
                style={styles.commentSendButton}
                onPress={replyingTo ? handleSendReply : handleSendComment}
              >
                <Ionicons name="send" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: fonts.body,
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginTop: 8,
  },
  finishedIndicator: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 12,
  },
  finishedText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  finishedTextLarge: {
    fontSize: 18,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    marginTop: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#1A202C",
    borderBottomWidth: 1,
    borderBottomColor: "#2D3748",
  },
  backButton: {
    padding: 5,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginLeft: 10,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EF4444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
    marginRight: 4,
  },
  liveText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: "#FFFFFF",
  },
  matchTitle: {
    fontSize: 18,
    fontFamily: fonts.bodySemiBold,
    color: "#FFFFFF",
    flex: 1,
  },
  commentsToggle: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 15,
  },
  headerButtonText: {
    fontSize: 12,
    color: "#FFFFFF",
    marginLeft: 4,
  },
  videoContainer: {
    height: height * 0.28,
    backgroundColor: "#000000",
    position: "relative",
  },
  videoThumbnail: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  videoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  matchInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 30,
  },
  teamInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  teamLogo: {
    width: 50,
    height: 50,
    marginHorizontal: 8,
  },
  teamName: {
    fontSize: 18,
    fontFamily: fonts.bodySemiBold,
    color: "#FFFFFF",
  },
  vsContainer: {
    alignItems: "center",
    marginHorizontal: 20,
  },
  vsText: {
    fontSize: 20,
    fontFamily: fonts.heading,
    color: "#FFFFFF",
  },
  countdownContainer: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 30,
    paddingVertical: 20,
    borderRadius: 20,
  },
  countdownLabel: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: "#9CA3AF",
    marginBottom: 8,
  },
  countdownText: {
    fontSize: 32,
    fontFamily: fonts.heading,
    color: "#3B82F6",
  },
  chatContainer: {
    flex: 1,
    backgroundColor: "#1A202C",
  },
  commentsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#2D3748",
  },
  commentsTitle: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: "#FFFFFF",
  },
  commentsList: {
    flex: 1,
    paddingHorizontal: 20,
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
    flexDirection: "row",
    marginBottom: 15,
    marginTop: 15,
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  commentUser: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: "#FFFFFF",
  },
  commentTime: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: "#9CA3AF",
  },
  commentText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: "#FFFFFF",
    lineHeight: 18,
    marginBottom: 6,
  },
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  commentLike: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 15,
  },
  commentLikeCount: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: "#9CA3AF",
    marginLeft: 4,
  },
  replyButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  replyButtonText: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: "#9CA3AF",
    marginLeft: 4,
  },
  repliesContainer: {
    marginTop: 10,
    marginLeft: 20,
    borderLeftWidth: 2,
    borderLeftColor: "#2D3748",
    paddingLeft: 15,
  },
  replyItem: {
    flexDirection: "row",
    marginBottom: 10,
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  replyingToContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#2D3748",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  replyingToText: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: "#9CA3AF",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  commentInputContainer: {
    backgroundColor: "#2D3748",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.body,
    color: "#FFFFFF",
    maxHeight: 80,
  },
  commentSendButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 15,
    padding: 8,
    marginLeft: 10,
  },
})

import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts } from '@/utils/typography';
import { fanGroupsAPI, uploadAPI } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { initSocket, socketEvents } from '@/utils/socket';

interface Post {
  _id: string;
  userId: {
    _id: string;
    username: string;
    avatar?: string;
  };
  content: string;
  image?: string;
  video?: string;
  url?: string;
  likes: number;
  likedBy: string[];
  comments: Array<{
    _id: string;
    userId: {
      _id: string;
      username: string;
      avatar?: string;
    };
    message: string;
    createdAt: string;
  }>;
  createdAt: string;
}

interface FanGroup {
  _id: string;
  name: string;
  slogan: string;
  logo: string;
  color: string;
  memberCount: number;
  posts: Post[];
  members: string[];
}

export default function FanGroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [fanGroup, setFanGroup] = useState<FanGroup | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postImage, setPostImage] = useState<string | null>(null);
  const [postVideo, setPostVideo] = useState<string | null>(null);
  const [postUrl, setPostUrl] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [commentText, setCommentText] = useState<{ [postId: string]: string }>({});
  const scrollViewRef = useRef<FlatList>(null);

  const isAdmin = user?.role === 'admin';
  const isMember = fanGroup?.members.some(memberId =>
    typeof memberId === 'string' ? memberId === user?._id : memberId._id === user?._id
  );

  useEffect(() => {
    if (id) {
      fetchFanGroup();
      initializeSocket();
    }

    return () => {
      socketEvents.off('new-post');
      socketEvents.off('new-comment');
    };
  }, [id]);

  const initializeSocket = () => {
    if (!user?._id || !id) return;

    const socket = initSocket(user._id);
    socketEvents.joinFanGroup(id);

    socketEvents.onNewPost((data: { groupId: string; post: Post }) => {
      if (data.groupId === id) {
        setFanGroup(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            posts: [...prev.posts, data.post],
          };
        });
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });

    socket.on('new-comment', (data: { groupId: string; postId: string; comment: any }) => {
      if (data.groupId === id) {
        setFanGroup(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            posts: prev.posts.map(post =>
              post._id === data.postId
                ? { ...post, comments: [...post.comments, data.comment] }
                : post
            ),
          };
        });
      }
    });
  };

  const fetchFanGroup = async () => {
    try {
      setIsLoading(true);
      const response = await fanGroupsAPI.getFanGroup(id!);
      if (response.success && response.data) {
        setFanGroup(response.data);
      } else {
        Alert.alert('Error', 'Failed to load fan group');
      }
    } catch (error: any) {
      console.error('Error fetching fan group:', error);
      Alert.alert('Error', error.message || 'Failed to load fan group');
    } finally {
      setIsLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPostImage(result.assets[0].uri);
        setPostVideo(null); // Clear video if image is selected
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const pickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPostVideo(result.assets[0].uri);
        setPostImage(null); // Clear image if video is selected
      }
    } catch (error: any) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video');
    }
  };

  const uploadMedia = async (mediaUri: string, type: 'image' | 'video'): Promise<string | null> => {
    try {
      setUploadingMedia(true);
      const response = await uploadAPI.uploadImage(mediaUri, type === 'video' ? 'fan-groups/videos' : 'fan-groups');
      if (response.success && response.data?.url) {
        return response.data.url;
      } else {
        Alert.alert('Error', response.message || 'Failed to upload media');
        return null;
      }
    } catch (error: any) {
      console.error('Error uploading media:', error);
      Alert.alert('Error', error.message || 'Failed to upload media');
      return null;
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleCreatePost = async () => {
    if ((!postContent.trim() && !postImage && !postVideo && !postUrl.trim()) || isPosting) return;

    try {
      setIsPosting(true);
      let imageUrl = null;
      let videoUrl = null;

      if (postImage) {
        imageUrl = await uploadMedia(postImage, 'image');
        if (!imageUrl) {
          setIsPosting(false);
          return;
        }
      }

      if (postVideo) {
        videoUrl = await uploadMedia(postVideo, 'video');
        if (!videoUrl) {
          setIsPosting(false);
          return;
        }
      }

      const response = await fanGroupsAPI.createPost(id!, {
        content: postContent.trim() || undefined,
        image: imageUrl || undefined,
        video: videoUrl || undefined,
        url: postUrl.trim() || undefined,
      });

      if (response.success) {
        setPostContent('');
        setPostImage(null);
        setPostVideo(null);
        setPostUrl('');
        setShowPostForm(false);
        fetchFanGroup(); // Refresh to get the new post
      } else {
        Alert.alert('Error', response.message || 'Failed to create post');
      }
    } catch (error: any) {
      console.error('Error creating post:', error);
      Alert.alert('Error', error.message || 'Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    try {
      const response = await fanGroupsAPI.likePost(id!, postId);
      if (response.success) {
        fetchFanGroup(); // Refresh to get updated likes
      } else {
        Alert.alert('Error', response.message || 'Failed to like post');
      }
    } catch (error: any) {
      console.error('Error liking post:', error);
    }
  };

  const handleComment = async (postId: string) => {
    const message = commentText[postId]?.trim();
    if (!message) return;

    try {
      const response = await fanGroupsAPI.commentOnPost(id!, postId, message);
      if (response.success) {
        setCommentText(prev => ({ ...prev, [postId]: '' }));
        fetchFanGroup(); // Refresh to get the new comment
      } else {
        Alert.alert('Error', response.message || 'Failed to add comment');
      }
    } catch (error: any) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', error.message || 'Failed to add comment');
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const renderPost = ({ item }: { item: Post }) => {
    const isLiked = item.likedBy.some(id => 
      typeof id === 'string' ? id === user?._id : id._id === user?._id
    );

    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <Image
            source={{
              uri: item.userId.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
            }}
            style={styles.postAvatar}
          />
          <View style={styles.postUserInfo}>
            <Text style={styles.postUsername}>{item.userId.username}</Text>
            <Text style={styles.postTime}>{getTimeAgo(item.createdAt)}</Text>
          </View>
        </View>

        {item.content && (
          <Text style={styles.postContent}>{item.content}</Text>
        )}

        {item.image && (
          <Image source={{ uri: item.image }} style={styles.postImage} resizeMode="cover" />
        )}

        {item.video && (
          <View style={styles.videoContainer}>
            <Text style={styles.videoPlaceholder}>Video: {item.video}</Text>
            <TouchableOpacity
              style={styles.playButton}
              onPress={() => Linking.openURL(item.video!)}
            >
              <Ionicons name="play-circle" size={48} color="#3B82F6" />
            </TouchableOpacity>
          </View>
        )}

        {item.url && (
          <TouchableOpacity
            style={styles.urlContainer}
            onPress={() => Linking.openURL(item.url!)}
          >
            <Ionicons name="link" size={20} color="#3B82F6" />
            <Text style={styles.urlText} numberOfLines={1}>{item.url}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.postActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLikePost(item._id)}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={20}
              color={isLiked ? '#EF4444' : '#9CA3AF'}
            />
            <Text style={[styles.actionText, isLiked && styles.likedText]}>
              {item.likes || 0}
            </Text>
          </TouchableOpacity>
          <View style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={20} color="#9CA3AF" />
            <Text style={styles.actionText}>{item.comments?.length || 0}</Text>
          </View>
        </View>

        {/* Comments Section */}
        {item.comments && item.comments.length > 0 && (
          <View style={styles.commentsSection}>
            {item.comments.map((comment) => (
              <View key={comment._id} style={styles.commentItem}>
                <Image
                  source={{
                    uri: comment.userId.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
                  }}
                  style={styles.commentAvatar}
                />
                <View style={styles.commentContent}>
                  <Text style={styles.commentUsername}>{comment.userId.username}</Text>
                  <Text style={styles.commentText}>{comment.message}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Comment Input - Admin Only */}
        {isAdmin && (
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              placeholderTextColor="#9CA3AF"
              value={commentText[item._id] || ''}
              onChangeText={(text) => setCommentText(prev => ({ ...prev, [item._id]: text }))}
              multiline
            />
            <TouchableOpacity
              style={styles.commentSendButton}
              onPress={() => handleComment(item._id)}
            >
              <Ionicons name="send" size={18} color="#3B82F6" />
            </TouchableOpacity>
          </View>
        )}
        {!isAdmin && (
          <View style={styles.readOnlyMessage}>
            <Ionicons name="lock-closed" size={16} color="#9CA3AF" />
            <Text style={styles.readOnlyText}>Only admins can comment</Text>
          </View>
        )}
      </View>
    );
  };

  if (isLoading && !fanGroup) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading fan group...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!fanGroup) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Fan group not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          {fanGroup.logo ? (
            <Image source={{ uri: fanGroup.logo }} style={styles.headerLogo} />
          ) : (
            <View style={[styles.headerLogoPlaceholder, { backgroundColor: fanGroup.color || '#3B82F6' }]}>
              <Text style={styles.headerLogoText}>{fanGroup.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{fanGroup.name}</Text>
            {fanGroup.slogan && (
              <Text style={styles.headerSlogan}>{fanGroup.slogan}</Text>
            )}
          </View>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Posts */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {fanGroup.posts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>No posts yet</Text>
            {isAdmin ? (
              <Text style={styles.emptySubtext}>Create the first post!</Text>
            ) : (
              <Text style={styles.emptySubtext}>Check back later for posts from admins</Text>
            )}
          </View>
        ) : (
          <FlatList
            ref={scrollViewRef}
            data={fanGroup.posts}
            renderItem={renderPost}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.postsList}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Admin Post Form */}
        {isAdmin && (
          <>
            {!showPostForm ? (
              <TouchableOpacity
                style={styles.createPostButton}
                onPress={() => setShowPostForm(true)}
              >
                <Ionicons name="add-circle" size={24} color="#FFFFFF" />
                <Text style={styles.createPostButtonText}>Create Post</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.postForm}>
                <View style={styles.postFormHeader}>
                  <Text style={styles.postFormTitle}>Create New Post</Text>
                  <TouchableOpacity onPress={() => setShowPostForm(false)}>
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.postFormInput}
                  placeholder="What's on your mind?"
                  placeholderTextColor="#9CA3AF"
                  value={postContent}
                  onChangeText={setPostContent}
                  multiline
                  maxLength={1000}
                />
                <TextInput
                  style={styles.postFormInput}
                  placeholder="URL (optional)"
                  placeholderTextColor="#9CA3AF"
                  value={postUrl}
                  onChangeText={setPostUrl}
                  keyboardType="url"
                  autoCapitalize="none"
                />
                <View style={styles.mediaButtons}>
                  <TouchableOpacity
                    style={styles.mediaButton}
                    onPress={pickImage}
                    disabled={uploadingMedia || !!postVideo}
                  >
                    <Ionicons name="image" size={20} color="#3B82F6" />
                    <Text style={styles.mediaButtonText}>Image</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.mediaButton}
                    onPress={pickVideo}
                    disabled={uploadingMedia || !!postImage}
                  >
                    <Ionicons name="videocam" size={20} color="#3B82F6" />
                    <Text style={styles.mediaButtonText}>Video</Text>
                  </TouchableOpacity>
                </View>
                {(postImage || postVideo) && (
                  <View style={styles.mediaPreview}>
                    {postImage && (
                      <>
                        <Image source={{ uri: postImage }} style={styles.mediaPreviewImage} />
                        <TouchableOpacity
                          style={styles.removeMediaButton}
                          onPress={() => setPostImage(null)}
                        >
                          <Ionicons name="close-circle" size={24} color="#EF4444" />
                        </TouchableOpacity>
                      </>
                    )}
                    {postVideo && (
                      <>
                        <View style={styles.videoPreview}>
                          <Ionicons name="videocam" size={32} color="#3B82F6" />
                          <Text style={styles.videoPreviewText}>Video selected</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.removeMediaButton}
                          onPress={() => setPostVideo(null)}
                        >
                          <Ionicons name="close-circle" size={24} color="#EF4444" />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
                <TouchableOpacity
                  style={[
                    styles.submitPostButton,
                    ((!postContent.trim() && !postImage && !postVideo && !postUrl.trim()) || isPosting || uploadingMedia) &&
                    styles.disabledButton
                  ]}
                  onPress={handleCreatePost}
                  disabled={(!postContent.trim() && !postImage && !postVideo && !postUrl.trim()) || isPosting || uploadingMedia}
                >
                  {isPosting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitPostButtonText}>Post</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3748',
  },
  backButton: {
    padding: 5,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 10,
  },
  headerLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogoText: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
  },
  headerSlogan: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    marginTop: 2,
  },
  headerSpacer: {
    width: 34,
  },
  content: {
    flex: 1,
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
  postsList: {
    padding: 20,
    paddingBottom: 100,
  },
  postCard: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  postUserInfo: {
    flex: 1,
  },
  postUsername: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  postTime: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    marginTop: 2,
  },
  postContent: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: '#FFFFFF',
    lineHeight: 22,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  videoContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#1A202C',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  videoPlaceholder: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  playButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A202C',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  urlText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#3B82F6',
    marginLeft: 8,
    flex: 1,
  },
  postActions: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1A202C',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    marginLeft: 6,
  },
  likedText: {
    color: '#EF4444',
  },
  commentsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1A202C',
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  commentContent: {
    flex: 1,
    backgroundColor: '#1A202C',
    borderRadius: 12,
    padding: 10,
  },
  commentUsername: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: '#3B82F6',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#FFFFFF',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1A202C',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#1A202C',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#FFFFFF',
    marginRight: 8,
  },
  commentSendButton: {
    padding: 8,
  },
  createPostButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#3B82F6',
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  createPostButtonText: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  postForm: {
    backgroundColor: '#2D3748',
    borderTopWidth: 1,
    borderTopColor: '#1A202C',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  postFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  postFormTitle: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
  },
  postFormInput: {
    backgroundColor: '#1A202C',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    fontFamily: fonts.body,
    color: '#FFFFFF',
    marginBottom: 12,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  mediaButtons: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A202C',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
  },
  mediaButtonText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#3B82F6',
    marginLeft: 6,
  },
  mediaPreview: {
    position: 'relative',
    marginBottom: 12,
  },
  mediaPreviewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  videoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#1A202C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPreviewText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    marginTop: 8,
  },
  removeMediaButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#1A202C',
    borderRadius: 12,
  },
  submitPostButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#4A5568',
    opacity: 0.5,
  },
  submitPostButtonText: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  readOnlyMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1A202C',
    paddingVertical: 8,
  },
  readOnlyText: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    marginLeft: 6,
    fontStyle: 'italic',
  },
});


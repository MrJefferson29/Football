import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { fonts } from '@/utils/typography';
import { chatAPI, uploadAPI, fanGroupsAPI } from '@/utils/api';
import { initSocket, socketEvents, disconnectSocket } from '@/utils/socket';
import { useAuth } from '@/contexts/AuthContext';

interface ChatMessage {
  _id: string;
  userId: {
    _id: string;
    username: string;
    avatar?: string;
  };
  message: string;
  image?: string;
  likes: number;
  createdAt: string;
}

interface FanGroup {
  _id: string;
  name: string;
  slogan: string;
  logo: string;
  color: string;
  memberCount: number;
  members: string[];
  createdBy: string;
}

function FanGroupsTab() {
  const { user } = useAuth();
  const [fanGroups, setFanGroups] = useState<FanGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchFanGroups();
  }, []);

  const fetchFanGroups = async () => {
    try {
      setIsLoading(true);
      const response = await fanGroupsAPI.getFanGroups();
      if (response.success && response.data) {
        setFanGroups(response.data);
      } else {
        Alert.alert('Error', 'Failed to load fan groups');
      }
    } catch (error: any) {
      console.error('Error fetching fan groups:', error);
      Alert.alert('Error', error.message || 'Failed to load fan groups');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    try {
      const response = await fanGroupsAPI.joinFanGroup(groupId);
      if (response.success) {
        Alert.alert('Success', 'You have joined the fan group!', [
          {
            text: 'View Posts',
            onPress: () => router.push(`/fan-group-detail?id=${groupId}` as any),
          },
          { text: 'OK' },
        ]);
        fetchFanGroups(); // Refresh list
      } else {
        Alert.alert('Error', response.message || 'Failed to join fan group');
      }
    } catch (error: any) {
      console.error('Error joining fan group:', error);
      Alert.alert('Error', error.message || 'Failed to join fan group');
    }
  };

  const isMember = (group: FanGroup) => {
    return group.members.some((memberId: any) => {
      const id = typeof memberId === 'string' ? memberId : (memberId?._id || memberId);
      return id === user?._id;
    });
  };

  const renderFanGroup = ({ item }: { item: FanGroup }) => {
    const member = isMember(item);
    
    return (
      <TouchableOpacity
        style={styles.fanGroupCard}
        onPress={() => router.push(`/fan-group-detail?id=${item._id}` as any)}
      >
        <View style={styles.fanGroupHeader}>
          {item.logo ? (
            <Image source={{ uri: item.logo }} style={styles.fanGroupLogo} />
          ) : (
            <View style={[styles.fanGroupLogoPlaceholder, { backgroundColor: item.color || '#3B82F6' }]}>
              <Text style={styles.fanGroupLogoText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.fanGroupInfo}>
            <Text style={styles.fanGroupName}>{item.name}</Text>
            {item.slogan && (
              <Text style={styles.fanGroupSlogan}>{item.slogan}</Text>
            )}
            <View style={styles.fanGroupStats}>
              <Ionicons name="people" size={14} color="#9CA3AF" />
              <Text style={styles.fanGroupMemberCount}>{item.memberCount} members</Text>
            </View>
          </View>
        </View>
        {!member && (
          <TouchableOpacity
            style={styles.joinButton}
            onPress={(e) => {
              e.stopPropagation();
              handleJoinGroup(item._id);
            }}
          >
            <Text style={styles.joinButtonText}>Join</Text>
          </TouchableOpacity>
        )}
        {member && (
          <View style={styles.memberBadge}>
            <Text style={styles.memberBadgeText}>Member</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.fanGroupsContainer}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading fan groups...</Text>
        </View>
      ) : fanGroups.length === 0 ? (
        <View style={styles.emptySection}>
          <Ionicons name="people-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyText}>No Fan Groups</Text>
          <Text style={styles.emptySubtext}>Check back later for new fan groups!</Text>
        </View>
      ) : (
        <FlatList
          data={fanGroups}
          renderItem={renderFanGroup}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.fanGroupsList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

export default function CommunityScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Live Chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const scrollViewRef = useRef<FlatList>(null);

  useEffect(() => {
    if (activeTab === 'Live Chat' && user?._id) {
      fetchMessages();
      initializeSocket();
    }

    return () => {
      if (activeTab === 'Live Chat') {
        socketEvents.off('new-message');
        socketEvents.off('message-liked');
      }
    };
  }, [activeTab, user?._id]);

  const initializeSocket = () => {
    if (!user?._id) return;

    const socket = initSocket(user._id);
    
    socketEvents.joinChat(user._id);

    socketEvents.onNewMessage((message: ChatMessage) => {
      setMessages(prev => {
        // Check if message already exists
        const exists = prev.some(msg => msg._id === message._id);
        if (exists) return prev;
        return [...prev, message];
      });
      
      // Auto-scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    // Listen for message liked events
    socketEvents.onMessageLiked((data: { messageId: string; likes: number }) => {
      setMessages(prev =>
        prev.map(msg =>
          msg._id === data.messageId ? { ...msg, likes: data.likes } : msg
        )
      );
    });
  };

  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      const response = await chatAPI.getMessages();
      if (response.success && response.data) {
        setMessages(response.data);
        // Auto-scroll to bottom after loading
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: false });
        }, 100);
      } else {
        Alert.alert('Error', 'Failed to load messages');
      }
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      Alert.alert('Error', error.message || 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload images');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async (imageUri: string): Promise<string | null> => {
    try {
      setUploadingImage(true);
      const response = await uploadAPI.uploadImage(imageUri, 'chat');
      if (response.success && response.data?.url) {
        return response.data.url;
      } else {
        Alert.alert('Error', response.message || 'Failed to upload image');
        return null;
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', error.message || 'Failed to upload image');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage) || isSending) return;

    try {
      setIsSending(true);
      let imageUrl = null;

      // Upload image if selected
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
        if (!imageUrl) {
          setIsSending(false);
          return;
        }
      }

      // Store message text and image for optimistic update
      const messageText = newMessage.trim();
      const messageImage = imageUrl;

      // Send message
      const response = await chatAPI.sendMessage(
        messageText || undefined,
        messageImage || undefined
      );

      if (response.success && response.data) {
        // Optimistically add the message immediately
        const newMsg: ChatMessage = {
          _id: response.data._id,
          userId: {
            _id: response.data.userId._id || response.data.userId,
            username: response.data.userId.username || user?.username || 'You',
            avatar: response.data.userId.avatar || user?.avatar
          },
          message: response.data.message || messageText,
          image: response.data.image || messageImage,
          likes: response.data.likes || 0,
          createdAt: response.data.createdAt || new Date().toISOString()
        };

        setMessages(prev => {
          // Check if message already exists (from socket)
          const exists = prev.some(msg => msg._id === newMsg._id);
          if (exists) return prev;
          return [...prev, newMsg];
        });

        setNewMessage('');
        setSelectedImage(null);

        // Auto-scroll to bottom
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        Alert.alert('Error', response.message || 'Failed to send message');
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', error.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleLikeMessage = async (messageId: string) => {
    try {
      const response = await chatAPI.likeMessage(messageId);
      if (response.success) {
        // Update will come via socket event
        // Optionally show a subtle feedback
      } else {
        Alert.alert('Error', response.message || 'Failed to like message');
      }
    } catch (error: any) {
      console.error('Error liking message:', error);
      const errorMessage = error.message || 'Failed to like message';
      // Don't show alert for "already liked" or "cannot like own message" - these are expected
      if (!errorMessage.includes('already') && !errorMessage.includes('cannot')) {
        Alert.alert('Error', errorMessage);
      }
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

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMe = user?._id === item.userId._id;
    const avatar = item.userId.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face';

    return (
      <View style={[styles.messageContainer, isMe && styles.myMessageContainer]}>
        {!isMe && (
          <Image source={{ uri: avatar }} style={styles.messageAvatar} />
        )}
        <View style={[styles.messageBubble, isMe && styles.myMessageBubble]}>
          {!isMe && (
            <Text style={styles.messageUser}>{item.userId.username}</Text>
          )}
          {item.image && (
            <Image 
              source={{ uri: item.image }} 
              style={styles.messageImage}
              resizeMode="cover"
            />
          )}
          {item.message && (
            <Text style={[styles.messageText, isMe && styles.myMessageText]}>
              {item.message}
            </Text>
          )}
          <View style={styles.messageFooter}>
            <Text style={styles.messageTime}>{getTimeAgo(item.createdAt)}</Text>
            {!isMe && (
              <TouchableOpacity
                style={styles.likeButton}
                onPress={() => handleLikeMessage(item._id)}
                activeOpacity={0.7}
              >
                <Ionicons name="heart-outline" size={14} color="#EF4444" />
                {item.likes > 0 && (
                  <Text style={styles.likeCount}>{item.likes}</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Community</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Live Chat' && styles.activeTab]}
          onPress={() => setActiveTab('Live Chat')}
        >
          <Ionicons name="chatbubbles" size={20} color={activeTab === 'Live Chat' ? '#FFFFFF' : '#9CA3AF'} />
          <Text style={[styles.tabText, activeTab === 'Live Chat' && styles.activeTabText]}>
            Live Chat
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Fan Groups' && styles.activeTab]}
          onPress={() => setActiveTab('Fan Groups')}
        >
          <Ionicons name="people" size={20} color={activeTab === 'Fan Groups' ? '#FFFFFF' : '#9CA3AF'} />
          <Text style={[styles.tabText, activeTab === 'Fan Groups' && styles.activeTabText]}>
            Fan Groups
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'Live Chat' && (
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Loading messages...</Text>
            </View>
          ) : (
            <>
              {/* Chat Messages */}
              {messages.length === 0 ? (
                <View style={styles.emptyChatContainer}>
                  <Ionicons name="chatbubbles-outline" size={64} color="#9CA3AF" />
                  <Text style={styles.emptyChatText}>No messages yet</Text>
                  <Text style={styles.emptyChatSubtext}>Be the first to start the conversation!</Text>
                </View>
              ) : (
                <FlatList
                  ref={scrollViewRef}
                  data={messages}
                  renderItem={renderMessage}
                  keyExtractor={(item) => item._id}
                  style={styles.messagesList}
                  contentContainerStyle={styles.messagesContent}
                  onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
                  keyboardShouldPersistTaps="handled"
                />
              )}

              {/* Selected Image Preview */}
              {selectedImage && (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setSelectedImage(null)}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Chat Input */}
              <View style={styles.chatInputContainer}>
                <View style={styles.inputWrapper}>
                  <TouchableOpacity
                    style={styles.attachButton}
                    onPress={pickImage}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? (
                      <ActivityIndicator size="small" color="#3B82F6" />
                    ) : (
                      <Ionicons name="image" size={20} color="#9CA3AF" />
                    )}
                  </TouchableOpacity>
                  <TextInput
                    style={styles.chatInput}
                    placeholder="Type a message..."
                    placeholderTextColor="#9CA3AF"
                    value={newMessage}
                    onChangeText={setNewMessage}
                    multiline
                    maxLength={500}
                    returnKeyType="send"
                    blurOnSubmit={false}
                  />
                </View>
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    ((!newMessage.trim() && !selectedImage) || isSending || uploadingImage) &&
                    styles.disabledSendButton
                  ]}
                  onPress={handleSendMessage}
                  disabled={(!newMessage.trim() && !selectedImage) || isSending || uploadingImage}
                >
                  {isSending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="send" size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      )}

      {activeTab === 'Fan Groups' && (
        <FanGroupsTab />
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3748',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginVertical: 15,
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontSize: 16,
    fontFamily: fonts.bodyMedium,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#FFFFFF',
    fontFamily: fonts.bodySemiBold,
  },
  chatContainer: {
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
  messagesList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  messagesContent: {
    paddingVertical: 10,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'flex-end',
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  messageBubble: {
    backgroundColor: '#2D3748',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '80%',
  },
  myMessageBubble: {
    backgroundColor: '#3B82F6',
  },
  messageUser: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: '#3B82F6',
    marginBottom: 4,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  myMessageText: {
    fontFamily: fonts.body,
    color: '#FFFFFF',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    fontFamily: fonts.body,
    color: '#9CA3AF',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  likeCount: {
    fontSize: 11,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#1A202C',
    borderRadius: 12,
  },
  chatInputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingBottom: Platform.OS === 'ios' ? 20 : 15,
    backgroundColor: '#1A202C',
    borderTopWidth: 1,
    borderTopColor: '#2D3748',
    alignItems: 'flex-end',
  },
  backButton: {
    padding: 5,
  },
  headerSpacer: {
    width: 34,
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
  attachButton: {
    marginRight: 10,
  },
  chatInput: {
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
  fanGroupsContainer: {
    flex: 1,
  },
  emptySection: {
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
  emptyChatContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyChatText: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
    marginTop: 15,
  },
  emptyChatSubtext: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    marginTop: 5,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  fanGroupsList: {
    padding: 20,
  },
  fanGroupCard: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fanGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fanGroupLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  fanGroupLogoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fanGroupLogoText: {
    fontSize: 24,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
  },
  fanGroupInfo: {
    flex: 1,
  },
  fanGroupName: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  fanGroupSlogan: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  fanGroupStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fanGroupMemberCount: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  joinButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  joinButtonText: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  memberBadge: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  memberBadgeText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
});

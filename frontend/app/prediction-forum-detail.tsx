import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts } from '@/utils/typography';
import { predictionForumsAPI, predictionsAPI, forumMessagesAPI, forumJoinRequestsAPI, uploadAPI } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';

export default function PredictionForumDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [forum, setForum] = useState<any>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [messageImage, setMessageImage] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [mergedItems, setMergedItems] = useState<any[]>([]);
  const [showForumInfo, setShowForumInfo] = useState(false);

  useEffect(() => {
    if (id) {
      fetchForum();
      fetchPredictions();
      fetchMessages();
    }
  }, [id]);

  // Merge and sort predictions and messages by date
  useEffect(() => {
    const items: any[] = [];
    
    // Add predictions with type marker
    predictions.forEach(pred => {
      items.push({
        ...pred,
        itemType: 'prediction',
        sortDate: new Date(pred.createdAt || pred.updatedAt)
      });
    });
    
    // Add messages with type marker
    messages.forEach(msg => {
      items.push({
        ...msg,
        itemType: 'message',
        sortDate: new Date(msg.createdAt)
      });
    });
    
    // Sort by date (oldest first, newest last)
    items.sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());
    
    setMergedItems(items);
    
    // Scroll to bottom after a short delay to ensure content is rendered
    if (items.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [predictions, messages]);

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

  const fetchMessages = async () => {
    try {
      setMessagesLoading(true);
      const response = await forumMessagesAPI.getForumMessages(id as string);
      if (response.success) {
        setMessages(response.data);
      }
    } catch (error: any) {
      console.error('Failed to load messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleRequestToJoin = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to request to join forums');
      return;
    }

    try {
      const response = await forumJoinRequestsAPI.createJoinRequest(id as string);
      if (response.success) {
        Alert.alert('Success', `Your request to join ${forum?.name} has been sent to the forum head!`);
        fetchForum();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send join request');
    }
  };

  const pickMessageImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload images');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadMessageImage(result.assets[0].uri);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadMessageImage = async (imageUri: string) => {
    try {
      setUploadingImage(true);
      const response = await uploadAPI.uploadImage(imageUri, 'forum-messages');
      if (response.success && response.data?.url) {
        setMessageImage(response.data.url);
      } else {
        Alert.alert('Error', response.message || 'Failed to upload image');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !messageImage) {
      Alert.alert('Error', 'Please enter a message or upload an image');
      return;
    }

    try {
      setSendingMessage(true);
      const response = await forumMessagesAPI.sendForumMessage(
        id as string,
        newMessage.trim(),
        messageImage || undefined
      );
      if (response.success) {
        setNewMessage('');
        setMessageImage(null);
        await fetchMessages();
        // Scroll to bottom after sending
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const isHead = user && forum?.headUserId?._id === user._id;
  const isMember = user && forum?.members?.some((m: any) =>
    (typeof m === 'string' ? m : m._id) === user._id
  );

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

  const renderChatItem = ({ item }: { item: any }) => {
    if (item.itemType === 'prediction') {
      const isPending = item.status === 'pending';
      const isCompleted = item.status === 'completed';
      const isCorrect = item.isCorrect === true;

      return (
        <TouchableOpacity
          style={styles.chatBubble}
          onPress={() => router.push({
            pathname: '/prediction-detail',
            params: { id: item._id }
          })}
        >
          <View style={styles.bubbleContents}>
            <View style={styles.predictionBubbleHeader}>
              <Text style={styles.bubbleSenderName}>
                {item.headUserId?.username || 'Forum Head'}
              </Text>
              <Text style={styles.bubbleTime}>{getTimeAgo(item.createdAt || item.updatedAt)}</Text>
            </View>
            
            <View style={styles.predictionBubbleBody}>
              <View style={styles.predictionTeamsRow}>
                <View style={styles.predictionTeamSmall}>
                  {item.team1.logo ? (
                    <Image source={{ uri: item.team1.logo }} style={styles.smallTeamLogo} />
                  ) : (
                    <View style={styles.smallTeamLogoPlaceholder}>
                      <Text style={styles.smallTeamLogoText}>{item.team1.name.charAt(0)}</Text>
                    </View>
                  )}
                  <Text style={styles.smallTeamName} numberOfLines={1}>{item.team1.name}</Text>
                </View>
                <Text style={styles.predictionVs}>VS</Text>
                <View style={styles.predictionTeamSmall}>
                  {item.team2.logo ? (
                    <Image source={{ uri: item.team2.logo }} style={styles.smallTeamLogo} />
                  ) : (
                    <View style={styles.smallTeamLogoPlaceholder}>
                      <Text style={styles.smallTeamLogoText}>{item.team2.name.charAt(0)}</Text>
                    </View>
                  )}
                  <Text style={styles.smallTeamName} numberOfLines={1}>{item.team2.name}</Text>
                </View>
              </View>
              
              <View style={styles.predictionScoreRow}>
                <Text style={styles.predictionScore}>
                  {item.predictedScore.team1} - {item.predictedScore.team2}
                </Text>
                {isCompleted && item.actualScore && (
                  <Text style={[
                    styles.actualScore,
                    isCorrect && styles.correctScore,
                    !isCorrect && styles.incorrectScore
                  ]}>
                    (Actual: {item.actualScore.team1} - {item.actualScore.team2})
                  </Text>
                )}
              </View>
              
              {item.league && (
                <Text style={styles.predictionLeague}>{item.league}</Text>
              )}
              
              <View style={styles.predictionBubbleFooter}>
                <View style={[
                  styles.predictionStatusBadge,
                  isPending && styles.pendingBadge,
                  isCompleted && isCorrect && styles.correctBadge,
                  isCompleted && !isCorrect && styles.incorrectBadge
                ]}>
                  <Text style={[
                    styles.predictionStatusText,
                    isPending && styles.pendingText,
                    isCompleted && isCorrect && styles.correctText,
                    isCompleted && !isCorrect && styles.incorrectText
                  ]}>
                    {isPending ? 'Pending' : isCorrect ? 'Correct ✓' : 'Incorrect ✗'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    } else {
      // Message item
      return (
        <View style={styles.chatBubble}>
          <View style={styles.bubbleContent}>
            <View style={styles.bubbleHeader}>
              <Text style={styles.bubbleSenderName}>
                {item.headUserId?.username || 'Forum Head'}
              </Text>
              <Text style={styles.bubbleTime}>{getTimeAgo(item.createdAt)}</Text>
            </View>
            {item.image && (
              <Image source={{ uri: item.image }} style={styles.messageBubbleImage} />
            )}
            {item.message && (
              <Text style={styles.messageBubbleText}>{item.message}</Text>
            )}
          </View>
        </View>
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.whatsappHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Forum Details</Text>
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
        <View style={styles.whatsappHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Forum Details</Text>
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
      {/* WhatsApp-style Header */}
      <View style={styles.whatsappHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.headerAvatarContainer}
          onPress={() => setShowForumInfo(true)}
          activeOpacity={0.7}
        >
          {forum.profilePicture ? (
            <Image source={{ uri: forum.profilePicture }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Ionicons name="trophy" size={20} color="#3B82F6" />
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.headerInfo}
          onPress={() => setShowForumInfo(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.headerTitle} numberOfLines={1}>{forum.name}</Text>
          <Text style={styles.headerSubtitle}>
            {forum.memberCount || 0} members
          </Text>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          {isHead && (
            <>
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={() => router.push({
                  pathname: '/forum-join-requests',
                  params: { forumId: forum._id }
                })}
              >
                <Ionicons name="people-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={() => router.push({
                  pathname: '/create-prediction',
                  params: { forumId: forum._id }
                })}
              >
                <Ionicons name="add-circle" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={() => router.push({
                  pathname: '/manage-forum',
                  params: { id: forum._id }
                })}
              >
                <Ionicons name="ellipsis-vertical" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          )}
          {!isHead && !isMember && (
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={handleRequestToJoin}
            >
              <Ionicons name="person-add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Chat Messages & Predictions */}
        {mergedItems.length === 0 && !predictionsLoading && !messagesLoading ? (
          <View style={styles.emptyChat}>
            <Ionicons name="chatbubbles-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyChatText}>No messages or predictions yet</Text>
            {isHead && (
              <Text style={styles.emptyChatSubtext}>
                Start the conversation or create a prediction!
              </Text>
            )}
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={mergedItems}
            renderItem={renderChatItem}
            keyExtractor={(item, index) => `${item.itemType}-${item._id}-${index}`}
            contentContainerStyle={styles.chatList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => {
              if (mergedItems.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
          />
        )}

        {/* Loading indicator */}
        {(predictionsLoading || messagesLoading) && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#3B82F6" />
          </View>
        )}

        {/* Message Form (Forum Head Only) */}
        {isHead && (
          <View style={styles.messageFormContainer}>
            {messageImage && (
              <View style={styles.messageImagePreview}>
                <Image source={{ uri: messageImage }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setMessageImage(null)}
                >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.messageInputRow}>
              <TouchableOpacity
                style={styles.imageButton}
                onPress={pickMessageImage}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <Ionicons name="image-outline" size={24} color="#3B82F6" />
                )}
              </TouchableOpacity>
              <TextInput
                style={styles.messageInput}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type a message..."
                placeholderTextColor="#9CA3AF"
                multiline
                maxLength={1000}
              />
              <TouchableOpacity
                style={[styles.sendButton, (!newMessage.trim() && !messageImage) && styles.sendButtonDisabled]}
                onPress={handleSendMessage}
                disabled={sendingMessage || (!newMessage.trim() && !messageImage)}
              >
                {sendingMessage ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Forum Info Modal */}
      <Modal
        visible={showForumInfo}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowForumInfo(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.forumInfoModal}>
            <View style={styles.forumInfoModalHeader}>
              <Text style={styles.forumInfoModalTitle}>Forum Information</Text>
              <TouchableOpacity onPress={() => setShowForumInfo(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.forumInfoModalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.forumInfoImageContainer}>
                {forum.profilePicture ? (
                  <Image source={{ uri: forum.profilePicture }} style={styles.forumInfoImage} />
                ) : (
                  <View style={styles.forumInfoImagePlaceholder}>
                    <Ionicons name="trophy" size={60} color="#3B82F6" />
                  </View>
                )}
              </View>

              <Text style={styles.forumInfoName}>{forum.name}</Text>

              {forum.description && (
                <View style={styles.forumInfoDescriptionContainer}>
                  <Text style={styles.forumInfoDescriptionLabel}>Description</Text>
                  <Text style={styles.forumInfoDescription}>{forum.description}</Text>
                </View>
              )}

              <View style={styles.forumInfoStats}>
                <View style={styles.forumInfoStatItem}>
                  <Ionicons name="people" size={24} color="#00A884" />
                  <Text style={styles.forumInfoStatValue}>{forum.memberCount || 0}</Text>
                  <Text style={styles.forumInfoStatLabel}>Members</Text>
                </View>
                {forum.headUserId && (
                  <View style={styles.forumInfoStatItem}>
                    <Ionicons name="person" size={24} color="#3B82F6" />
                    <Text style={styles.forumInfoStatValue} numberOfLines={1}>
                      {forum.headUserId.username || 'Forum Head'}
                    </Text>
                    <Text style={styles.forumInfoStatLabel}>Head</Text>
                  </View>
                )}
              </View>

              {forum.createdAt && (
                <View style={styles.forumInfoMeta}>
                  <Ionicons name="calendar-outline" size={16} color="#8696A0" />
                  <Text style={styles.forumInfoMetaText}>
                    Created {new Date(forum.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B141A',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  whatsappHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202C33',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3942',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerBackButton: {
    padding: 8,
    marginRight: 8,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8696A0',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionButton: {
    padding: 8,
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
  loadingOverlay: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 10,
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
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyChatText: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#8696A0',
    marginTop: 15,
  },
  emptyChatSubtext: {
    fontSize: 14,
    color: '#8696A0',
    marginTop: 5,
    textAlign: 'center',
  },
  chatList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  chatBubble: {
    marginBottom: 12,
  },
  bubbleContents: {
     backgroundColor: '#202C33',
    borderRadius: 8,
    padding: 12,
    // alignSelf: 'flex-start',
  },
  bubbleContent: {
    backgroundColor: '#202C33',
    borderRadius: 8,
    padding: 12,
    maxWidth: '92%',
    alignSelf: 'flex-start',
  },
  bubbleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  bubbleSenderName: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: '#00A884',
    marginRight: 8,
  },
  bubbleTime: {
    fontSize: 11,
    color: '#8696A0',
  },
  messageBubbleText: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: '#E9EDEF',
    lineHeight: 20,
  },
  messageBubbleImage: {
    width: '100%',
    maxHeight: 250,
    borderRadius: 6,
    marginBottom: 8,
    backgroundColor: '#374151',
  },
  // Prediction bubble styles
  predictionBubbleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  predictionBubbleBody: {
    gap: 8,
  },
  predictionTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  predictionTeamSmall: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  smallTeamLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  smallTeamLogoPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallTeamLogoText: {
    fontSize: 14,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
  },
  smallTeamName: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    color: '#E9EDEF',
    textAlign: 'center',
  },
  predictionVs: {
    fontSize: 11,
    color: '#8696A0',
    marginHorizontal: 8,
  },
  predictionScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  predictionScore: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: '#E9EDEF',
  },
  actualScore: {
    fontSize: 14,
    fontFamily: fonts.body,
  },
  correctScore: {
    color: '#00D9FF',
  },
  incorrectScore: {
    color: '#FF6B6B',
  },
  predictionLeague: {
    fontSize: 12,
    color: '#8696A0',
    fontStyle: 'italic',
  },
  predictionBubbleFooter: {
    marginTop: 4,
  },
  predictionStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadge: {
    backgroundColor: '#F59E0B30',
  },
  correctBadge: {
    backgroundColor: '#10B98130',
  },
  incorrectBadge: {
    backgroundColor: '#EF444430',
  },
  predictionStatusText: {
    fontSize: 11,
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
  messageFormContainer: {
    backgroundColor: '#202C33',
    borderTopWidth: 1,
    borderTopColor: '#2A3942',
    paddingHorizontal: 8,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 25 : 8,
  },
  messageImagePreview: {
    position: 'relative',
    marginBottom: 8,
    marginHorizontal: 8,
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
  },
  messageInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 4,
  },
  imageButton: {
    padding: 8,
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#2A3942',
    borderRadius: 21,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: fonts.body,
    color: '#E9EDEF',
    maxHeight: 100,
    borderWidth: 0,
  },
  sendButton: {
    backgroundColor: '#00A884',
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#2A3942',
    opacity: 0.5,
  },
  headerAvatarContainer: {
    marginRight: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  forumInfoModal: {
    backgroundColor: '#0B141A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  forumInfoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3942',
  },
  forumInfoModalTitle: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
  },
  forumInfoModalContent: {
    padding: 20,
  },
  forumInfoImageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  forumInfoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#374151',
  },
  forumInfoImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  forumInfoName: {
    fontSize: 24,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  forumInfoDescriptionContainer: {
    marginBottom: 25,
    padding: 15,
    backgroundColor: '#202C33',
    borderRadius: 12,
  },
  forumInfoDescriptionLabel: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: '#8696A0',
    marginBottom: 8,
  },
  forumInfoDescription: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: '#E9EDEF',
    lineHeight: 22,
  },
  forumInfoStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 25,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#2A3942',
  },
  forumInfoStatItem: {
    alignItems: 'center',
    gap: 8,
  },
  forumInfoStatValue: {
    fontSize: 20,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
    maxWidth: 120,
  },
  forumInfoStatLabel: {
    fontSize: 12,
    color: '#8696A0',
    fontFamily: fonts.body,
  },
  forumInfoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 15,
  },
  forumInfoMetaText: {
    fontSize: 13,
    color: '#8696A0',
    fontFamily: fonts.body,
  },
});

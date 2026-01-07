import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts } from '@/utils/typography';

export default function GOATCompetitionScreen() {
  const [messiVotes, setMessiVotes] = useState(65);
  const [ronaldoVotes, setRonaldoVotes] = useState(35);
  const [hasVoted, setHasVoted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [comments, setComments] = useState([
    { id: 1, user: 'FootballFan23', text: 'Messi is the GOAT! His dribbling is unmatched', time: '2h ago', replies: [] },
    { id: 2, user: 'CR7Forever', text: 'Ronaldo has more goals and better work ethic', time: '1h ago', replies: [] },
    { id: 3, user: 'SoccerExpert', text: 'Both are legends, but Messi has better technical skills', time: '30m ago', replies: [] },
  ]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  const handleVote = async (player: 'messi' | 'ronaldo') => {
    if (hasVoted) {
      Alert.alert('Already Voted', 'You have already voted in this competition!');
      return;
    }

    setIsLoading(true);
    setShowAnimation(true);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (player === 'messi') {
      setMessiVotes(prev => prev + 1);
      setRonaldoVotes(prev => prev - 1);
    } else {
      setRonaldoVotes(prev => prev + 1);
      setMessiVotes(prev => prev - 1);
    }
    
    setHasVoted(true);
    setIsLoading(false);
    
    // Show success animation
    setTimeout(() => {
      setShowAnimation(false);
      Alert.alert(
        'Vote Cast! 🎉', 
        `You voted for ${player === 'messi' ? 'Lionel Messi' : 'Cristiano Ronaldo'}! Your vote has been recorded.`,
        [{ text: 'OK', style: 'default' }]
      );
    }, 500);
  };

  const messiStats = [
    { label: 'Goals', value: '821' },
    { label: 'Assists', value: '361' },
    { label: 'Titles', value: '44' },
    { label: 'Ballon d\'Or', value: '8' },
  ];

  const ronaldoStats = [
    { label: 'Goals', value: '873' },
    { label: 'Assists', value: '268' },
    { label: 'Titles', value: '35' },
    { label: 'Ballon d\'Or', value: '5' },
  ];

  const handleReply = (commentId) => {
    setReplyingTo(commentId);
    setReplyText('');
  };

  const submitReply = () => {
    if (replyText.trim()) {
      const reply = {
        id: Date.now(),
        user: 'You',
        text: replyText.trim(),
        time: 'now'
      };
      
      setComments(comments.map(comment => 
        comment.id === replyingTo 
          ? { ...comment, replies: [...comment.replies, reply] }
          : comment
      ));
      
      setReplyText('');
      setReplyingTo(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

        {/* Competition Title */}
        <View style={styles.titleSection}>
          <Text style={styles.competitionTitle}>Who is the GOAT?</Text>
          <Text style={styles.competitionSubtitle}>Lionel Messi vs Cristiano Ronaldo</Text>
        </View>

        {/* Current Results */}
        <View style={styles.resultsSection}>
          <Text style={styles.resultsTitle}>Current Results</Text>
          <View style={styles.resultsContainer}>
            <View style={styles.resultItem}>
              <Text style={styles.resultName}>Messi</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, styles.messiProgress, { width: `${messiVotes}%` }]} />
              </View>
              <Text style={styles.resultPercentage}>{messiVotes}%</Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultName}>Ronaldo</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, styles.ronaldoProgress, { width: `${ronaldoVotes}%` }]} />
              </View>
              <Text style={styles.resultPercentage}>{ronaldoVotes}%</Text>
            </View>
          </View>
        </View>

        {/* Players Section */}
        <View style={styles.playersSection}>
          {/* Messi */}
          <View style={styles.playerContainer}>
            <TouchableOpacity 
              style={[styles.playerCard, styles.messiCard]}
              onPress={() => handleVote('messi')}
              disabled={hasVoted}
            >
              <Image 
                source={{ uri: 'https://img.a.transfermarkt.technology/portrait/header/28003-1671435885.jpg?lm=1' }}
                style={styles.playerImage}
              />
            </TouchableOpacity>
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>Lionel Messi</Text>
              <Text style={styles.playerTeam}>Inter Miami</Text>
              <View style={styles.statsContainer}>
                {messiStats.map((stat, index) => (
                  <View key={index} style={styles.statItem}>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity 
                style={[
                  styles.voteButton, 
                  hasVoted && styles.disabledButton,
                  isLoading && styles.loadingButton,
                  showAnimation && styles.animateButton
                ]}
                disabled={hasVoted || isLoading}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.voteButtonText}>Voting...</Text>
                  </View>
                ) : (
                  <Text style={styles.voteButtonText}>
                    {hasVoted ? 'Voted ✓' : 'Vote for Messi'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* VS */}
          <View style={styles.vsContainer}>
            <Text style={styles.vsText}>VS</Text>
          </View>

          {/* Ronaldo */}
          <View style={styles.playerContainer}>
            <TouchableOpacity 
              style={[styles.playerCard, styles.ronaldoCard]}
              onPress={() => handleVote('ronaldo')}
              disabled={hasVoted}
            >
              <Image 
                source={{ uri: 'https://sportune.20minutes.fr/wp-content/uploads/2023/07/Cristiano-Ronaldo.jpg' }}
                style={styles.playerImage}
              />
            </TouchableOpacity>
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>Cristiano Ronaldo</Text>
              <Text style={styles.playerTeam}>Al Nassr</Text>
              <View style={styles.statsContainer}>
                {ronaldoStats.map((stat, index) => (
                  <View key={index} style={styles.statItem}>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity 
                style={[
                  styles.voteButton, 
                  hasVoted && styles.disabledButton,
                  isLoading && styles.loadingButton,
                  showAnimation && styles.animateButton
                ]}
                disabled={hasVoted || isLoading}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.voteButtonText}>Voting...</Text>
                  </View>
                ) : (
                  <Text style={styles.voteButtonText}>
                    {hasVoted ? 'Voted ✓' : 'Vote for Ronaldo'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>


        {/* Share Button */}
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={() => Alert.alert('Share', 'Competition shared successfully!')}
        >
          <Ionicons name="share-outline" size={20} color="#FFFFFF" />
          <Text style={styles.shareButtonText}>Share Competition</Text>
        </TouchableOpacity>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>Comments</Text>
          
          {/* Add Comment */}
          <View style={styles.addCommentContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              placeholderTextColor="#9CA3AF"
              value={newComment}
              onChangeText={setNewComment}
              multiline
            />
            <TouchableOpacity 
              style={styles.addCommentButton}
              onPress={() => {
                if (newComment.trim()) {
                  const comment = {
                    id: comments.length + 1,
                    user: 'You',
                    text: newComment.trim(),
                    time: 'now',
                    replies: []
                  };
                  setComments([comment, ...comments]);
                  setNewComment('');
                }
              }}
            >
              <Text style={styles.addCommentButtonText}>Post</Text>
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          {comments.map((comment) => (
            <View key={comment.id} style={styles.commentItem}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentUser}>{comment.user}</Text>
                <Text style={styles.commentTime}>{comment.time}</Text>
              </View>
              <Text style={styles.commentText}>{comment.text}</Text>
              
              {/* Reply Button */}
              <TouchableOpacity 
                style={styles.replyButton}
                onPress={() => handleReply(comment.id)}
              >
                <Text style={styles.replyButtonText}>Reply</Text>
              </TouchableOpacity>

              {/* Replies */}
              {comment.replies && comment.replies.map((reply) => (
                <View key={reply.id} style={styles.replyItem}>
                  <View style={styles.replyHeader}>
                    <Text style={styles.replyUser}>{reply.user}</Text>
                    <Text style={styles.replyTime}>{reply.time}</Text>
                  </View>
                  <Text style={styles.replyText}>{reply.text}</Text>
                </View>
              ))}

              {/* Reply Input */}
              {replyingTo === comment.id && (
                <View style={styles.replyInputContainer}>
                  <TextInput
                    style={styles.replyInput}
                    placeholder="Write a reply..."
                    placeholderTextColor="#9CA3AF"
                    value={replyText}
                    onChangeText={setReplyText}
                    multiline
                  />
                  <View style={styles.replyActions}>
                    <TouchableOpacity 
                      style={styles.cancelReplyButton}
                      onPress={() => setReplyingTo(null)}
                    >
                      <Text style={styles.cancelReplyText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.submitReplyButton}
                      onPress={submitReply}
                    >
                      <Text style={styles.submitReplyText}>Reply</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A202C',
  },
  scrollView: {
    flex: 1,
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
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  placeholder: {
    width: 34,
  },
  titleSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  competitionTitle: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  competitionSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  playersSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  playerContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  playerCard: {
    width: 60,
    height: 60,
    backgroundColor: '#2D3748',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  playerInfo: {
    alignItems: 'center',
    width: '100%',
  },
  messiCard: {
    borderColor: '#3B82F6',
    borderWidth: 2,
  },
  ronaldoCard: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  playerName: {
    fontSize: 18,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  playerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  playerTeam: {
    fontSize: 10,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: '#3B82F6',
  },
  statLabel: {
    fontSize: 8,
    color: '#9CA3AF',
  },
  voteButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#4A5568',
  },
  voteButtonText: {
    fontSize: 10,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  vsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  vsText: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  resultsSection: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  resultsTitle: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  resultsContainer: {
    backgroundColor: '#2D3748',
    borderRadius: 8,
    padding: 10,
  },
  resultItem: {
    marginBottom: 8,
  },
  resultName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#4A5568',
    borderRadius: 3,
    marginBottom: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  messiProgress: {
    backgroundColor: '#3B82F6',
  },
  ronaldoProgress: {
    backgroundColor: '#EF4444',
  },
  resultPercentage: {
    fontSize: 10,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    textAlign: 'right',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 30,
  },
  shareButtonText: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  loadingButton: {
    backgroundColor: '#4A5568',
    opacity: 0.7,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  animateButton: {
    transform: [{ scale: 1.05 }],
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  commentsSection: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  commentsTitle: {
    fontSize: 18,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginBottom: 15,
  },
  addCommentContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#2D3748',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: '#FFFFFF',
    marginRight: 10,
    maxHeight: 80,
  },
  addCommentButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addCommentButtonText: {
    color: '#FFFFFF',
    fontFamily: fonts.bodySemiBold,
  },
  commentItem: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  replyButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  replyButtonText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  replyItem: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginLeft: 20,
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  replyUser: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: '#3B82F6',
  },
  replyTime: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  replyText: {
    fontSize: 12,
    color: '#FFFFFF',
    lineHeight: 16,
  },
  replyInputContainer: {
    marginTop: 8,
    marginLeft: 20,
  },
  replyInput: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    maxHeight: 100,
    marginBottom: 8,
  },
  replyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelReplyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelReplyText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  submitReplyButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  submitReplyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
});

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts } from '@/utils/typography';

export default function PredictionForumsScreen() {
  const [selectedForum, setSelectedForum] = useState(null);

  const forums = [
    {
      id: 1,
      name: 'Premier League Experts',
      description: 'Connect with top Premier League analysts and get exclusive insights',
      members: 1250,
      price: 9.99,
      features: ['Live match analysis', 'Pre-match predictions', 'Expert Q&A'],
      icon: '🏆',
      color: '#FFD700'
    },
    {
      id: 2,
      name: 'Champions League Elite',
      description: 'Premium forum for Champions League predictions and analysis',
      members: 890,
      price: 14.99,
      features: ['Knockout stage analysis', 'Tactical breakdowns', 'Player performance insights'],
      icon: '⭐',
      color: '#3B82F6'
    },
    {
      id: 3,
      name: 'Local Leagues Pro',
      description: 'Specialized forum for local and regional league predictions',
      members: 650,
      price: 7.99,
      features: ['Local expert insights', 'Regional analysis', 'Grassroots predictions'],
      icon: '🏟️',
      color: '#10B981'
    },
    {
      id: 4,
      name: 'World Cup Legends',
      description: 'Exclusive forum for major tournament predictions and analysis',
      members: 2100,
      price: 19.99,
      features: ['Tournament predictions', 'Team analysis', 'Historical insights'],
      icon: '🌍',
      color: '#EF4444'
    },
    {
      id: 5,
      name: 'Tactics & Strategy',
      description: 'Deep dive into football tactics and strategic analysis',
      members: 750,
      price: 12.99,
      features: ['Formation analysis', 'Tactical discussions', 'Coach insights'],
      icon: '📊',
      color: '#8B5CF6'
    }
  ];

  const handleJoinForum = (forum) => {
    Alert.alert(
      'Join Forum',
      `Join ${forum.name} for $${forum.price}/month?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Pay & Join',
          style: 'default',
          onPress: () => {
            // Simulate payment process
            Alert.alert(
              'Payment Required',
              'Redirecting to payment gateway...',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    // Here you would integrate with a payment service
                    Alert.alert('Success!', `Welcome to ${forum.name}!`);
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
   
        <Text style={styles.headerTitle}>Prediction Forums</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>Join Expert Prediction Forums</Text>
          <Text style={styles.introDescription}>
            Connect with top football analysts, get exclusive insights, and improve your prediction accuracy
          </Text>
        </View>

        {forums.map((forum) => (
          <TouchableOpacity
            key={forum.id}
            style={[styles.forumCard, { borderColor: forum.color }]}
            onPress={() => setSelectedForum(selectedForum === forum.id ? null : forum.id)}
          >
            <View style={styles.forumHeader}>
              <View style={styles.forumIconContainer}>
                <Text style={styles.forumIcon}>{forum.icon}</Text>
              </View>
              <View style={styles.forumInfo}>
                <Text style={styles.forumName}>{forum.name}</Text>
                <Text style={styles.forumDescription}>{forum.description}</Text>
                <View style={styles.forumStats}>
                  <Text style={styles.memberCount}>{forum.members} members</Text>
                  <Text style={styles.forumPrice}>${forum.price}/month</Text>
                </View>
              </View>
              <View style={styles.expandIcon}>
                <Ionicons 
                  name={selectedForum === forum.id ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#9CA3AF" 
                />
              </View>
            </View>

            {selectedForum === forum.id && (
              <View style={styles.forumDetails}>
                <Text style={styles.featuresTitle}>Features:</Text>
                {forum.features.map((feature, index) => (
                  <Text key={index} style={styles.featureItem}>• {feature}</Text>
                ))}
                <TouchableOpacity
                  style={[styles.joinButton, { backgroundColor: forum.color }]}
                  onPress={() => handleJoinForum(forum)}
                >
                  <Text style={styles.joinButtonText}>Join Forum</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            All forums include 7-day free trial. Cancel anytime.
          </Text>
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
    fontSize: 20,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  introSection: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  introTitle: {
    fontSize: 24,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  introDescription: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
  },
  forumCard: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 2,
    overflow: 'hidden',
  },
  forumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  forumIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  forumIcon: {
    fontSize: 24,
  },
  forumInfo: {
    flex: 1,
  },
  forumName: {
    fontSize: 18,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginBottom: 5,
  },
  forumDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
    lineHeight: 20,
  },
  forumStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberCount: {
    fontSize: 12,
    color: '#3B82F6',
  },
  forumPrice: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#10B981',
  },
  expandIcon: {
    padding: 5,
  },
  forumDetails: {
    padding: 15,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#4A5568',
  },
  featuresTitle: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginBottom: 10,
  },
  featureItem: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 5,
  },
  joinButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  joinButtonText: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

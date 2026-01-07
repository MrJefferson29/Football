import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { fonts } from '@/utils/typography';
import * as ImagePicker from 'expo-image-picker';
import { uploadAPI } from '@/utils/api';

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState('profile');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { user, logout, updateProfile } = useAuth();

  const rewards = [
    { id: 1, title: 'Prediction Master', description: 'Make 100 correct predictions', icon: '🏆', unlocked: true, progress: 100 },
    { id: 2, title: 'Streak King', description: 'Maintain a 10-day prediction streak', icon: '🔥', unlocked: false, progress: 80 },
    { id: 3, title: 'Accuracy Expert', description: 'Achieve 85% prediction accuracy', icon: '🎯', unlocked: false, progress: 78 },
    { id: 4, title: 'Community Star', description: 'Get 50 likes on your predictions', icon: '⭐', unlocked: false, progress: 35 },
    { id: 5, title: 'Early Bird', description: 'Make predictions 24 hours before matches', icon: '🐦', unlocked: true, progress: 100 },
  ];

  const points = user?.points ?? 0;
  const accuracy = user?.accuracy ?? 0;
  const rank = user?.rank || 'Bronze';
  const totalPredictions = user?.totalPredictions ?? 0;
  const correctPredictions = user?.correctPredictions ?? 0;
  const referrals = user?.referrals ?? 0;
  const referralCode = user?.referralCode || '';
  const referralLink = referralCode ? `https://fanarena.app/register?ref=${referralCode}` : '—';
  const streak = 0; // not tracked yet

  const handleChangePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo access to change your avatar.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0]) return;

      setUploadingAvatar(true);
      const uploadRes = await uploadAPI.uploadImage(result.assets[0].uri, 'avatars');
      if (uploadRes.success && uploadRes.data?.url) {
        await updateProfile({ avatar: uploadRes.data.url });
        Alert.alert('Success', 'Profile photo updated.');
      } else {
        throw new Error(uploadRes.message || 'Failed to upload image');
      }
    } catch (error: any) {
      console.error('Avatar update error:', error);
      Alert.alert('Error', error.message || 'Failed to update photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
      
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Marquee / highlights */}
      <View style={styles.marqueeContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.marqueeContent}
        >
          <Text style={styles.marqueeText}>Earn points from correct score predictions • </Text>
          <Text style={styles.marqueeText}>Share your referral link to get bonus points • </Text>
          <Text style={styles.marqueeText}>Climb ranks: Bronze → Rookie → Intermediate → Pro → Legend • </Text>
        </ScrollView>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Info */}
        <View style={styles.profileSection}>
          <Image
            source={{
              uri: user?.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
            }}
            style={styles.profileAvatar}
          />
          <TouchableOpacity
            style={styles.changePhotoButton}
            onPress={handleChangePhoto}
            disabled={uploadingAvatar}
          >
            {uploadingAvatar ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.changePhotoText}>Change Photo</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.profileName}>{user?.username || 'User'}</Text>
          <Text style={styles.profileEmail}>{user?.email || ''}</Text>
          {user?.country && (
            <Text style={styles.profileMeta}>{user.country}</Text>
          )}
          {user?.age != null && (
            <Text style={styles.profileMeta}>{user.age} years old</Text>
          )}
          <View style={styles.levelBadge}>
          <Text style={styles.levelText}>{rank} Tier</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
          <Text style={styles.statValue}>{points}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statCard}>
          <Text style={styles.statValue}>{accuracy}%</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
          <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalPredictions}</Text>
          <Text style={styles.statLabel}>Predictions</Text>
          </View>
          <View style={styles.statCard}>
          <Text style={styles.statValue}>{correctPredictions}</Text>
          <Text style={styles.statLabel}>Correct Picks</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{referrals}</Text>
          <Text style={styles.statLabel}>Referrals</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{streak || '—'}</Text>
          <Text style={styles.statLabel}>Streak</Text>
          </View>
        </View>

      {/* Referral */}
      <View style={styles.referralCard}>
        <View style={styles.referralHeader}>
          <Ionicons name="gift-outline" size={22} color="#3B82F6" />
          <Text style={styles.referralTitle}>Your Referral Link</Text>
        </View>
        <Text style={styles.referralCode}>
          {referralCode ? `Code: ${referralCode}` : 'No referral code yet'}
        </Text>
        <Text style={styles.referralLink}>
          {referralLink}
        </Text>
        <Text style={styles.referralHint}>
          Share this link or code to earn points when friends join.
        </Text>
      </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            Alert.alert(
              'Logout',
              'Are you sure you want to logout?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Logout',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await logout();
                    } catch (error) {
                      Alert.alert('Error', 'Failed to logout');
                    }
                  },
                },
              ]
            );
          }}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
            onPress={() => setActiveTab('profile')}
          >
            <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>
              Profile
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'rewards' && styles.activeTab]}
            onPress={() => setActiveTab('rewards')}
          >
            <Text style={[styles.tabText, activeTab === 'rewards' && styles.activeTabText]}>
              Rewards
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'profile' ? (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons name="time-outline" size={20} color="#9CA3AF" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>Activity tracking coming soon</Text>
                <Text style={styles.activityTime}>We’ll show your latest wins here.</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Achievements & Rewards</Text>
            {rewards.map((reward) => (
              <View key={reward.id} style={styles.rewardCard}>
                <View style={styles.rewardIcon}>
                  <Text style={styles.rewardEmoji}>{reward.icon}</Text>
                </View>
                <View style={styles.rewardContent}>
                  <Text style={styles.rewardTitle}>{reward.title}</Text>
                  <Text style={styles.rewardDescription}>{reward.description}</Text>
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { width: `${reward.progress}%` }
                        ]} 
                      />
                    </View>
                    <Text style={styles.progressText}>{reward.progress}%</Text>
                  </View>
                </View>
                <View style={styles.rewardStatus}>
                  {reward.unlocked ? (
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  ) : (
                    <Ionicons name="lock-closed" size={24} color="#6B7280" />
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
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
    fontFamily: fonts.heading,
    color: '#FFFFFF',
  },
  placeholder: {
    width: 34,
  },
  marqueeContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#2D3748',
  },
  marqueeContent: {
    flexDirection: 'row',
  },
  marqueeText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontFamily: fonts.body,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  changePhotoButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
  },
  changePhotoText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
  },
  profileName: {
    fontSize: 24,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
    marginBottom: 5,
  },
  profileEmail: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  profileMeta: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  levelBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  levelText: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    width: '48%',
    marginBottom: 10,
    marginRight: '2%',
  },
  statValue: {
    fontSize: 24,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#9CA3AF',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#2D3748',
    borderRadius: 12,
    marginBottom: 20,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontSize: 16,
    fontFamily: fonts.bodyMedium,
    color: '#9CA3AF',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  tabContent: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
    marginBottom: 15,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  activityIcon: {
    marginRight: 15,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 16,
    fontFamily: fonts.bodyMedium,
    color: '#FFFFFF',
    marginBottom: 5,
  },
  activityTime: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#9CA3AF',
  },
  activityPoints: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#10B981',
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  rewardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  rewardEmoji: {
    fontSize: 24,
  },
  rewardContent: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginBottom: 5,
  },
  rewardDescription: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    marginBottom: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    marginRight: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#9CA3AF',
  },
  rewardStatus: {
    marginLeft: 10,
  },
  referralCard: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  referralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  referralTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  referralCode: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  referralLink: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  referralHint: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#9CA3AF',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    marginLeft: 10,
  },
});

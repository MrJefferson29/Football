import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { pollsAPI } from '@/utils/api';
import { getDirectImageUrl } from '@/utils/imageUtils';
import { fonts } from '@/utils/typography';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

export default function ClubBattleStatsScreen() {
  const [activeTab, setActiveTab] = useState('overview');
  const [poll, setPoll] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const viewShotRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    fetchClubBattlePoll();
  }, []);

  const fetchClubBattlePoll = async () => {
    try {
      setLoading(true);
      const response = await pollsAPI.getPollByType('club-battle');
      if (response.success && response.data) {
        setPoll(response.data);
      } else {
        Alert.alert('Error', 'Failed to load statistics, refresh the app');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load statistics, refresh the app');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics from poll data
  const totalVotes = poll ? (poll.option1?.votes || 0) + (poll.option2?.votes || 0) : 0;
  const option1Percentage = poll && totalVotes > 0 
    ? Math.round(((poll.option1?.votes || 0) / totalVotes) * 100) 
    : 50;
  const option2Percentage = poll && totalVotes > 0 
    ? Math.round(((poll.option2?.votes || 0) / totalVotes) * 100) 
    : 50;
  const voteDifference = Math.abs((poll?.option1?.votes || 0) - (poll?.option2?.votes || 0));

  // Get statistics from poll
  const countryBreakdown = poll?.statistics?.countryBreakdown || [];
  const ageGroupBreakdown = poll?.statistics?.ageGroupBreakdown || [];

  const handleShare = async () => {
    if (!viewShotRef.current) {
      Alert.alert('Error', 'Unable to capture screenshot');
      return;
    }

    try {
      setIsCapturing(true);
      const uri = await captureRef(viewShotRef.current, {
        format: 'png',
        quality: 0.9,
        result: 'tmpfile',
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share Statistics',
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share statistics. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gamefy Poll</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading statistics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!poll) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gamefy Poll</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>No {poll.question} poll found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }} style={styles.viewShot}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gamefy Poll</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'demographics' && styles.activeTab]}
            onPress={() => setActiveTab('demographics')}
          >
            <Text style={[styles.tabText, activeTab === 'demographics' && styles.activeTabText]}>Demographics</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'engagement' && styles.activeTab]}
            onPress={() => setActiveTab('engagement')}
          >
            <Text style={[styles.tabText, activeTab === 'engagement' && styles.activeTabText]}>Engagement</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'overview' && (
          <>
            {/* Club Comparison */}
            <View style={styles.clubsSection}>
              <View style={styles.club}>
                <Image 
                  source={{ uri: getDirectImageUrl(poll.option1?.image) || 'https://via.placeholder.com/80' }}
                  style={styles.clubLogo}
                  onError={(e) => {
                    console.log('Image load error:', poll.option1?.image);
                  }}
                />
                <Text style={styles.clubName}>{poll.option1?.name || 'Option 1'}</Text>
                <Text style={styles.clubVotes}>{(poll.option1?.votes || 0).toLocaleString()} votes</Text>
              </View>
              
              <Text style={styles.vsText}>VS</Text>
              
              <View style={styles.club}>
                <Image 
                  source={{ uri: getDirectImageUrl(poll.option2?.image) || 'https://via.placeholder.com/80' }}
                  style={styles.clubLogo}
                  onError={(e) => {
                    console.log('Image load error:', poll.option2?.image);
                  }}
                />
                <Text style={styles.clubName}>{poll.option2?.name || 'Option 2'}</Text>
                <Text style={styles.clubVotes}>{(poll.option2?.votes || 0).toLocaleString()} votes</Text>
              </View>
            </View>

            {/* Overall Percentage */}
            <View style={styles.percentageSection}>
              <View style={styles.percentageBar}>
                <View style={[styles.percentageSegment, { backgroundColor: '#3B82F6', width: `${option1Percentage}%` }]}>
                  <Text style={styles.percentageText}>{option1Percentage}%</Text>
                </View>
                <View style={[styles.percentageSegment, { backgroundColor: '#EF4444', width: `${option2Percentage}%` }]}>
                  <Text style={styles.percentageText}>{option2Percentage}%</Text>
                </View>
              </View>
            </View>

            {/* Quick Stats */}
            <View style={styles.quickStatsSection}>
              <Text style={styles.sectionTitle}>Quick Stats</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{totalVotes.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Total Votes</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{option1Percentage}%</Text>
                  <Text style={styles.statLabel}>{poll.option1?.name || 'Option 1'} Lead</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{voteDifference.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Vote Difference</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{poll.isActive ? 'Active' : 'Ended'}</Text>
                  <Text style={styles.statLabel}>Status</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {activeTab === 'demographics' && (
          <>
            {/* Country Breakdown */}
            {countryBreakdown.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Country Breakdown</Text>
                {countryBreakdown.map((country: any, index: number) => (
                  <View key={index} style={styles.countryItem}>
                    <Text style={styles.countryName}>{country.country}</Text>
                    <View style={styles.countryBars}>
                      <View style={styles.countryBarContainer}>
                        <View style={[styles.countryBar, { backgroundColor: '#3B82F6', width: `${country.percentage || 0}%` }]} />
                        <Text style={styles.countryPercentage}>{country.percentage || 0}%</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Country Breakdown</Text>
                <Text style={styles.emptyText}>No country breakdown data available</Text>
              </View>
            )}

            {/* Age Group Breakdown */}
            {ageGroupBreakdown.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Age Group Breakdown</Text>
                {ageGroupBreakdown.map((ageGroup: any, index: number) => (
                  <View key={index} style={styles.ageItem}>
                    <Text style={styles.ageText}>{ageGroup.ageGroup}</Text>
                    <View style={styles.ageBars}>
                      <View style={styles.ageBarContainer}>
                        <View style={[styles.ageBar, { backgroundColor: ageGroup.color || '#3B82F6', width: `${ageGroup.percentage || 0}%` }]} />
                        <Text style={styles.agePercentage}>{ageGroup.percentage || 0}%</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Age Group Breakdown</Text>
                <Text style={styles.emptyText}>No age group breakdown data available</Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'engagement' && (
          <>
            {/* Poll Question */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Poll Question</Text>
              <View style={styles.questionCard}>
                <Text style={styles.questionText}>{poll.question}</Text>
              </View>
            </View>

            {/* Vote Statistics */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vote Statistics</Text>
              <View style={styles.engagementItem}>
                <Text style={styles.metricName}>Total Votes Cast</Text>
                <View style={styles.metricValues}>
                  <View style={styles.metricValue}>
                    <Text style={styles.metricLabel}>{poll.option1?.name || 'Option 1'}</Text>
                    <Text style={styles.metricNumber}>{(poll.option1?.votes || 0).toLocaleString()}</Text>
                  </View>
                  <View style={styles.metricValue}>
                    <Text style={styles.metricLabel}>{poll.option2?.name || 'Option 2'}</Text>
                    <Text style={styles.metricNumber}>{(poll.option2?.votes || 0).toLocaleString()}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.engagementItem}>
                <Text style={styles.metricName}>Vote Percentages</Text>
                <View style={styles.metricValues}>
                  <View style={styles.metricValue}>
                    <Text style={styles.metricLabel}>{poll.option1?.name || 'Option 1'}</Text>
                    <Text style={styles.metricNumber}>{option1Percentage}%</Text>
                  </View>
                  <View style={styles.metricValue}>
                    <Text style={styles.metricLabel}>{poll.option2?.name || 'Option 2'}</Text>
                    <Text style={styles.metricNumber}>{option2Percentage}%</Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Share Button */}
        <TouchableOpacity 
          style={styles.shareButton} 
          onPress={handleShare}
          disabled={isCapturing || loading}
        >
          {isCapturing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.shareButtonText}>Share Results</Text>
          )}
        </TouchableOpacity>
        </ScrollView>
      </ViewShot>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A202C',
  },
  viewShot: {
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
  shareButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    marginHorizontal: 20,
  },
  shareButtonText: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontSize: 10,
    fontFamily: fonts.bodyMedium,
    color: '#9CA3AF',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  clubsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  club: {
    alignItems: 'center',
    flex: 1,
  },
  clubLogo: {
    width: 80,
    height: 80,
    marginBottom: 10,
    borderRadius: 40,
  },
  clubName: {
    fontSize: 18,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginBottom: 5,
  },
  clubVotes: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#9CA3AF',
  },
  vsText: {
    fontSize: 24,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginHorizontal: 20,
  },
  percentageSection: {
    marginBottom: 30,
  },
  percentageBar: {
    height: 40,
    flexDirection: 'row',
    borderRadius: 20,
    overflow: 'hidden',
  },
  percentageSegment: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
    marginBottom: 15,
  },
  quickStatsSection: {
    marginBottom: 30,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: fonts.bodySemiBold,
    color: '#3B82F6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  countryItem: {
    marginBottom: 15,
  },
  countryName: {
    fontSize: 16,
    fontFamily: fonts.bodyMedium,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  countryBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  countryBarContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  countryBar: {
    height: 20,
    borderRadius: 10,
    marginBottom: 5,
  },
  countryPercentage: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  ageItem: {
    marginBottom: 15,
  },
  ageText: {
    fontSize: 16,
    fontFamily: fonts.bodyMedium,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  ageBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ageBarContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  ageBar: {
    height: 20,
    borderRadius: 10,
    marginBottom: 5,
  },
  agePercentage: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  engagementItem: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  metricName: {
    fontSize: 16,
    fontFamily: fonts.bodyMedium,
    color: '#FFFFFF',
    marginBottom: 10,
  },
  metricValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricValue: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  metricNumber: {
    fontSize: 18,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  historicalCard: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 20,
  },
  historicalTitle: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginBottom: 15,
  },
  historicalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  historicalStat: {
    alignItems: 'center',
  },
  historicalLabel: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    marginBottom: 5,
  },
  historicalValue: {
    fontSize: 24,
    fontFamily: fonts.bodySemiBold,
    color: '#3B82F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontFamily: fonts.body,
    color: '#FFFFFF',
    fontSize: 16,
  },
  emptyText: {
    fontFamily: fonts.body,
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
  },
  questionCard: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 20,
  },
  questionText: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

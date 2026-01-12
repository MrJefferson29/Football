import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { pollsAPI } from '@/utils/api';
import { getDirectImageUrl } from '@/utils/imageUtils';
import { fonts } from '@/utils/typography';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

export default function PollResultsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('overview');
  const [poll, setPoll] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const viewShotRef = useRef<ViewShot>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    fetchPollResults();
  }, [id]);

  const fetchPollResults = async () => {
    if (!id) {
      Alert.alert('Error', 'Poll ID is missing');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await pollsAPI.getPollResults(id);
      if (response.success && response.data) {
        setPoll(response.data);
      } else {
        Alert.alert('Error', 'Failed to load poll results');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load poll results');
    } finally {
      setLoading(false);
    }
  };

  // Get statistics with defaults
  const countryBreakdown = poll?.statistics?.countryBreakdown || [];
  const ageGroupBreakdown = poll?.statistics?.ageGroupBreakdown || [];
  const matchPredictions = poll?.statistics?.matchPredictions || [];
  const scorePredictions = poll?.statistics?.scorePredictions || [];

  // Calculate percentages
  const totalVotes = poll ? (poll.option1?.votes || 0) + (poll.option2?.votes || 0) : 0;
  const option1Percentage = poll && totalVotes > 0 
    ? Math.round(((poll.option1?.votes || 0) / totalVotes) * 100) 
    : 50;
  const option2Percentage = poll && totalVotes > 0 
    ? Math.round(((poll.option2?.votes || 0) / totalVotes) * 100) 
    : 50;

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
          dialogTitle: 'Share Poll Results',
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error: any) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share poll results. Please try again.');
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
          <Text style={styles.headerTitle}>Poll Results</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading poll results...</Text>
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
          <Text style={styles.headerTitle}>Poll Results</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Poll not found</Text>
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
          <Text style={styles.headerTitle}>Poll Results</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Poll Question */}
        <View style={styles.questionSection}>
          <Text style={styles.questionText}>{poll.question}</Text>
        </View>
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'predictions' && styles.activeTab]}
            onPress={() => setActiveTab('predictions')}
          >
            <Text style={[styles.tabText, activeTab === 'predictions' && styles.activeTabText]}>Predictions</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'demographics' && styles.activeTab]}
            onPress={() => setActiveTab('demographics')}
          >
            <Text style={[styles.tabText, activeTab === 'demographics' && styles.activeTabText]}>Demographics</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'overview' && (
          <>
            {/* Option Comparison */}
            <View style={styles.playersSection}>
              <View style={styles.player}>
                <Image 
                  source={{ uri: getDirectImageUrl(poll.option1?.image) || 'https://via.placeholder.com/80' }}
                  style={styles.playerImage}
                  onError={(e) => {
                    console.log('Image load error:', poll.option1?.image);
                  }}
                />
                <Text style={styles.playerName}>{poll.option1?.name?.toUpperCase() || 'OPTION 1'}</Text>
                <Text style={styles.voteCount}>{poll.option1?.votes || 0} votes</Text>
              </View>
              
              <Text style={styles.vsText}>VS</Text>
              
              <View style={styles.player}>
                <Image 
                  source={{ uri: getDirectImageUrl(poll.option2?.image) || 'https://via.placeholder.com/80' }}
                  style={styles.playerImage}
                  onError={(e) => {
                    console.log('Image load error:', poll.option2?.image);
                  }}
                />
                <Text style={styles.playerName}>{poll.option2?.name?.toUpperCase() || 'OPTION 2'}</Text>
                <Text style={styles.voteCount}>{poll.option2?.votes || 0} votes</Text>
              </View>
            </View>

            {/* Overall Percentage */}
            <View style={styles.percentageSection}>
              <View style={styles.percentageBar}>
                <View style={[styles.percentageSegment, styles.messiSegment, { width: `${option1Percentage}%` }]}>
                  <Text style={styles.percentageText}>{option1Percentage}%</Text>
                </View>
                <View style={[styles.percentageSegment, styles.ronaldoSegment, { width: `${option2Percentage}%` }]}>
                  <Text style={styles.percentageText}>{option2Percentage}%</Text>
                </View>
              </View>
              <Text style={styles.totalVotesText}>Total Votes: {totalVotes}</Text>
            </View>

            {/* High-level note about predictions */}
            {(scorePredictions.length > 0 || matchPredictions.length > 0) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Community Predictions</Text>
                <Text style={styles.totalVotesText}>
                  Explore detailed score and outcome predictions in the Predictions tab.
                </Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'predictions' && (
          <>
            {/* Score Predictions */}
            {scorePredictions && scorePredictions.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Score Predictions</Text>
                {scorePredictions.map((score: any, index: number) => (
                  <View key={index} style={styles.scoreItem}>
                    <View style={styles.scoreBarContainer}>
                      <View style={[styles.scoreBar, { backgroundColor: score.color || '#3B82F6', width: `${Math.max(score.percentage || 0, 5)}%` }]} />
                    </View>
                    <Text style={styles.scoreText}>{score.score}</Text>
                    <Text style={styles.scorePercentage}>{score.percentage || 0}%</Text>
                  </View>
                ))}
              </View>
            ) : poll?.type === 'daily-poll' ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Score Predictions</Text>
                <View style={styles.emptySection}>
                  <Text style={styles.emptyText}>No score predictions yet. Be the first to predict!</Text>
                </View>
              </View>
            ) : null}

            {/* Match Predictions */}
            {matchPredictions && matchPredictions.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Match Outcome Predictions</Text>
                {matchPredictions.map((prediction: any, index: number) => (
                  <View key={index} style={styles.predictionItem}>
                    <View style={styles.predictionBarContainer}>
                      <View style={[styles.predictionBar, { backgroundColor: prediction.color || '#3B82F6', width: `${Math.max(prediction.percentage || 0, 5)}%` }]} />
                    </View>
                    <Text style={styles.predictionText}>{prediction.prediction}</Text>
                    <Text style={styles.predictionPercentage}>{prediction.percentage || 0}%</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Match Outcome Predictions</Text>
                <View style={styles.emptySection}>
                  <Text style={styles.emptyText}>No outcome predictions yet. Be the first to predict!</Text>
                </View>
              </View>
            )}
          </>
        )}

        {activeTab === 'demographics' && (
          <>
            {/* Country Breakdown */}
            {countryBreakdown.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Country Breakdown</Text>
                {countryBreakdown.map((country: any, index: number) => (
                  <View key={index} style={styles.countryItem}>
                    <View style={styles.countryBarContainer}>
                      <View style={[styles.countryBar, { backgroundColor: country.color || '#3B82F6', width: `${country.percentage || 0}%` }]} />
                    </View>
                    <Text style={styles.countryName}>{country.country}</Text>
                    <Text style={styles.countryPercentage}>{country.percentage || 0}%</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Age Group Breakdown */}
            {ageGroupBreakdown.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Age Group Breakdown</Text>
                {ageGroupBreakdown.map((ageGroup: any, index: number) => (
                  <View key={index} style={styles.ageItem}>
                    <View style={styles.ageBarContainer}>
                      <View style={[styles.ageBar, { backgroundColor: ageGroup.color || '#3B82F6', width: `${ageGroup.percentage || 0}%` }]} />
                    </View>
                    <Text style={styles.ageText}>{ageGroup.ageGroup}</Text>
                    <Text style={styles.agePercentage}>{ageGroup.percentage || 0}%</Text>
                  </View>
                ))}
              </View>
            )}
            {countryBreakdown.length === 0 && ageGroupBreakdown.length === 0 && (
              <View style={styles.emptySection}>
                <Text style={styles.emptyText}>No demographic data available</Text>
              </View>
            )}
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
    fontSize: 26,
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
    fontSize: 13,
    fontFamily: fonts.bodyMedium,
    color: '#9CA3AF',
  },
  activeTabText: {
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
  playersSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  player: {
    alignItems: 'center',
    flex: 1,
  },
  playerName: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  playerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  vsText: {
    fontSize: 20,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginHorizontal: 20,
  },
  percentageSection: {
    marginBottom: 40,
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
  messiSegment: {
    backgroundColor: '#3B82F6',
  },
  ronaldoSegment: {
    backgroundColor: '#EF4444',
  },
  percentageText: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  countrySection: {
    marginBottom: 40,
  },
  countryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  countryBarContainer: {
    flex: 1,
    height: 20,
    backgroundColor: '#4A5568',
    borderRadius: 10,
    marginRight: 15,
    overflow: 'hidden',
  },
  countryBar: {
    height: '100%',
    borderRadius: 10,
  },
  countryName: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: '#FFFFFF',
    minWidth: 80,
    marginRight: 10,
  },
  countryPercentage: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    minWidth: 40,
    textAlign: 'right',
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  predictionBarContainer: {
    flex: 1,
    height: 16,
    backgroundColor: '#4A5568',
    borderRadius: 8,
    marginRight: 15,
    overflow: 'hidden',
  },
  predictionBar: {
    height: '100%',
    borderRadius: 8,
  },
  predictionText: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: '#FFFFFF',
    minWidth: 120,
    marginRight: 10,
  },
  predictionPercentage: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    minWidth: 40,
    textAlign: 'right',
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreBarContainer: {
    flex: 1,
    height: 16,
    backgroundColor: '#4A5568',
    borderRadius: 8,
    marginRight: 15,
    overflow: 'hidden',
  },
  scoreBar: {
    height: '100%',
    borderRadius: 8,
  },
  scoreText: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: '#FFFFFF',
    minWidth: 60,
    marginRight: 10,
  },
  scorePercentage: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    minWidth: 40,
    textAlign: 'right',
  },
  ageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ageBarContainer: {
    flex: 1,
    height: 16,
    backgroundColor: '#4A5568',
    borderRadius: 8,
    marginRight: 15,
    overflow: 'hidden',
  },
  ageBar: {
    height: '100%',
    borderRadius: 8,
  },
  ageText: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: '#FFFFFF',
    minWidth: 60,
    marginRight: 10,
  },
  agePercentage: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    minWidth: 40,
    textAlign: 'right',
  },
  questionSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#2D3748',
    borderRadius: 12,
  },
  questionText: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  voteCount: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    marginTop: 5,
  },
  totalVotesText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 10,
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
  emptySection: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fonts.body,
    color: '#9CA3AF',
    fontSize: 16,
  },
});

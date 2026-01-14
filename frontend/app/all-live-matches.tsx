import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { liveMatchesAPI } from '@/utils/api';
import { getDirectImageUrl } from '@/utils/imageUtils';
import { fonts } from '@/utils/typography';

interface LiveMatch {
  _id: string;
  title: string;
  description: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  thumbnail: string;
  matchDate: string;
  matchTime: string;
  isLive: boolean;
  homeScore: number;
  awayScore: number;
  status?: 'upcoming' | 'live' | 'finished';
}

export default function AllLiveMatchesScreen() {
  const [activeTab, setActiveTab] = useState<'live' | 'previous'>('live');
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [previousMatches, setPreviousMatches] = useState<LiveMatch[]>([]);

  useEffect(() => {
    fetchMatches();
  }, []);

  useEffect(() => {
    // Separate matches into live and previous
    const live = matches.filter(
      (match) => match.status === 'live' || match.status === 'upcoming'
    );
    const previous = matches.filter((match) => match.status === 'finished');

    setLiveMatches(live);
    setPreviousMatches(previous);
  }, [matches]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const response = await liveMatchesAPI.getLiveMatches();
      if (response.success) {
        setMatches(response.data || []);
      } else {
        Alert.alert('Error', response.message || 'Failed to load matches');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const handleMatchPress = (match: LiveMatch) => {
    router.push({
      pathname: '/live-matches',
      params: { matchId: match._id },
    });
  };

  const formatMatchDateTime = (matchDate: string, matchTime: string) => {
    if (!matchDate) return '';
    try {
      const date = new Date(matchDate);
      const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return `${dateStr} ${matchTime || ''}`.trim();
    } catch {
      return '';
    }
  };

  const renderMatchCard = ({ item }: { item: LiveMatch }) => {
    const isLive = item.status === 'live';
    const isUpcoming = item.status === 'upcoming';
    const isFinished = item.status === 'finished';

    return (
      <TouchableOpacity
        style={styles.matchCard}
        onPress={() => handleMatchPress(item)}
        activeOpacity={0.7}
      >
        {item.thumbnail ? (
          <Image
            source={{ uri: getDirectImageUrl(item.thumbnail) }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Ionicons name="football-outline" size={40} color="#9CA3AF" />
          </View>
        )}

        <View style={styles.matchOverlay}>
          <View style={styles.matchHeader}>
            {isLive && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
            {isUpcoming && (
              <View style={styles.upcomingBadge}>
                <Text style={styles.upcomingText}>UPCOMING</Text>
              </View>
            )}
            {isFinished && (
              <View style={styles.finishedBadge}>
                <Text style={styles.finishedText}>FINISHED</Text>
              </View>
            )}
          </View>

          <View style={styles.matchInfo}>
            <Text style={styles.matchTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {item.description && (
              <Text style={styles.matchDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}

            <View style={styles.teamsContainer}>
              <View style={styles.team}>
                {item.homeLogo && (
                  <Image
                    source={{ uri: getDirectImageUrl(item.homeLogo) }}
                    style={styles.teamLogo}
                  />
                )}
                <Text style={styles.teamName} numberOfLines={1}>
                  {item.homeTeam}
                </Text>
              </View>

              <View style={styles.vsContainer}>
                {isFinished && item.homeScore !== null && item.awayScore !== null ? (
                  <Text style={styles.score}>
                    {item.homeScore} - {item.awayScore}
                  </Text>
                ) : (
                  <Text style={styles.vsText}>VS</Text>
                )}
              </View>

              <View style={styles.team}>
                <Text style={styles.teamName} numberOfLines={1}>
                  {item.awayTeam}
                </Text>
                {item.awayLogo && (
                  <Image
                    source={{ uri: getDirectImageUrl(item.awayLogo) }}
                    style={styles.teamLogo}
                  />
                )}
              </View>
            </View>

            <Text style={styles.matchDateTime}>
              {formatMatchDateTime(item.matchDate, item.matchTime)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const currentMatches = activeTab === 'live' ? liveMatches : previousMatches;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Matches</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'live' && styles.activeTab]}
          onPress={() => setActiveTab('live')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'live' && styles.activeTabText,
            ]}
          >
            Live Matches ({liveMatches.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'previous' && styles.activeTab]}
          onPress={() => setActiveTab('previous')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'previous' && styles.activeTabText,
            ]}
          >
            Previous ({previousMatches.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Matches List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading matches...</Text>
        </View>
      ) : currentMatches.length > 0 ? (
        <FlatList
          data={currentMatches}
          renderItem={renderMatchCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={fetchMatches}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="football-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyText}>
            No {activeTab === 'live' ? 'live' : 'previous'} matches available
          </Text>
          <Text style={styles.emptySubtext}>
            {activeTab === 'live'
              ? 'Check back later for upcoming matches'
              : 'No previous matches found'}
          </Text>
        </View>
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
  },
  placeholder: {
    width: 34,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3748',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: '#9CA3AF',
  },
  activeTabText: {
    fontFamily: fonts.bodySemiBold,
    color: '#3B82F6',
  },
  listContent: {
    padding: 20,
  },
  matchCard: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: 200,
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#1A202C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 15,
  },
  matchHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginRight: 4,
  },
  liveText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  upcomingBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  upcomingText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  finishedBadge: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  finishedText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  matchInfo: {
    gap: 8,
  },
  matchTitle: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  matchDescription: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#9CA3AF',
  },
  teamsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  team: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamLogo: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  teamName: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: '#FFFFFF',
    flex: 1,
  },
  vsContainer: {
    marginHorizontal: 15,
    alignItems: 'center',
  },
  vsText: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  score: {
    fontSize: 18,
    fontFamily: fonts.bodySemiBold,
    color: '#3B82F6',
  },
  matchDateTime: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    marginTop: 4,
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
    marginTop: 8,
  },
});

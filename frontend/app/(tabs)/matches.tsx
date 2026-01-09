import VotingModal from '@/components/VotingModal';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { matchesAPI } from '@/utils/api';
import { getDirectImageUrl } from '@/utils/imageUtils';
import { fonts } from '@/utils/typography';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useDataCache } from '@/contexts/DataCacheContext';

export default function MatchesScreen() {
  const { getCacheData, setCacheData, isCached } = useDataCache();
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showOdds, setShowOdds] = useState(false);
  const [selectedBettingCompany, setSelectedBettingCompany] = useState('1xbet');
  const [showVotingModal, setShowVotingModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [leagues, setLeagues] = useState<string[]>([]);

  const bettingCompanies = [
    { id: '1xbet', name: '1xBet', color: '#00A651' },
    { id: 'betpawa', name: 'BetPawa', color: '#FF6B35' },
    { id: 'bet9ja', name: 'Bet9ja', color: '#1E40AF' },
    { id: 'sportybet', name: 'SportyBet', color: '#DC2626' },
    { id: 'betking', name: 'BetKing', color: '#7C3AED' },
  ];

  const leagueConfig: { [key: string]: { logo: string; color: string; fullName: string } } = {
    'Premier League': { logo: '🏆', color: '#8B5CF6', fullName: 'Premier League' },
    'La Liga': { logo: '⚽', color: '#F59E0B', fullName: 'La Liga' },
    'Champions League': { logo: '⭐', color: '#3B82F6', fullName: 'Champions League' },
    'Bundesliga': { logo: '🔴', color: '#EF4444', fullName: 'Bundesliga' },
    'Serie A': { logo: '🇮🇹', color: '#10B981', fullName: 'Serie A' },
    'Ligue 1': { logo: '🇫🇷', color: '#3B82F6', fullName: 'Ligue 1' },
  };

  // Helper function to check if voting is disabled for a match
  const isVotingDisabled = (match: any): boolean => {
    if (!match.matchDate || !match.matchTime) {
      return false;
    }

    try {
      const matchDateTime = new Date(match.matchDate);
      const timeParts = match.matchTime.split(':');
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1] || '0', 10);

      if (isNaN(hours) || isNaN(minutes)) {
        return false;
      }

      matchDateTime.setHours(hours, minutes, 0, 0);

      // Add 100 minutes to match time
      const votingDeadline = new Date(matchDateTime);
      votingDeadline.setMinutes(votingDeadline.getMinutes() + 100);

      // Check if current time has passed the voting deadline
      const now = new Date();
      return now > votingDeadline;
    } catch (error) {
      console.error('Error checking voting deadline:', error);
      return false;
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  useEffect(() => {
    if (selectedLeague) {
      loadMatchesByLeague();
    } else {
      loadMatches();
    }
  }, [selectedLeague]);

  const loadMatches = async () => {
    // First check cache
    const cachedData = getCacheData('matches_international');
    if (cachedData) {
      setMatches(cachedData);
      const leagueNames = (cachedData as any[]).map((m: any) => m.league).filter((league: any) => typeof league === 'string' && Boolean(league)) as string[];
      const uniqueLeagues = [...new Set(leagueNames)] as string[];
      setLeagues(uniqueLeagues);
      if (uniqueLeagues.length > 0 && !selectedLeague) {
        setSelectedLeague(uniqueLeagues[0]);
      }
      setLoading(false);
    } else {
      setLoading(true);
    }

    // Refresh in background
    try {
      const response = await matchesAPI.getMatches({ leagueType: 'international' });
      if (response.success) {
        setCacheData('matches_international', response.data);
        setMatches(response.data);
        // Extract unique leagues
        const leagueNames = (response.data as any[]).map((m: any) => m.league).filter((league: any) => typeof league === 'string' && Boolean(league)) as string[];
        const uniqueLeagues = [...new Set(leagueNames)] as string[];
        setLeagues(uniqueLeagues);
        if (uniqueLeagues.length > 0 && !selectedLeague) {
          setSelectedLeague(uniqueLeagues[0]);
        }
      }
    } catch (error: any) {
      if (!cachedData) {
        Alert.alert('Error', error.message || 'Failed to load matches');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMatchesByLeague = async () => {
    if (!selectedLeague) return;
    
    const cacheKey = `matches_international_${selectedLeague}`;
    const cachedData = getCacheData(cacheKey);
    
    if (cachedData) {
      setMatches(cachedData);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // Refresh in background
    try {
      const response = await matchesAPI.getMatchesByLeague(selectedLeague, { leagueType: 'international' });
      if (response.success) {
        setCacheData(cacheKey, response.data);
        setMatches(response.data);
      }
    } catch (error: any) {
      if (!cachedData) {
        Alert.alert('Error', error.message || 'Failed to load matches');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchMatches = loadMatches;
  const fetchMatchesByLeague = loadMatchesByLeague;

  const filteredFixtures = matches;

  const handleMatchPress = (fixture: any) => {
    // Don't open modal if voting is disabled
    if (isVotingDisabled(fixture)) {
      return;
    }

    setSelectedMatch({
      ...fixture,
      id: fixture._id || fixture.id,
      time: fixture.matchTime,
      league: fixture.league || 'Other'
    });
    setShowVotingModal(true);
  };

  const handleVote = async (matchId: string, prediction: 'home' | 'draw' | 'away') => {
    try {
      setIsLoading(true);
      const response = await matchesAPI.voteMatch(matchId, prediction);
      if (response.success) {
        Alert.alert('Success', 'Your vote has been recorded!');
        setShowVotingModal(false);
        setSelectedMatch(null);
        if (selectedLeague) {
          await fetchMatchesByLeague();
        } else {
          await fetchMatches();
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to vote');
    } finally {
      setIsLoading(false);
    }
  };

  const closeVotingModal = () => {
    setShowVotingModal(false);
    setSelectedMatch(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Leagues & Matches</Text>
          <View>
            <TouchableOpacity style={styles.liveMatchButton} onPress={() => router.navigate('/live-matches')}>
              <Text style={styles.liveMatchText}>Live</Text>
              <Ionicons name="tv-outline" size={16} color="red" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Leagues */}
        {loading && leagues.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading leagues...</Text>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Leagues</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.leaguesScroll}>
              {leagues.map((leagueName) => {
                const config = leagueConfig[leagueName] || { logo: '⚽', color: '#3B82F6', fullName: leagueName };
                return (
                  <TouchableOpacity 
                    key={leagueName} 
                    style={[
                      styles.leagueCard, 
                      { backgroundColor: config.color },
                      selectedLeague === leagueName && styles.selectedLeague
                    ]}
                    onPress={() => setSelectedLeague(leagueName)}
                  >
                    <Text style={styles.leagueLogo}>{config.logo}</Text>
                    <Text style={styles.leagueName}>{leagueName}</Text>
                    {selectedLeague === leagueName && (
                      <Text style={styles.selectedIndicator}>✓</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Betting Company Selection */}
        {showOdds && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Betting Company</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bettingScroll}>
              {bettingCompanies.map((company) => (
                <TouchableOpacity
                  key={company.id}
                  style={[
                    styles.bettingCard,
                    { backgroundColor: company.color },
                    selectedBettingCompany === company.id && styles.selectedBettingCard
                  ]}
                  onPress={() => setSelectedBettingCompany(company.id)}
                >
                  <Text style={styles.bettingName}>{company.name}</Text>
                  {selectedBettingCompany === company.id && (
                    <Text style={styles.selectedIndicator}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Fixtures & Results */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedLeague ? (leagueConfig[selectedLeague]?.fullName || selectedLeague) : 'All'} - Fixtures & Results
            </Text>
            {/* <TouchableOpacity 
              style={styles.oddsToggle}
              onPress={() => setShowOdds(!showOdds)}
            >
              <Text style={styles.oddsToggleText}>
                {showOdds ? 'Hide Odds' : 'Show Odds'}
              </Text>
            </TouchableOpacity> */}
          </View>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Loading matches...</Text>
            </View>
          ) : filteredFixtures.length > 0 ? (
            filteredFixtures.map((fixture: any) => {
              const hasScore = fixture.homeScore !== null && fixture.awayScore !== null;
              const votingDisabled = isVotingDisabled(fixture);
              return (
                <View
                  key={fixture._id || fixture.id}
                  style={[
                    styles.matchCard,
                    votingDisabled && styles.matchCardDisabled
                  ]}
                >
                  <TouchableOpacity 
                    onPress={() => handleMatchPress(fixture)}
                    disabled={votingDisabled}
                    activeOpacity={votingDisabled ? 1 : 0.7}
                  >
                    <View style={styles.matchTeams}>
                    <View style={styles.team}>
                      <Image 
                        source={{ uri: getDirectImageUrl(fixture.homeLogo) || 'https://via.placeholder.com/40' }} 
                        style={styles.teamLogo}
                        onError={(e) => {
                          console.log('Image load error:', fixture.homeLogo);
                        }}
                      />
                      <Text style={styles.teamName}>{fixture.homeTeam}</Text>
                    </View>
                    <View style={styles.matchCenter}>
                      {votingDisabled && hasScore ? (
                        <Text style={styles.score}>{fixture.homeScore} - {fixture.awayScore}</Text>
                      ) : votingDisabled ? (
                        <Text style={styles.time}>Finished</Text>
                      ) : hasScore ? (
                        <Text style={styles.score}>{fixture.homeScore} - {fixture.awayScore}</Text>
                      ) : (
                        <Text style={styles.time}>{fixture.matchTime}</Text>
                      )}
                      {!votingDisabled && <Text style={styles.voteText}>Tap to vote</Text>}
                    </View>
                    <View style={styles.team}>
                      <Text style={styles.teamName}>{fixture.awayTeam}</Text>
                      <Image 
                        source={{ uri: getDirectImageUrl(fixture.awayLogo) || 'https://via.placeholder.com/40' }}
                        style={styles.teamLogo}
                        onError={(e) => {
                          console.log('Image load error:', fixture.awayLogo);
                        }}
                      />
                    </View>
                  </View>
                  </TouchableOpacity>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No matches available</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Voting Modal */}
      {selectedMatch && (
        <VotingModal
          visible={showVotingModal}
          onClose={closeVotingModal}
          match={selectedMatch}
          onVote={handleVote}
        />
      )}
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
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginBottom: 15,
  },
  leaguesScroll: {
    flexDirection: 'row',
  },
  leagueCard: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leagueLogo: {
    fontSize: 24,
    marginBottom: 5,
  },
  leagueName: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  matchCard: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  matchCardDisabled: {
    backgroundColor: '#3D2A2A', // Mild red overlay (#2D3748 + red tint)
    borderColor: '#4A2E2E', // Slightly red border
    borderWidth: 1,
  },
  matchTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  team: {
    flex: 1,
    alignItems: 'center',
  },
  teamLogo: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginBottom: 5,
  },
  teamName: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  matchCenter: {
    alignItems: 'center',
    minWidth: 80,
  },
  time: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#9CA3AF',
  },
  score: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  voteText: {
    fontSize: 10,
    color: '#3B82F6',
    marginTop: 2,
    fontFamily: fonts.bodyMedium,
  },
  oddsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#4A5568',
  },
  oddsRow: {
    alignItems: 'center',
  },
  oddsLabel: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  oddsValue: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: '#3B82F6',
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  leaderboardIcon: {
    fontSize: 20,
    marginRight: 15,
  },
  leaderboardLeague: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.bodyMedium,
    color: '#FFFFFF',
  },
  leaderboardMetric: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#9CA3AF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  selectedLeague: {
    transform: [{ scale: 1.05 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    fontSize: 12,
    color: '#FFFFFF',
    fontFamily: fonts.bodySemiBold,
  },
  oddsToggle: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  oddsToggleText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontFamily: fonts.bodyMedium,
  },
  bettingScroll: {
    flexDirection: 'row',
  },
  bettingCard: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    alignItems: 'center',
    minWidth: 80,
  },
  selectedBettingCard: {
    transform: [{ scale: 1.05 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  bettingName: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  oddsHeader: {
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#4A5568',
  },
  oddsCompany: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: '#3B82F6',
  },
  loadingContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontFamily: fonts.body,
    color: '#FFFFFF',
    fontSize: 14,
  },
  emptyContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fonts.body,
    color: '#9CA3AF',
    fontSize: 14,
  },
  liveMatchText: {
    fontSize: 15,
    fontFamily: fonts.bodySemiBold,
    color: 'red',
  },
  liveMatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
});

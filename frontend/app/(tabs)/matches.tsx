import VotingModal from '@/components/VotingModal';
import React, { useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { matchesAPI } from '@/utils/api';
import { getDirectImageUrl } from '@/utils/imageUtils';
import { fonts } from '@/utils/typography';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useDataCache } from '@/contexts/DataCacheContext';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

// Match start date+time in local time
function getMatchStartDate(match: any): Date | null {
  if (!match?.matchDate || !match?.matchTime) return null;
  try {
    let d: Date;
    if (match.matchDate instanceof Date) {
      d = new Date(match.matchDate.getTime());
    } else if (typeof match.matchDate === 'string') {
      const dateStr = match.matchDate.split('T')[0];
      const [y, m, day] = dateStr.split('-').map(Number);
      d = new Date(y, m - 1, day);
    } else {
      d = new Date(match.matchDate);
    }
    const timeStr = String(match.matchTime).trim();
    const pm = /(\d{1,2}):(\d{2})\s*PM$/i.test(timeStr);
    const am = /(\d{1,2}):(\d{2})\s*AM$/i.test(timeStr);
    let hours = 0, minutes = 0;
    if (pm || am) {
      const parts = timeStr.match(/(\d{1,2}):(\d{2})/i);
      if (parts) {
        hours = parseInt(parts[1], 10);
        minutes = parseInt(parts[2], 10);
        if (pm && hours !== 12) hours += 12;
        if (am && hours === 12) hours = 0;
      }
    } else {
      const parts = timeStr.split(':');
      hours = parseInt(parts[0], 10) || 0;
      minutes = parseInt(parts[1], 10) || 0;
    }
    d.setHours(hours, minutes, 0, 0);
    return d;
  } catch {
    return null;
  }
}
function isMatchStarted(match: any): boolean {
  const start = getMatchStartDate(match);
  return start ? new Date() >= start : false;
}
function isMatchFinished(match: any): boolean {
  return match.status === 'finished' ||
    (match.homeScore != null && match.awayScore != null);
}

export default function MatchesScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
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
  const [selectedTab, setSelectedTab] = useState<'upcoming' | 'previous'>('upcoming');
  const [myPoolMatchIds, setMyPoolMatchIds] = useState<Set<string>>(new Set());

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

  // Format time to 24-hour format
  const formatTime24Hour = (timeString: string): string => {
    if (!timeString) return '';
    
    // If already in 24-hour format (HH:MM), return as is
    const timeRegex24 = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (timeRegex24.test(timeString)) {
      return timeString;
    }
    
    // If in 12-hour format, convert to 24-hour
    const timeRegex12 = /^([0-1]?[0-9]):([0-5][0-9])\s?(AM|PM)$/i;
    const match = timeString.match(timeRegex12);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2];
      const period = match[3].toUpperCase();
      
      if (period === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }
      
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
    
    // Return original if format not recognized
    return timeString;
  };

  // Helper function to check if voting is disabled for a match
  const isVotingDisabled = (match: any): boolean => {
    if (!match.matchDate || !match.matchTime) {
      return false;
    }

    try {
      // Parse matchDate - handle both ISO string and Date object
      // Important: We need to parse the date in LOCAL timezone to avoid timezone issues
      let matchDateObj: Date;
      if (match.matchDate instanceof Date) {
        // If already a Date object, clone it
        matchDateObj = new Date(match.matchDate.getTime());
      } else if (typeof match.matchDate === 'string') {
        // If it's a string, parse it carefully to avoid timezone issues
        // Extract just the date part (YYYY-MM-DD) and create a local date
        const dateStr = match.matchDate.split('T')[0]; // Get just the date part (YYYY-MM-DD)
        const [year, month, day] = dateStr.split('-').map(Number);
        // Create date in LOCAL timezone (months are 0-indexed in JS Date)
        matchDateObj = new Date(year, month - 1, day);
      } else {
        matchDateObj = new Date(match.matchDate);
      }

      // Parse matchTime - ensure it's in 24-hour format
      const time24 = formatTime24Hour(match.matchTime);
      const timeParts = time24.split(':');
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1] || '0', 10);

      if (isNaN(hours) || isNaN(minutes)) {
        return false;
      }

      // Set hours and minutes in LOCAL time (not UTC)
      matchDateObj.setHours(hours, minutes, 0, 0);

      // Add 100 minutes to match time
      const votingDeadline = new Date(matchDateObj);
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

  useEffect(() => {
    if (!user) {
      setMyPoolMatchIds(new Set());
      return;
    }
    matchesAPI.getMyPools()
      .then((res) => {
        if (!res?.success || !res?.data) return;
        const ids = new Set<string>();
        const pools = [...(res.data.active || []), ...(res.data.past || [])];
        pools.forEach((p: any) => {
          const mid = p?.match?._id || p?.match?.id || p?.match;
          if (mid) ids.add(String(mid));
        });
        setMyPoolMatchIds(ids);
      })
      .catch(() => setMyPoolMatchIds(new Set()));
  }, [user]);

  const { upcomingMatches, previousMatches } = useMemo(() => {
    const upcoming: any[] = [];
    const previous: any[] = [];
    matches.forEach((m) => {
      if (isMatchStarted(m) || isMatchFinished(m)) previous.push(m);
      else upcoming.push(m);
    });
    return { upcomingMatches: upcoming, previousMatches: previous };
  }, [matches]);

  // Check if match is more than a week old
  const isMatchOlderThanWeek = (match: any): boolean => {
    if (!match.matchDate) {
      return false; // If no date, don't filter it out
    }

    try {
      let matchDateObj: Date;
      if (match.matchDate instanceof Date) {
        matchDateObj = new Date(match.matchDate.getTime());
      } else if (typeof match.matchDate === 'string') {
        // Extract just the date part (YYYY-MM-DD) and create a local date
        const dateStr = match.matchDate.split('T')[0];
        const [year, month, day] = dateStr.split('-').map(Number);
        matchDateObj = new Date(year, month - 1, day);
      } else {
        matchDateObj = new Date(match.matchDate);
      }

      const now = new Date();
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      return matchDateObj < oneWeekAgo;
    } catch (error) {
      console.error('Error checking match date:', error);
      return false; // If error, don't filter it out
    }
  };

  // Filter out matches older than a week
  const filterRecentMatches = (matchesArray: any[]) => {
    return matchesArray.filter(match => !isMatchOlderThanWeek(match));
  };

  // Sort matches by most recently posted (createdAt descending)
  const sortMatchesByRecent = (matchesArray: any[]) => {
    return [...matchesArray].sort((a, b) => {
      // Sort by createdAt (newest first), fallback to _id if createdAt not available
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : (a._id ? new Date(a._id.substring(0, 8)).getTime() : 0);
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : (b._id ? new Date(b._id.substring(0, 8)).getTime() : 0);
      return bTime - aTime; // Descending order (newest first)
    });
  };

  const loadMatches = async () => {
    // First check cache
    const cachedData = getCacheData('matches_international');
    if (cachedData) {
      const filteredMatches = filterRecentMatches(cachedData);
      const sortedMatches = sortMatchesByRecent(filteredMatches);
      setMatches(sortedMatches);
      const leagueNames = (sortedMatches as any[]).map((m: any) => m.league).filter((league: any) => typeof league === 'string' && Boolean(league)) as string[];
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
        const filteredMatches = filterRecentMatches(response.data);
        const sortedMatches = sortMatchesByRecent(filteredMatches);
        setCacheData('matches_international', sortedMatches);
        setMatches(sortedMatches);
        // Extract unique leagues
        const leagueNames = (sortedMatches as any[]).map((m: any) => m.league).filter((league: any) => typeof league === 'string' && Boolean(league)) as string[];
        const uniqueLeagues = [...new Set(leagueNames)] as string[];
        setLeagues(uniqueLeagues);
        if (uniqueLeagues.length > 0 && !selectedLeague) {
          setSelectedLeague(uniqueLeagues[0]);
        }
      }
    } catch (error: any) {
      if (!cachedData) {
        Alert.alert(t('Error'), error.message || t('Failed to load matches'));
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
      const filteredMatches = filterRecentMatches(cachedData);
      const sortedMatches = sortMatchesByRecent(filteredMatches);
      setMatches(sortedMatches);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // Refresh in background
    try {
      const response = await matchesAPI.getMatchesByLeague(selectedLeague, { leagueType: 'international' });
      if (response.success) {
        const filteredMatches = filterRecentMatches(response.data);
        const sortedMatches = sortMatchesByRecent(filteredMatches);
        setCacheData(cacheKey, sortedMatches);
        setMatches(sortedMatches);
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

  const filteredFixtures = selectedTab === 'upcoming' ? upcomingMatches : previousMatches;

  const handleMatchPress = (fixture: any) => {
    if (isVotingDisabled(fixture)) return;
    if (myPoolMatchIds.has(fixture._id || fixture.id)) return;
    setSelectedMatch({
      ...fixture,
      id: fixture._id || fixture.id,
      _id: fixture._id || fixture.id,
      time: formatTime24Hour(fixture.matchTime),
      league: fixture.league || 'Other',
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      homeLogo: fixture.homeLogo,
      awayLogo: fixture.awayLogo,
    });
    setShowVotingModal(true);
  };

  const handleVote = async (
    matchId: string,
    prediction: 'home' | 'draw' | 'away',
    homeScore: number,
    awayScore: number,
    amount: number,
    poolId?: string
  ) => {
    try {
      setIsLoading(true);
      const response = await matchesAPI.joinMatchPool(matchId, {
        amount,
        prediction,
        homeScore,
        awayScore,
        poolId,
      });
      if (response.success) {
        Alert.alert(t('Success'), t('Your bet has been placed in a pool!'));
        setShowVotingModal(false);
        setSelectedMatch(null);
        if (selectedLeague) await fetchMatchesByLeague();
        else await fetchMatches();
        setMyPoolMatchIds((prev) => new Set(prev).add(matchId));
      } else {
        Alert.alert(t('Error'), response.message || t('Failed to place bet'));
      }
    } catch (error: any) {
      Alert.alert(t('Error'), error.message || t('Failed to place bet'));
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
          <Text style={styles.headerTitle}>{t('Leagues & Matches')}</Text>
          <View>
            <TouchableOpacity style={styles.liveMatchButton} onPress={() => router.navigate('/all-live-matches')}>
              <Text style={styles.liveMatchText}>Live</Text>
              <Ionicons name="tv-outline" size={16} color="red" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Leagues */}
        {loading && leagues.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>{t('Loading leagues...')}</Text>
          </View>
        ) : (
          <> </>
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
              {selectedLeague ? (leagueConfig[selectedLeague]?.fullName || selectedLeague) : t('All')} - {t('Fixtures & Results')}
            </Text>
          </View>
          {/* Upcoming / Previous tabs */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tabButton, selectedTab === 'upcoming' && styles.tabButtonActive]}
              onPress={() => setSelectedTab('upcoming')}
            >
              <Text style={[styles.tabText, selectedTab === 'upcoming' && styles.tabTextActive]}>
                {t('Upcoming')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, selectedTab === 'previous' && styles.tabButtonActive]}
              onPress={() => setSelectedTab('previous')}
            >
              <Text style={[styles.tabText, selectedTab === 'previous' && styles.tabTextActive]}>
                {t('Previous')}
              </Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>{t('Loading matches...')}</Text>
            </View>
          ) : filteredFixtures.length > 0 ? (
            filteredFixtures.map((fixture: any) => {
              const hasScore = fixture.homeScore !== null && fixture.awayScore !== null;
              const votingDisabled = isVotingDisabled(fixture);
              const hasBet = myPoolMatchIds.has(fixture._id || fixture.id);
              const isFinished = isMatchFinished(fixture);
              const canVote = selectedTab === 'upcoming' && !votingDisabled && !hasBet;
              return (
                <View
                  key={fixture._id || fixture.id}
                  style={[
                    styles.matchCard,
                    (votingDisabled || hasBet) && styles.matchCardDisabled,
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => canVote && handleMatchPress(fixture)}
                    disabled={!canVote}
                    activeOpacity={canVote ? 0.7 : 1}
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
                        {hasScore ? (
                          <Text style={styles.score}>{fixture.homeScore} - {fixture.awayScore}</Text>
                        ) : isFinished ? (
                          <Text style={styles.time}>{t('Finished')}</Text>
                        ) : (
                          <Text style={styles.time}>{formatTime24Hour(fixture.matchTime)}</Text>
                        )}
                        {selectedTab === 'upcoming' && !votingDisabled && (
                          hasBet ? (
                            <Text style={styles.betPlacedText}>{t('Bet placed')}</Text>
                          ) : (
                            <Text style={styles.voteText}>{t('Tap to vote')}</Text>
                          )
                        )}
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
              <Text style={styles.emptyText}>
                {selectedTab === 'upcoming'
                  ? t('No upcoming matches available')
                  : t('No previous matches available')}
              </Text>
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
  betPlacedText: {
    fontSize: 10,
    color: '#10B981',
    marginTop: 2,
    fontFamily: fonts.bodyMedium,
  },
  tabsRow: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 10,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
  tabButtonActive: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#FFFFFF',
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

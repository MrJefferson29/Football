import VotingModal from '@/components/VotingModal';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { matchesAPI } from '@/utils/api';
import { getDirectImageUrl } from '@/utils/imageUtils';
import { fonts } from '@/utils/typography';
import { useDataCache } from '@/contexts/DataCacheContext';

export default function LocalLeaguesScreen() {
  const { getCacheData, setCacheData } = useDataCache();
  const [activeTab, setActiveTab] = useState<'local' | 'inter-quarter'>('local');
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [showVotingModal, setShowVotingModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [leagues, setLeagues] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Inter-Quarter League state
  const [selectedInterQuarterLeague, setSelectedInterQuarterLeague] = useState<string>('');
  const [interQuarterMatches, setInterQuarterMatches] = useState<any[]>([]);
  const [interQuarterLeagues, setInterQuarterLeagues] = useState<string[]>([]);
  const [loadingInterQuarter, setLoadingInterQuarter] = useState(true);

  const leagueConfig: { [key: string]: { logo: string; color: string; fullName: string } } = {
    'Cameroon Elite One': { logo: '🇨🇲', color: '#FFD700', fullName: 'Cameroon Elite One' },
    'Cameroon Elite Two': { logo: '🥈', color: '#C0C0C0', fullName: 'Cameroon Elite Two' },
    'Regional Championships': { logo: '🏆', color: '#CD7F32', fullName: 'Regional Championships' },
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
    loadInterQuarterMatches();
  }, []);

  useEffect(() => {
    if (selectedLeague) {
      loadMatchesByLeague();
    } else {
      loadMatches();
    }
  }, [selectedLeague]);

  useEffect(() => {
    if (selectedInterQuarterLeague) {
      loadInterQuarterMatchesByLeague();
    } else {
      loadInterQuarterMatches();
    }
  }, [selectedInterQuarterLeague]);

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
    const cachedData = getCacheData('matches_local');
    if (cachedData) {
      const sortedMatches = sortMatchesByRecent(cachedData);
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
      const response = await matchesAPI.getMatches({ leagueType: 'local' });
      if (response.success) {
        const sortedMatches = sortMatchesByRecent(response.data);
        setCacheData('matches_local', sortedMatches);
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
        Alert.alert('Error', error.message || 'Failed to load matches');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMatchesByLeague = async () => {
    if (!selectedLeague) return;
    
    const cacheKey = `matches_local_${selectedLeague}`;
    const cachedData = getCacheData(cacheKey);
    
    if (cachedData) {
      const sortedMatches = sortMatchesByRecent(cachedData);
      setMatches(sortedMatches);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // Refresh in background
    try {
      const response = await matchesAPI.getMatchesByLeague(selectedLeague, { leagueType: 'local' });
      if (response.success) {
        const sortedMatches = sortMatchesByRecent(response.data);
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

  const filteredMatches = matches;

  const handleMatchPress = (match: any) => {
    // Don't open modal if voting is disabled
    if (isVotingDisabled(match)) {
      return;
    }

    setSelectedMatch({
      ...match,
      id: match._id || match.id,
      time: formatTime24Hour(match.matchTime),
      league: match.league || 'Other'
    });
    setShowVotingModal(true);
  };

  const handleVote = async (matchId: string, prediction: 'home' | 'draw' | 'away') => {
    try {
      const response = await matchesAPI.voteMatch(matchId, prediction);
      if (response.success) {
        Alert.alert('Success', 'Your vote has been recorded!');
        setShowVotingModal(false);
        setSelectedMatch(null);
        if (selectedLeague) {
          await loadMatchesByLeague();
        } else {
          await loadMatches();
        }
        // Also refresh inter-quarter matches if we're in that section
        if (selectedInterQuarterLeague) {
          await loadInterQuarterMatchesByLeague();
        } else {
          await loadInterQuarterMatches();
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to vote');
    }
  };

  const closeVotingModal = () => {
    setShowVotingModal(false);
    setSelectedMatch(null);
  };

  const loadInterQuarterMatches = async () => {
    // First check cache
    const cachedData = getCacheData('matches_inter-quarter');
    if (cachedData) {
      const sortedMatches = sortMatchesByRecent(cachedData);
      setInterQuarterMatches(sortedMatches);
      const leagueNames = (sortedMatches as any[]).map((m: any) => m.league).filter((league: any) => typeof league === 'string' && Boolean(league)) as string[];
      const uniqueLeagues: string[] = Array.from(new Set(leagueNames));
      setInterQuarterLeagues(uniqueLeagues);
      if (uniqueLeagues.length > 0 && !selectedInterQuarterLeague) {
        setSelectedInterQuarterLeague(uniqueLeagues[0]);
      }
      setLoadingInterQuarter(false);
    } else {
      setLoadingInterQuarter(true);
    }

    // Refresh in background
    try {
      const response = await matchesAPI.getMatches({ leagueType: 'inter-quarter' });
      if (response.success) {
        const sortedMatches = sortMatchesByRecent(response.data);
        setCacheData('matches_inter-quarter', sortedMatches);
        setInterQuarterMatches(sortedMatches);
        // Extract unique leagues
        const leagueNames = (sortedMatches as any[]).map((m: any) => m.league).filter((league: any) => typeof league === 'string' && Boolean(league)) as string[];
        const uniqueLeagues: string[] = Array.from(new Set(leagueNames));
        setInterQuarterLeagues(uniqueLeagues);
        if (uniqueLeagues.length > 0 && !selectedInterQuarterLeague) {
          setSelectedInterQuarterLeague(uniqueLeagues[0]);
        }
      }
    } catch (error: any) {
      if (!cachedData) {
        Alert.alert('Error', error.message || 'Failed to load inter-quarter matches');
      }
    } finally {
      setLoadingInterQuarter(false);
    }
  };

  const loadInterQuarterMatchesByLeague = async () => {
    if (!selectedInterQuarterLeague) return;
    
    const cacheKey = `matches_inter-quarter_${selectedInterQuarterLeague}`;
    const cachedData = getCacheData(cacheKey);
    
    if (cachedData) {
      const sortedMatches = sortMatchesByRecent(cachedData);
      setInterQuarterMatches(sortedMatches);
      setLoadingInterQuarter(false);
    } else {
      setLoadingInterQuarter(true);
    }

    // Refresh in background
    try {
      const response = await matchesAPI.getMatchesByLeague(selectedInterQuarterLeague, { leagueType: 'inter-quarter' });
      if (response.success) {
        const sortedMatches = sortMatchesByRecent(response.data);
        setCacheData(cacheKey, sortedMatches);
        setInterQuarterMatches(sortedMatches);
      }
    } catch (error: any) {
      if (!cachedData) {
        Alert.alert('Error', error.message || 'Failed to load inter-quarter matches');
      }
    } finally {
      setLoadingInterQuarter(false);
    }
  };

  const fetchInterQuarterMatches = loadInterQuarterMatches;
  const fetchInterQuarterMatchesByLeague = loadInterQuarterMatchesByLeague;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Local Leagues</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'local' && styles.activeTab]}
            onPress={() => setActiveTab('local')}
          >
            <Text style={[styles.tabText, activeTab === 'local' && styles.activeTabText]}>
              Local League
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'inter-quarter' && styles.activeTab]}
            onPress={() => setActiveTab('inter-quarter')}
          >
            <Text style={[styles.tabText, activeTab === 'inter-quarter' && styles.activeTabText]}>
              Inter-Quarter
            </Text>
          </TouchableOpacity>
        </View>

        {/* Local League Content */}
        {activeTab === 'local' && (
          <>
            {/* League Selection */}
        {loading && leagues.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading leagues...</Text>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select League</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.leaguesScroll}>
              {leagues.map((leagueName) => {
                const config = leagueConfig[leagueName] || { logo: '🏆', color: '#CD7F32', fullName: leagueName };
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

        {/* Matches */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedLeague ? (leagueConfig[selectedLeague]?.fullName || selectedLeague) : 'All'} - Today's Matches
          </Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Loading matches...</Text>
            </View>
          ) : filteredMatches.length > 0 ? (
            filteredMatches.map((match: any) => {
              const hasScore = match.homeScore !== null && match.awayScore !== null;
              const votingDisabled = isVotingDisabled(match);
              return (
                <View
                  key={match._id || match.id}
                  style={[
                    styles.matchCard,
                    votingDisabled && styles.matchCardDisabled
                  ]}
                >
                  <TouchableOpacity 
                    onPress={() => handleMatchPress(match)}
                    disabled={votingDisabled}
                    activeOpacity={votingDisabled ? 1 : 0.7}
                  >
                    <View style={styles.matchTeams}>
                      <View style={styles.team}>
                        <Image 
                          source={{ uri: getDirectImageUrl(match.homeLogo) || 'https://via.placeholder.com/40' }} 
                          style={styles.teamLogo} 
                        />
                        <Text style={styles.teamName}>{match.homeTeam}</Text>
                      </View>
                      <View style={styles.matchCenter}>
                        {votingDisabled && hasScore ? (
                          <Text style={styles.score}>{match.homeScore} - {match.awayScore}</Text>
                        ) : votingDisabled ? (
                          <Text style={styles.time}>Finished</Text>
                        ) : (
                          <Text style={styles.time}>{formatTime24Hour(match.matchTime)}</Text>
                        )}
                        {!votingDisabled && <Text style={styles.voteText}>Tap to vote</Text>}
                      </View>
                      <View style={styles.team}>
                        <Text style={styles.teamName}>{match.awayTeam}</Text>
                        <Image 
                          source={{ uri: getDirectImageUrl(match.awayLogo) || 'https://via.placeholder.com/40' }} 
                          style={styles.teamLogo} 
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

            {/* League Info */}
            {selectedLeague && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About {leagueConfig[selectedLeague]?.fullName || selectedLeague}</Text>
                <View style={styles.infoCard}>
                  <Text style={styles.infoText}>
                    {selectedLeague === 'Cameroon Elite One' && "The Cameroon Elite One is the top tier of Cameroonian football, featuring the best clubs from across the country competing for the national championship."}
                    {selectedLeague === 'Cameroon Elite Two' && "The Cameroon Elite Two is the second division of Cameroonian football, where clubs compete for promotion to the Elite One."}
                    {selectedLeague === 'Regional Championships' && "Regional Championships feature the best local clubs from different regions of Cameroon, showcasing grassroots football talent."}
                    {!['Cameroon Elite One', 'Cameroon Elite Two', 'Regional Championships'].includes(selectedLeague) && `Information about ${selectedLeague} will be available soon.`}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* Inter-Quarter League Content */}
        {activeTab === 'inter-quarter' && (
          <>
            {/* Inter-Quarter League Selection */}
          {loadingInterQuarter && interQuarterLeagues.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Loading inter-quarter leagues...</Text>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionSubtitle}>Select League</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.leaguesScroll}>
                {interQuarterLeagues.map((leagueName) => {
                  const config = leagueConfig[leagueName] || { logo: '🏆', color: '#8B5CF6', fullName: leagueName };
                  return (
                    <TouchableOpacity 
                      key={leagueName} 
                      style={[
                        styles.leagueCard, 
                        { backgroundColor: config.color },
                        selectedInterQuarterLeague === leagueName && styles.selectedLeague
                      ]}
                      onPress={() => setSelectedInterQuarterLeague(leagueName)}
                    >
                      <Text style={styles.leagueLogo}>{config.logo}</Text>
                      <Text style={styles.leagueName}>{leagueName}</Text>
                      {selectedInterQuarterLeague === leagueName && (
                        <Text style={styles.selectedIndicator}>✓</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Inter-Quarter Matches */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {selectedInterQuarterLeague ? (leagueConfig[selectedInterQuarterLeague]?.fullName || selectedInterQuarterLeague) : 'All'} - Today's Matches
            </Text>
            {loadingInterQuarter ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.loadingText}>Loading matches...</Text>
              </View>
            ) : interQuarterMatches.length > 0 ? (
              interQuarterMatches.map((match: any) => {
                const hasScore = match.homeScore !== null && match.awayScore !== null;
                const votingDisabled = isVotingDisabled(match);
                return (
                  <View
                    key={match._id || match.id}
                    style={[
                      styles.matchCard,
                      votingDisabled && styles.matchCardDisabled
                    ]}
                  >
                    <TouchableOpacity 
                      onPress={() => handleMatchPress(match)}
                      disabled={votingDisabled}
                      activeOpacity={votingDisabled ? 1 : 0.7}
                    >
                      <View style={styles.matchTeams}>
                        <View style={styles.team}>
                          <Image 
                            source={{ uri: getDirectImageUrl(match.homeLogo) || 'https://via.placeholder.com/40' }} 
                            style={styles.teamLogo} 
                          />
                          <Text style={styles.teamName}>{match.homeTeam}</Text>
                        </View>
                        <View style={styles.matchCenter}>
                          {votingDisabled && hasScore ? (
                            <Text style={styles.score}>{match.homeScore} - {match.awayScore}</Text>
                          ) : votingDisabled ? (
                            <Text style={styles.time}>Finished</Text>
                          ) : (
                            <Text style={styles.time}>{formatTime24Hour(match.matchTime)}</Text>
                          )}
                          {!votingDisabled && <Text style={styles.voteText}>Tap to vote</Text>}
                        </View>
                        <View style={styles.team}>
                          <Text style={styles.teamName}>{match.awayTeam}</Text>
                          <Image 
                            source={{ uri: getDirectImageUrl(match.awayLogo) || 'https://via.placeholder.com/40' }} 
                            style={styles.teamLogo} 
                          />
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No inter-quarter matches available</Text>
              </View>
            )}
          </View>
          </>
        )}
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
  },
  headerTitle: {
    fontSize: 24,
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
    width: 100,
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
    textAlign: 'center',
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
  },
  team: {
    flex: 1,
    alignItems: 'center',
  },
  teamLogo: {
    width: 30,
    height: 30,
    borderRadius: 15,
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
    fontFamily: fonts.bodyMedium,
    color: '#3B82F6',
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 15,
  },
  infoText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    lineHeight: 20,
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
  divider: {
    height: 1,
    backgroundColor: '#2D3748',
    marginVertical: 20,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontFamily: fonts.bodyMedium,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#2D3748',
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 3,
    gap: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontSize: 12,
    fontFamily: fonts.bodyMedium,
    color: '#9CA3AF',
    letterSpacing: 0.2,
  },
  activeTabText: {
    color: '#FFFFFF',
    fontFamily: fonts.bodySemiBold,
  },
});

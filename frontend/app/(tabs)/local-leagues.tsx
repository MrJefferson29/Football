import VotingModal from '@/components/VotingModal';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { matchesAPI } from '@/utils/api';
import { getDirectImageUrl } from '@/utils/imageUtils';
import { fonts } from '@/utils/typography';

export default function LocalLeaguesScreen() {
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [showVotingModal, setShowVotingModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [leagues, setLeagues] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const leagueConfig: { [key: string]: { logo: string; color: string; fullName: string } } = {
    'Cameroon Elite One': { logo: '🇨🇲', color: '#FFD700', fullName: 'Cameroon Elite One' },
    'Cameroon Elite Two': { logo: '🥈', color: '#C0C0C0', fullName: 'Cameroon Elite Two' },
    'Regional Championships': { logo: '🏆', color: '#CD7F32', fullName: 'Regional Championships' },
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  useEffect(() => {
    if (selectedLeague) {
      fetchMatchesByLeague();
    } else {
      fetchMatches();
    }
  }, [selectedLeague]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const response = await matchesAPI.getMatches({ leagueType: 'local' });
      if (response.success) {
        setMatches(response.data);
        // Extract unique leagues
        const uniqueLeagues = [...new Set(response.data.map((m: any) => m.league))].filter(Boolean);
        setLeagues(uniqueLeagues);
        if (uniqueLeagues.length > 0 && !selectedLeague) {
          setSelectedLeague(uniqueLeagues[0] as string);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchesByLeague = async () => {
    if (!selectedLeague) return;
    try {
      setLoading(true);
      const response = await matchesAPI.getMatchesByLeague(selectedLeague, { leagueType: 'local' });
      if (response.success) {
        setMatches(response.data);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const filteredMatches = matches;

  const handleMatchPress = (match: any) => {
    setSelectedMatch({
      ...match,
      id: match._id || match.id,
      time: match.matchTime,
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
          await fetchMatchesByLeague();
        } else {
          await fetchMatches();
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Local Leagues</Text>
        </View>

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
            filteredMatches.map((match: any) => (
              <TouchableOpacity 
                key={match._id || match.id} 
                style={styles.matchCard}
                onPress={() => handleMatchPress(match)}
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
                    <Text style={styles.time}>{match.matchTime}</Text>
                    <Text style={styles.voteText}>Tap to vote</Text>
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
            ))
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
});

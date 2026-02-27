import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VotingModal from '@/components/VotingModal';
import { matchesAPI } from '@/utils/api';
import { getDirectImageUrl } from '@/utils/imageUtils';
import { fonts } from '@/utils/typography';

export default function AllMatchesScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showVotingModal, setShowVotingModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [allMatches, setAllMatches] = useState<any[]>([]);

  useEffect(() => {
    fetchMatches();
  }, []);

  // Helper function to check if a match is scheduled for today
  const isMatchToday = (match: any): boolean => {
    if (!match.matchDate) {
      return false;
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

      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const matchDateStr = `${matchDateObj.getFullYear()}-${String(matchDateObj.getMonth() + 1).padStart(2, '0')}-${String(matchDateObj.getDate()).padStart(2, '0')}`;

      return matchDateStr === todayStr;
    } catch (error) {
      console.error('Error checking match date:', error);
      return false;
    }
  };

  // Helper function to check if a match is finished
  const isMatchFinished = (match: any): boolean => {
    return match.status === 'finished' || 
           (match.homeScore !== null && match.homeScore !== undefined && 
            match.awayScore !== null && match.awayScore !== undefined);
  };

  const fetchMatches = async () => {
    try {
      setLoading(true);
      // Fetch only today's matches
      const response = await matchesAPI.getTodayMatches();
      if (response.success) {
        // Filter to ensure only today's matches are shown (safety check)
        const todayMatches = response.data.filter((match: any) => isMatchToday(match));
        setAllMatches(todayMatches);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const handleMatchVote = async (matchId: string) => {
    const match = allMatches.find((m: any) => m._id === matchId || m.id === matchId);
    if (match) {
      setSelectedMatch({
        ...match,
        id: match._id || match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        time: match.matchTime,
        league: match.league || 'Other',
        homeLogo: match.homeLogo,
        awayLogo: match.awayLogo
      });
      setShowVotingModal(true);
    }
  };

  const handleVote = async (matchId: string, prediction: 'home' | 'draw' | 'away', homeScore?: number, awayScore?: number) => {
    try {
      setIsLoading(true);
      const response = await matchesAPI.voteMatch(matchId, prediction, homeScore, awayScore);
      if (response.success) {
        Alert.alert('Vote Recorded!', 'Your prediction has been recorded successfully.');
        setShowVotingModal(false);
        setSelectedMatch(null);
        await fetchMatches(); // Refresh matches
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Matches</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading matches...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {allMatches.length > 0 ? (
            allMatches.map((match: any) => {
              const isFinished = isMatchFinished(match);
              const hasScore = match.homeScore !== null && match.homeScore !== undefined && 
                              match.awayScore !== null && match.awayScore !== undefined;
              
              return (
                <TouchableOpacity 
                  key={match._id || match.id} 
                  style={[
                    styles.matchCard,
                    isFinished && styles.matchCardFinished
                  ]}
                  onPress={() => !isFinished && handleMatchVote(match._id || match.id)}
                  disabled={isFinished}
                >
                  <View style={styles.matchHeader}>
                    <Text style={styles.leagueName}>{match.league || 'Other'}</Text>
                    <View style={styles.matchTimeContainer}>
                      {isFinished ? (
                        <View style={styles.finishedBadge}>
                          <Text style={styles.finishedText}>Finished</Text>
                        </View>
                      ) : (
                        <Text style={styles.matchTime}>{match.matchTime}</Text>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.matchTeams}>
                    <View style={styles.teamContainer}>
                      <Image 
                        source={{ uri: getDirectImageUrl(match.homeLogo) || 'https://via.placeholder.com/40' }} 
                        style={styles.teamLogo}
                        onError={(e) => {
                          console.log('Image load error:', match.homeLogo);
                        }}
                      />
                      <Text style={styles.teamName}>{match.homeTeam}</Text>
                    </View>
                    
                    <View style={styles.vsContainer}>
                      {hasScore ? (
                        <Text style={styles.scoreText}>
                          {match.homeScore} - {match.awayScore}
                        </Text>
                      ) : (
                        <>
                          <Text style={styles.vsText}>VS</Text>
                          {!isFinished && <Text style={styles.voteText}>Tap to vote</Text>}
                        </>
                      )}
                    </View>
                    
                    <View style={styles.teamContainer}>
                      <Text style={styles.teamName}>{match.awayTeam}</Text>
                      <Image 
                        source={{ uri: getDirectImageUrl(match.awayLogo) || 'https://via.placeholder.com/40' }} 
                        style={styles.teamLogo}
                        onError={(e) => {
                          console.log('Image load error:', match.awayLogo);
                        }}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No matches scheduled for today</Text>
            </View>
          )}
        </ScrollView>
      )}

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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  matchCard: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
  },
  matchCardFinished: {
    backgroundColor: '#2D2A2A',
    borderWidth: 1,
    borderColor: '#4A2E2E',
    opacity: 0.8,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  leagueName: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: '#3B82F6',
  },
  matchTimeContainer: {
    alignItems: 'flex-end',
  },
  matchTime: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#9CA3AF',
  },
  finishedBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  finishedText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  scoreText: {
    fontSize: 18,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  matchTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  teamName: {
    fontSize: 12,
    fontFamily: fonts.bodyMedium,
    color: '#FFFFFF',
    marginHorizontal: 10,
  },
  teamLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  vsContainer: {
    alignItems: 'center',
    marginHorizontal: 15,
  },
  vsText: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  voteText: {
    fontSize: 10,
    fontFamily: fonts.body,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontFamily: fonts.body,
    color: '#9CA3AF',
    fontSize: 16,
  },
});

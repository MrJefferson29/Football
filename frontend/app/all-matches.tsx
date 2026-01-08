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

  const fetchMatches = async () => {
    try {
      setLoading(true);
      // Fetch all matches (not just today's)
      const response = await matchesAPI.getMatches();
      if (response.success) {
        setAllMatches(response.data);
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
            allMatches.map((match: any) => (
              <TouchableOpacity 
                key={match._id || match.id} 
                style={styles.matchCard}
                onPress={() => handleMatchVote(match._id || match.id)}
              >
                <View style={styles.matchHeader}>
                  <Text style={styles.leagueName}>{match.league || 'Other'}</Text>
                  <Text style={styles.matchTime}>{match.matchTime}</Text>
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
                    <Text style={styles.vsText}>VS</Text>
                    <Text style={styles.voteText}>Tap to vote</Text>
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
            ))
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
  matchTime: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#9CA3AF',
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

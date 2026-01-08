"use client"

import VotingModal from "@/components/VotingModal"
import YouTubeVideoCard from "@/components/YouTubeVideoCard"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { useEffect, useState, useRef } from "react"
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ToastAndroid, Easing, Animated, useWindowDimensions } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { homeAPI, pollsAPI, matchesAPI, preloadAPI } from "@/utils/api"
import { getDirectImageUrl } from "@/utils/imageUtils"
import { fonts } from "@/utils/typography"
import { LinearGradient } from "expo-linear-gradient"
import { useAuth } from "@/contexts/AuthContext"

export default function HomeScreen() {
  const { user } = useAuth()
  const [homeData, setHomeData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [messiVotes, setMessiVotes] = useState(50)
  const [ronaldoVotes, setRonaldoVotes] = useState(50)
  const [clubMessiVotes, setClubMessiVotes] = useState(50)
  const [clubRonaldoVotes, setClubRonaldoVotes] = useState(50)
  const [homeGoals, setHomeGoals] = useState("")
  const [awayGoals, setAwayGoals] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPredictionSuccess, setShowPredictionSuccess] = useState(false)
  const [showVotingModal, setShowVotingModal] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<any>(null)

  // Fetch all home data and preload all API routes on mount
  useEffect(() => {
    fetchHomeData()
    // Preload all API endpoints in the background
    preloadAPI.preloadAll().then((results) => {
      console.log('API preload completed:', Object.keys(results).length, 'endpoints loaded');
    }).catch((error) => {
      console.warn('API preload error:', error);
    })
  }, [])

  const fetchHomeData = async () => {
    try {
      setLoading(true)
      const response = await homeAPI.getHomeData()
      if (response.success) {
        setHomeData(response.data)
        
        // Update poll votes
        if (response.data.polls.goatCompetition) {
          setMessiVotes(response.data.polls.goatCompetition.option1.percentage)
          setRonaldoVotes(response.data.polls.goatCompetition.option2.percentage)
        }
        if (response.data.polls.clubBattle) {
          setClubMessiVotes(response.data.polls.clubBattle.option1.percentage)
          setClubRonaldoVotes(response.data.polls.clubBattle.option2.percentage)
        }
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  const leadersData = [
    {
      rank: 1,
      name: "Alex Johnson",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      accuracy: 94,
      points: 2847,
    },
    {
      rank: 2,
      name: "Sarah Wilson",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      accuracy: 92,
      points: 2653,
    },
    {
      rank: 3,
      name: "Mike Chen",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      accuracy: 90,
      points: 2489,
    },
    {
      rank: 4,
      name: "Emma Davis",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
      accuracy: 88,
      points: 2312,
    },
    {
      rank: 5,
      name: "David Brown",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
      accuracy: 87,
      points: 2156,
    },
    {
      rank: 6,
      name: "Lisa Garcia",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
      accuracy: 85,
      points: 1987,
    },
  ]

  const todayMatches = homeData?.todayMatches || []
  const youtubeVideos = homeData?.highlights || []
  const highlightCategories: string[] = ["All", ...Array.from(new Set((youtubeVideos || []).map((h: any) => h.category).filter((c: any) => c))).map((c) => String(c))]
  const [selectedHighlightCategory, setSelectedHighlightCategory] = useState<string>("All")
  const filteredHighlights = (youtubeVideos || []).filter((video: any) =>
    selectedHighlightCategory === "All" ? true : (video.category || "").toLowerCase() === selectedHighlightCategory.toLowerCase()
  )
  const limitedHighlights = filteredHighlights.slice(0, 2)
  const announcementText = 
  ". Yamal told ‘real hurdle’ he must clear to emulate Messi & CR7. Yamal told ‘real hurdle’ he must clear to emulate Messi & CR7";
const MarqueeComponent = ({ text }: { text: string }) => {
  const { width: screenWidth } = useWindowDimensions()
  const scrollX = useRef(new Animated.Value(0)).current
  const [contentWidth, setContentWidth] = useState(screenWidth)
  const spacer = "   •   "
  const fullText = `${text}${spacer}`

  useEffect(() => {
    if (!contentWidth) return
    const distance = contentWidth
    const duration = Math.max(12000, distance * 20)
    const loop = Animated.loop(
      Animated.timing(scrollX, {
        toValue: -distance,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    )
    scrollX.setValue(0)
    loop.start()
    return () => loop.stop()
  }, [contentWidth, scrollX])

  return (
    <View style={styles.marqueeContainer}>
      <LinearGradient
        colors={['#7C3AED', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.marqueeBackground}
      >
        <View style={styles.marqueeMask}>
          <Animated.View
            style={{
              flexDirection: 'row',
              transform: [{ translateX: scrollX }],
            }}
          >
            <View
              style={styles.marqueeRow}
              onLayout={(e) => setContentWidth(e.nativeEvent.layout.width)}
            >
              <Text style={styles.marqueeText} numberOfLines={1}>
                {fullText}
              </Text>
              <Text style={styles.marqueeText} numberOfLines={1}>
                {fullText}
              </Text>
            </View>
          </Animated.View>
        </View>
      </LinearGradient>
    </View>
  )
}

  const handlePollVote = async (pollId: string, choice: "option1" | "option2") => {
    try {
      setIsLoading(true)
      const response = await pollsAPI.votePoll(pollId, choice)
      if (response.success) {
        await fetchHomeData() // Refresh data
        Alert.alert("Success", "Your vote has been recorded!")
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to vote")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClubVote = async (pollId: string, choice: "option1" | "option2") => {
    try {
      setIsLoading(true)
      const response = await pollsAPI.votePoll(pollId, choice)
      if (response.success) {
        await fetchHomeData() // Refresh data
        Alert.alert("Success", "Your vote has been recorded!")
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to vote")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrediction = async (pollId: string) => {
    if (!homeGoals || !awayGoals) {
      Alert.alert("Error", "Please enter both scores!")
      return
    }

    const homeScore = parseInt(homeGoals)
    const awayScore = parseInt(awayGoals)

    if (isNaN(homeScore) || isNaN(awayScore)) {
      Alert.alert("Error", "Please enter valid numbers for both scores!")
      return
    }

    try {
      setIsLoading(true)
      // Determine which option to vote for based on scores
      // The backend will also do this, but we can determine it here for better UX
      const choice = homeScore > awayScore ? "option1" : homeScore < awayScore ? "option2" : "option1"
      
      const response = await pollsAPI.votePoll(pollId, choice, homeScore, awayScore)
      if (response.success) {
        setShowPredictionSuccess(true)
        await fetchHomeData()
        setTimeout(() => {
          setShowPredictionSuccess(false)
          setHomeGoals("")
          setAwayGoals("")
        }, 3000)
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit prediction")
    } finally {
      setIsLoading(false)
    }
  }

  const handleMatchVote = async (matchId: string) => {
    const match = todayMatches.find((m: any) => (m._id || m.id) === matchId)
    if (match) {
      setSelectedMatch({
        ...match,
        id: match._id || match.id,
        _id: match._id || match.id
      })
      setShowVotingModal(true)
    }
  }

  const handleVote = async (matchId: string, prediction: 'home' | 'draw' | 'away', homeScore?: number, awayScore?: number) => {
    try {
      setIsLoading(true)
      const response = await matchesAPI.voteMatch(matchId, prediction, homeScore, awayScore)
      if (response.success) {
        await fetchHomeData() // Refresh data
        Alert.alert("Success", "Your vote has been recorded!")
        setShowVotingModal(false)
        setSelectedMatch(null)
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to vote")
    } finally {
      setIsLoading(false)
    }
  }

  const closeVotingModal = () => {
    setShowVotingModal(false)
    setSelectedMatch(null)
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    )
  }

  const dailyPoll = homeData?.polls?.dailyPoll
  const clubBattle = homeData?.polls?.clubBattle
  const goatCompetition = homeData?.polls?.goatCompetition

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.profileSection}
              onPress={() => router.push("/profile")}
            >
              <Image
                source={{
                  uri: user?.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
                }}
                style={styles.profileAvatar}
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Gamefy</Text>
            <View style={styles.headerSpacer} />
            <TouchableOpacity style={styles.cartButton} onPress={() => router.push("/shop")}>
              <Ionicons name="cart-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
        <MarqueeComponent text={announcementText} />

        {/* Daily News Poll */}
        {dailyPoll && (
          <View style={styles.section}>
            <View style={styles.pollCard}>
              <Text style={styles.pollQuestion}>{dailyPoll.question}</Text>
              <View style={styles.teamsContainer}>
                <View style={styles.team}>
                  <Image
                    source={{ uri: getDirectImageUrl(dailyPoll.option1.image) || "https://logos-world.net/wp-content/uploads/2020/06/Barcelona-Logo.png" }}
                    style={styles.teamLogo}
                    onError={(e) => {
                      console.log('Image load error:', dailyPoll.option1.image);
                    }}
                  />
                  <Text style={styles.teamName}>{dailyPoll.option1.name}</Text>
                </View>
                <Text style={styles.vsText}>VS</Text>
                <View style={styles.team}>
                  <Image
                    source={{ uri: getDirectImageUrl(dailyPoll.option2.image) || "https://logos-world.net/wp-content/uploads/2020/06/Real-Madrid-Logo.png" }}
                    style={styles.teamLogo}
                    onError={(e) => {
                      console.log('Image load error:', dailyPoll.option2.image);
                    }}
                  />
                  <Text style={styles.teamName}>{dailyPoll.option2.name}</Text>
                </View>
              </View>

              {/* Vote Statistics */}
              <View style={styles.voteStatsContainer}>
                <Text style={styles.voteStatsTitle}>Community Predictions</Text>
                <View style={styles.voteStatsGrid}>
                  <View style={styles.voteStatItem}>
                    <Text style={styles.voteStatPercentage}>{dailyPoll.option1.percentage}%</Text>
                    <Text style={styles.voteStatLabel}>{dailyPoll.option1.name} will win</Text>
                  </View>
                  <View style={styles.voteStatItem}>
                    <Text style={styles.voteStatPercentage}>{dailyPoll.option2.percentage}%</Text>
                    <Text style={styles.voteStatLabel}>{dailyPoll.option2.name} will win</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.viewAllStatsButton} onPress={() => router.push({
                  pathname: "/poll-results",
                  params: { id: dailyPoll._id || dailyPoll.id }
                })}>
                  <Text style={styles.viewAllStatsText}>View All Statistics</Text>
                </TouchableOpacity>
              </View>

              {/* Goal Prediction */}
              <View style={styles.goalPredictionContainer}>
                <Text style={styles.goalPredictionTitle}>Predict the Score</Text>
                <View style={styles.goalInputContainer}>
                  <TextInput
                    style={styles.goalInput}
                    placeholder="2"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    maxLength={2}
                    value={homeGoals}
                    onChangeText={setHomeGoals}
                  />
                  <Text style={styles.goalSeparator}>-</Text>
                  <TextInput
                    style={styles.goalInput}
                    placeholder="1"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    maxLength={2}
                    value={awayGoals}
                    onChangeText={setAwayGoals}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.voteButton, isLoading && styles.loadingButton, { marginTop: 10, width: '100%', alignItems: 'center' }]}
                onPress={() => handlePrediction(dailyPoll.id)}
                disabled={isLoading}
              >
                <Text style={styles.voteButtonText}>Submit Prediction</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Today's Matches */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Matches</Text>
            <TouchableOpacity onPress={() => router.push("/all-matches")}>
              <Text style={styles.seeAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.matchesCard}>
            {todayMatches.length > 0 ? (
              todayMatches.map((match: any) => (
                <TouchableOpacity key={match._id || match.id} style={styles.matchRow} onPress={() => handleMatchVote(match._id || match.id)}>
                  <View style={styles.matchTeam}>
                    <Image 
                      source={{ uri: getDirectImageUrl(match.homeLogo) || "https://via.placeholder.com/40" }} 
                      style={styles.matchTeamLogo}
                      onError={(e) => {
                        console.log('Image load error:', match.homeLogo);
                      }}
                    />
                    <Text style={styles.matchTeamName}>{match.homeTeam}</Text>
                  </View>
                  <View style={styles.matchCenter}>
                    <Text style={styles.matchTime}>{match.matchTime}</Text>
                    <Text style={styles.voteText}>Tap to vote</Text>
                  </View>
                  <View style={styles.matchTeam}>
                    <Text style={styles.matchTeamName}>{match.awayTeam}</Text>
                    <Image 
                      source={{ uri: getDirectImageUrl(match.awayLogo) || "https://via.placeholder.com/40" }} 
                      style={styles.matchTeamLogo}
                      onError={(e) => {
                        console.log('Image load error:', match.awayLogo);
                      }}
                    />
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noDataText}>No matches scheduled for today</Text>
            )}
          </View>
        </View>

        {/* Club Battle */}
        {clubBattle && (
          <View style={styles.section}>
            <View style={styles.battleCard}>
              <Text style={styles.battleQuestion}>{clubBattle.question}</Text>
              <View style={styles.clubsContainer}>
                <View style={styles.club}>
                  <Image
                    source={{ uri: getDirectImageUrl(clubBattle.option1.image) || "https://logos-world.net/wp-content/uploads/2020/06/Barcelona-Logo.png" }}
                    style={styles.clubLogo}
                    onError={(e) => {
                      console.log('Image load error:', clubBattle.option1.image);
                    }}
                  />
                  <Text style={styles.clubName}>{clubBattle.option1.name}</Text>
                  <TouchableOpacity 
                    style={styles.clubVoteButton} 
                    onPress={() => handleClubVote(clubBattle.id, "option1")}
                    disabled={isLoading}
                  >
                    <Text style={styles.clubVoteButtonText}>Vote</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.vsText}>VS</Text>
                <View style={styles.club}>
                  <Image
                    source={{ uri: getDirectImageUrl(clubBattle.option2.image) || "https://logos-world.net/wp-content/uploads/2020/06/Real-Madrid-Logo.png" }}
                    style={styles.clubLogo}
                    onError={(e) => {
                      console.log('Image load error:', clubBattle.option2.image);
                    }}
                  />
                  <Text style={styles.clubName}>{clubBattle.option2.name}</Text>
                  <TouchableOpacity 
                    style={styles.clubVoteButton} 
                    onPress={() => handleClubVote(clubBattle.id, "option2")}
                    disabled={isLoading}
                  >
                    <Text style={styles.clubVoteButtonText}>Vote</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${clubMessiVotes}%` }]} />
                </View>
                <View style={styles.percentagesContainer}>
                  <Text style={styles.percentage}>{clubMessiVotes}%</Text>
                  <Text style={styles.percentage}>{clubRonaldoVotes}%</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.statisticsButton} onPress={() => router.push("/club-battle-stats")}>
                <Text style={styles.statisticsButtonText}>See Statistics</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* goat competition */}
        {goatCompetition && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{goatCompetition.question}</Text>
            <View style={styles.battleCard}>
              <View style={styles.clubsContainer}>
                <View style={styles.club}>
                  <Image
                    source={{
                      uri: getDirectImageUrl(goatCompetition.option1.image) || "https://news.artnet.com/app/news-upload/2022/12/Lionel-Messi-2022-World-Cup-GettyImages-1245739377-scaled.jpg",
                    }}
                    style={styles.clubLogo}
                    onError={(e) => {
                      console.log('Image load error:', goatCompetition.option1.image);
                    }}
                  />
                  <Text style={styles.clubName}>{goatCompetition.option1.name}</Text>
                  <TouchableOpacity 
                    style={styles.clubVoteButton} 
                    onPress={() => handlePollVote(goatCompetition.id, "option1")}
                    disabled={isLoading}
                  >
                    <Text style={styles.clubVoteButtonText}>Vote</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.vsText}>VS</Text>
                <View style={styles.club}>
                  <Image
                    source={{ uri: getDirectImageUrl(goatCompetition.option2.image) || "https://tse1.mm.bing.net/th/id/OIP.JZRYTbBOmfoz6e0yvtAmcgHaE8?pid=Api&P=0&h=180" }}
                    style={styles.clubLogo}
                    onError={(e) => {
                      console.log('Image load error:', goatCompetition.option2.image);
                    }}
                  />
                  <Text style={styles.clubName}>{goatCompetition.option2.name}</Text>
                  <TouchableOpacity 
                    style={styles.clubVoteButton} 
                    onPress={() => handlePollVote(goatCompetition.id, "option2")}
                    disabled={isLoading}
                  >
                    <Text style={styles.clubVoteButtonText}>Vote</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${messiVotes}%` }]} />
                </View>
                <View style={styles.percentagesContainer}>
                  <Text style={styles.percentage}>{messiVotes}%</Text>
                  <Text style={styles.percentage}>{ronaldoVotes}%</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.statisticsButton} onPress={() => router.push("/goat-competition")}>
                <Text style={styles.statisticsButtonText}>See Statistics</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* YouTube Videos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Football Highlights</Text>
            <TouchableOpacity onPress={() => router.push("/highlights")}>
              <Text style={styles.seeAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {/* Category Filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChips}
          >
            {highlightCategories.map((cat: string) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.chip,
                  selectedHighlightCategory === cat && styles.chipActive,
                ]}
                onPress={() => setSelectedHighlightCategory(cat)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedHighlightCategory === cat && styles.chipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {limitedHighlights.length > 0 ? (
            limitedHighlights.map((video: any, idx: number) => {
              // Extract video ID from YouTube URL if needed
              const videoId = video.youtubeUrl?.includes('youtube.com/watch?v=') 
                ? video.youtubeUrl.split('v=')[1]?.split('&')[0] 
                : video.youtubeUrl?.includes('youtu.be/')
                ? video.youtubeUrl.split('youtu.be/')[1]?.split('?')[0]
                : video.youtubeUrl?.includes('youtube.com/live/')
                ? video.youtubeUrl.split('youtube.com/live/')[1]?.split('?')[0]
                : video.youtubeUrl?.includes('youtube.com/embed/')
                ? video.youtubeUrl.split('embed/')[1]?.split('?')[0]
                : video.youtubeUrl?.includes('youtube.com/shorts/')
                ? video.youtubeUrl.split('shorts/')[1]?.split('?')[0]
                : video.id || video._id
              
              return (
                <YouTubeVideoCard
                  id={video.id || video._id}
                  key={video.id || video._id || idx}
                  videoId={videoId}
                  title={video.title}
                  thumbnail={video.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                  duration={video.duration || "0:00"}
                  views={video.views ? String(video.views) : "0 views"}
                  youtubeUrl={video.youtubeUrl}
                />
              )
            })
          ) : (
            <Text style={styles.noDataText}>No highlights available</Text>
          )}
        </View>

        {/* Quick Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Links</Text>
          <View style={styles.linksGrid}>
            <TouchableOpacity style={styles.linkCard} onPress={() => router.push("/trending")}>
              <View style={styles.linkIconContainer}>
                <Ionicons name="trending-up" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.linkTitle}>Trending</Text>
              <Text style={styles.linkDescription}>Latest highlights & viral moments</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkCard} onPress={() => router.push("/news")}>
              <View style={styles.linkIconContainer}>
                <Ionicons name="newspaper" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.linkTitle}>News</Text>
              <Text style={styles.linkDescription}>Breaking football news</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkCard} onPress={() => router.push("/statistics")}>
              <View style={styles.linkIconContainer}>
                <Ionicons name="stats-chart" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.linkTitle}>Statistics</Text>
              <Text style={styles.linkDescription}>App-wide stats & analytics</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Leaders Board Carousel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏆 Prediction Leaders</Text>
          <View style={styles.carouselContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.carousel}
              contentContainerStyle={styles.carouselContent}
            >
              {leadersData.map((leader, index) => (
                <View key={index} style={styles.leaderCard}>
                  <View style={styles.leaderRank}>
                    <Text style={styles.rankNumber}>#{leader.rank}</Text>
                  </View>
                  <Image source={{ uri: leader.avatar }} style={styles.leaderAvatar} />
                  <Text style={styles.leaderName}>{leader.name}</Text>
                  <Text style={styles.leaderStats}>{leader.accuracy}% accuracy</Text>
                  <Text style={styles.leaderPoints}>{leader.points} pts</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Prediction Forum Box */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.forumBox}
            onPress={() => router.push("/prediction-forums")}
          >
            <View style={styles.forumContent}>
              <View style={styles.forumIcon}>
                <Text style={styles.forumEmoji}>💬</Text>
              </View>
              <View style={styles.forumTextContainer}>
                <Text style={styles.forumTitle}>Join Prediction Forums</Text>
                <Text style={styles.forumDescription}>
                  Connect with expert predictors, share insights, and get exclusive match analysis
                </Text>
                <View style={styles.forumFeatures}>
                  <Text style={styles.forumFeature}>• Expert Analysis</Text>
                  <Text style={styles.forumFeature}>• Live Discussions</Text>
                  <Text style={styles.forumFeature}>• Premium Insights</Text>
                </View>
              </View>
              <View style={styles.forumArrow}>
                <Text style={styles.arrowText}>→</Text>
              </View>
            </View>
            <View style={styles.forumFooter}>
              <Text style={styles.forumPrice}>Starting from $9.99/month</Text>
            </View>
          </TouchableOpacity>
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
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A202C",
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 80, // Add padding for the tab bar
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cartButton: {
    padding: 5,
  },
  profileSection: {
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerSpacer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20, // Reduced from 24 to 20
    fontFamily: fonts.heading,
    color: "#4084f2",
    flex: 2,
    textAlign: "center",
    justifyContent: "center",
    alignItems: "center",
  },
  marqueeContainer: {
    marginBottom: 16,
    marginHorizontal: 0,
    height: 40,
    width: '100%',
  },
  marqueeBackground: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  marqueeMask: {
    height: 24,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  marqueeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  marqueeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    paddingVertical: 4,
    paddingRight: 20,
  },
  filterChips: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#3B82F6",
    marginRight: 8,
    backgroundColor: "transparent",
  },
  chipActive: {
    backgroundColor: "#3B82F6",
  },
  chipText: {
    fontSize: 13,
    fontFamily: fonts.bodyMedium,
    color: "#3B82F6",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  section: {
    paddingHorizontal: 7,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: "#FFFFFF",
    marginBottom: 15,
  },
  pollCard: {
    backgroundColor: "#0c1322",
    borderRadius: 12,
    padding: 8, // Further reduced from 12 to 8
    alignItems: "center",
  },
  pollQuestion: {
    fontSize: 16, // Further reduced from 18 to 16
    fontFamily: fonts.heading,
    color: "#FFFFFF",
    marginBottom: 10, // Further reduced from 15 to 10
  },
  teamsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 8, // Further reduced from 12 to 8
  },
  team: {
    alignItems: "center",
    flex: 1,
  },
  teamName: {
    fontSize: 12, // Further reduced from 14 to 12
    fontFamily: fonts.bodyMedium,
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 4, // Further reduced from 6 to 4
  },
  teamLogo: {
    width: 28, // Further reduced from 36 to 28
    height: 28, // Further reduced from 36 to 28
    borderRadius: 14, // Further reduced from 18 to 14
    marginBottom: 4, // Further reduced from 6 to 4
  },
  vsText: {
    fontSize: 14, // Further reduced from 16 to 14
    fontFamily: fonts.bodySemiBold,
    color: "#FFFFFF",
    marginHorizontal: 12, // Further reduced from 15 to 12
  },
  voteButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 8, // Further reduced from 10 to 8
    paddingVertical: 8, // Further reduced from 10 to 8
    paddingHorizontal: 20, // Further reduced from 24 to 20
  },
  voteButtonText: {
    fontSize: 12, // Further reduced from 14 to 12
    fontFamily: fonts.bodySemiBold,
    color: "#FFFFFF",
  },
  matchesCard: {
    backgroundColor: "#0c1322",
    borderRadius: 12,
    padding: 15,
  },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#4A5568",
  },
  matchTeam: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  matchTeamName: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: "#FFFFFF",
  },
  matchTeamLogo: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
  },
  matchTime: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: "#9CA3AF",
  },
  battleCard: {
    backgroundColor: "#0c1322",
    borderRadius: 12,
    padding: 20,
  },
  battleQuestion: {
    fontSize: 16,
    fontFamily: fonts.heading,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 20,
  },
  clubsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  club: {
    alignItems: "center",
    flex: 1,
  },
  clubLogo: {
    width: 60,
    height: 60,
    marginBottom: 10,
    borderRadius: 30,
  },
  clubName: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: "#FFFFFF",
    marginBottom: 10,
    textAlign: "center",
  },
  clubVoteButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  clubVoteButtonText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: "#FFFFFF",
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#4A5568",
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 4,
  },
  percentagesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  percentage: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: "#FFFFFF",
  },
  statisticsButton: {
    backgroundColor: "#1A202C",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "#3B82F6",
    marginTop: 10,
  },
  statisticsButtonText: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: "#3B82F6",
  },
  goalPredictionContainer: {
    marginVertical: 12, // Reduced from 20 to 12
    alignItems: "center",
  },
  goalPredictionTitle: {
    fontSize: 14, // Reduced from 16 to 14
    fontFamily: fonts.bodyMedium,
    color: "#FFFFFF",
    marginBottom: 8, // Reduced from 10 to 8
  },
  goalInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  goalInput: {
    backgroundColor: "#4A5568",
    borderRadius: 6, // Reduced from 8 to 6
    paddingHorizontal: 12, // Reduced from 15 to 12
    paddingVertical: 8, // Reduced from 10 to 8
    fontSize: 16, // Reduced from 18 to 16
    fontFamily: fonts.bodySemiBold,
    color: "#FFFFFF",
    textAlign: "center",
    width: 50, // Reduced from 60 to 50
    marginHorizontal: 4, // Reduced from 5 to 4
  },
  goalSeparator: {
    fontSize: 16, // Reduced from 20 to 16
    fontFamily: fonts.bodySemiBold,
    color: "#FFFFFF",
    marginHorizontal: 8, // Reduced from 10 to 8
  },
  loadingButton: {
    backgroundColor: "#4A5568",
    opacity: 0.7,
  },
  matchCenter: {
    alignItems: "center",
    minWidth: 80,
  },
  voteText: {
    fontSize: 10,
    fontFamily: fonts.body,
    color: "#3B82F6",
    marginTop: 2,
  },
  voteStatsContainer: {
    marginVertical: 15, // Reduced from 25 to 15
    width: "100%",
  },
  voteStatsTitle: {
    fontSize: 14, // Reduced from 18 to 14
    fontFamily: fonts.bodySemiBold,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 10, // Reduced from 15 to 10
  },
  voteStatsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10, // Reduced from 15 to 10
  },
  voteStatItem: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#4A5568",
    borderRadius: 8, // Reduced from 12 to 8
    padding: 8, // Reduced from 12 to 8
    marginHorizontal: 3, // Reduced from 4 to 3
  },
  voteStatPercentage: {
    fontSize: 16, // Reduced from 20 to 16
    fontFamily: fonts.bodySemiBold,
    color: "#3B82F6",
    marginBottom: 3, // Reduced from 4 to 3
  },
  voteStatLabel: {
    fontSize: 10, // Reduced from 11 to 10
    fontFamily: fonts.body,
    color: "#E2E8F0",
    textAlign: "center",
    lineHeight: 12, // Reduced from 14 to 12
  },
  viewAllStatsButton: {
    backgroundColor: "#1A202C",
    borderRadius: 6, // Reduced from 8 to 6
    paddingVertical: 6, // Reduced from 8 to 6
    paddingHorizontal: 12, // Reduced from 16 to 12
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  viewAllStatsText: {
    fontSize: 12, // Reduced from 14 to 12
    fontFamily: fonts.bodyMedium,
    color: "#3B82F6",
  },
  linksGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  linkCard: {
    width: "31%",
   backgroundColor: "#0c1322",
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    marginBottom: 10,
  },
  linkIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#1A202C",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  linkTitle: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: "#FFFFFF",
    marginBottom: 4,
    textAlign: "center",
  },
  linkDescription: {
    fontSize: 10,
    fontFamily: fonts.body,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 12,
  },
  carouselContainer: {
    height: 120,
  },
  carousel: {
    flex: 1,
  },
  carouselContent: {
    paddingRight: 20,
  },
  leaderCard: {
    width: 100,
    height: 100,
 backgroundColor: "#0c1322",
    borderRadius: 12,
    marginRight: 15,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    position: "relative",
  },
  leaderRank: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#F59E0B",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  rankNumber: {
    fontSize: 10,
    fontFamily: fonts.bodySemiBold,
    color: "#FFFFFF",
  },
  leaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 4,
  },
  leaderName: {
    fontSize: 10,
    fontFamily: fonts.bodySemiBold,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 2,
  },
  leaderStats: {
    fontSize: 8,
    fontFamily: fonts.body,
    color: "#10B981",
    textAlign: "center",
    marginBottom: 1,
  },
  leaderPoints: {
    fontSize: 8,
    fontFamily: fonts.body,
    color: "#3B82F6",
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: "#3B82F6",
  },
  forumBox: {
    backgroundColor: "#0c1322",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "#3B82F6",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  forumContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  forumIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },
  forumEmoji: {
    fontSize: 24,
  },
  forumTextContainer: {
    flex: 1,
  },
  forumTitle: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: "#FFFFFF",
    marginBottom: 5,
  },
  forumDescription: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: "#9CA3AF",
    lineHeight: 20,
    marginBottom: 10,
  },
  forumFeatures: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  forumFeature: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: "#3B82F6",
    marginRight: 15,
    marginBottom: 2,
  },
  forumArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#374151",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  forumFooter: {
    borderTopWidth: 1,
    borderTopColor: "#4A5568",
    paddingTop: 15,
    alignItems: "center",
  },
  forumPrice: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: "#10B981",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontFamily: fonts.body,
    color: "#FFFFFF",
    fontSize: 16,
  },
  noDataText: {
    fontFamily: fonts.body,
    color: "#9CA3AF",
    textAlign: "center",
    padding: 20,
    fontSize: 14,
  },
  voteButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  voteButtonHalf: {
    flex: 1,
    marginHorizontal: 5,
  },
})

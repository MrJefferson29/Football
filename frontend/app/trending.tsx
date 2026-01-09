import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { newsAPI } from '@/utils/api';
import { getDirectImageUrl } from '@/utils/imageUtils';
import { fonts } from '@/utils/typography';
import { useDataCache } from '@/contexts/DataCacheContext';

export default function TrendingScreen() {
  const { getCacheData, setCacheData } = useDataCache();
  const [trendingContent, setTrendingContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrendingNews();
  }, []);

  const loadTrendingNews = async () => {
    // First check cache
    const cachedData = getCacheData('trendingNews');
    if (cachedData) {
      setTrendingContent(cachedData);
      setLoading(false);
    }

    // Refresh in background
    try {
      const response = await newsAPI.getTrendingNews();
      if (response.success && response.data) {
        setCacheData('trendingNews', response.data);
        setTrendingContent(response.data);
      } else {
        if (!cachedData) {
          Alert.alert('Error', 'Failed to load trending content');
        }
      }
    } catch (error: any) {
      if (!cachedData) {
        Alert.alert('Error', error.message || 'Failed to load trending content');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendingNews = loadTrendingNews;

  const handleContentPress = (content: any) => {
    const videoUrl = content.youtubeUrl || content.videoUrl;
    if (videoUrl) {
      Linking.openURL(videoUrl);
    } else {
      // For news without video, open external link
      Linking.openURL('https://www.espn.com/soccer/');
    }
  };

  const formatTimeAgo = (date: string) => {
    if (!date) return 'Recently';
    const now = new Date();
    const created = new Date(date);
    const diffInHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trending</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading trending content...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trending</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Featured Content */}
        {trendingContent.length > 0 && (
          <View style={styles.featuredSection}>
            <Text style={styles.sectionTitle}>🔥 Trending Now</Text>
            <TouchableOpacity 
              style={styles.featuredCard}
              onPress={() => handleContentPress(trendingContent[0])}
            >
              <Image 
                source={{ uri: getDirectImageUrl(trendingContent[0].thumbnail) || 'https://via.placeholder.com/400' }}
                style={styles.featuredImage}
                onError={(e) => {
                  console.log('Image load error:', trendingContent[0].thumbnail);
                }}
              />
              <View style={styles.featuredOverlay}>
                <View style={styles.trendingBadge}>
                  <Ionicons name="trending-up" size={16} color="#FFFFFF" />
                  <Text style={styles.trendingText}>TRENDING</Text>
                </View>
                <View style={styles.playButton}>
                  <Ionicons name="play" size={32} color="#FFFFFF" />
                </View>
              </View>
              <View style={styles.featuredContent}>
                <Text style={styles.featuredTitle}>{trendingContent[0].title}</Text>
                <Text style={styles.featuredDescription}>{trendingContent[0].description || ''}</Text>
                <View style={styles.featuredStats}>
                  <Text style={styles.featuredTime}>{formatTimeAgo(trendingContent[0].createdAt)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* All Trending Content */}
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>All Trending Content</Text>
          {trendingContent.length > 0 ? (
            trendingContent.map((content: any) => (
              <TouchableOpacity 
                key={content._id || content.id}
                style={styles.contentCard}
                onPress={() => handleContentPress(content)}
              >
                <Image 
                  source={{ uri: getDirectImageUrl(content.thumbnail) || 'https://via.placeholder.com/80' }}
                  style={styles.contentImage}
                  onError={(e) => {
                    console.log('Image load error:', content.thumbnail);
                  }}
                />
                <View style={styles.contentInfo}>
                  <View style={styles.contentHeader}>
                    <Text style={styles.contentTitle}>{content.title}</Text>
                    {content.isTrending && (
                      <View style={styles.trendingIcon}>
                        <Ionicons name="trending-up" size={14} color="#3B82F6" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.contentDescription} numberOfLines={2}>
                    {content.description || ''}
                  </Text>
                  <View style={styles.contentStats}>
                    <Text style={styles.contentTime}>{formatTimeAgo(content.createdAt)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No trending content available</Text>
            </View>
          )}
        </View>

      </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 7,
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
  featuredSection: {
    paddingHorizontal: 10,
    marginTop: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
    marginBottom: 15,
  },
  featuredCard: {
    backgroundColor: '#2D3748',
    borderRadius: 16,
    overflow: 'hidden',
  },
  featuredImage: {
    width: '100%',
    height: 200,
  },
  featuredOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 15,
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  trendingText: {
    fontSize: 10,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  playButton: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 30,
    padding: 15,
  },
  featuredContent: {
    padding: 20,
  },
  featuredTitle: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  featuredDescription: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    lineHeight: 20,
    marginBottom: 12,
  },
  featuredStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  featuredViews: {
    fontSize: 12,
    fontFamily: fonts.bodyMedium,
    color: '#3B82F6',
  },
  featuredTime: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#9CA3AF',
  },
  contentSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  contentCard: {
    flexDirection: 'row',
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  contentImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  contentInfo: {
    flex: 1,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contentTitle: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    flex: 1,
  },
  trendingIcon: {
    marginLeft: 8,
  },
  contentDescription: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    lineHeight: 18,
    marginBottom: 8,
  },
  contentStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contentViews: {
    fontSize: 11,
    fontFamily: fonts.bodyMedium,
    color: '#3B82F6',
  },
  contentTime: {
    fontSize: 11,
    fontFamily: fonts.body,
    color: '#9CA3AF',
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
    textAlign: 'center',
  },
});

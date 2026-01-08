import YouTubeVideoCard from '@/components/YouTubeVideoCard';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { highlightsAPI } from '@/utils/api';
import { fonts } from '@/utils/typography';

export default function HighlightsScreen() {
  const [highlights, setHighlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    fetchHighlights();
  }, []);

  const fetchHighlights = async () => {
    try {
      setLoading(true);
      console.log('Fetching highlights...');
      const response = await highlightsAPI.getHighlights();
      console.log('Highlights response:', response);
      if (response.success) {
        console.log('Highlights data:', response.data);
        console.log('Number of highlights:', response.data?.length || 0);
        setHighlights(response.data || []);
      } else {
        console.warn('Highlights fetch failed:', response.message);
        Alert.alert('Error', response.message || 'Failed to load highlights');
      }
    } catch (error: any) {
      console.error('Error fetching highlights:', error);
      Alert.alert('Error', error.message || 'Failed to load highlights');
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', ...Array.from(new Set((highlights || []).map((h: any) => h.category).filter(Boolean)))];
  const filteredHighlights = (highlights || []).filter((h: any) => {
    if (!h) return false;
    if (selectedCategory === 'All') return true;
    return (h.category || '').toLowerCase() === selectedCategory.toLowerCase();
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Football Highlights</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading highlights...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Category Filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChips}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, selectedCategory === cat && styles.chipActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {filteredHighlights.length > 0 ? (
            filteredHighlights.map((video: any) => {
              // Extract video ID from YouTube URL if needed
              const getVideoId = (url: string) => {
                if (!url) return video._id || video.id || '';
                
                // Handle YouTube Live URLs
                if (url.includes('youtube.com/live/')) {
                  return url.split('youtube.com/live/')[1]?.split('?')[0]?.split('&')[0] || '';
                }
                // Handle YouTube Shorts
                else if (url.includes('youtube.com/shorts/')) {
                  return url.split('shorts/')[1]?.split('?')[0] || '';
                }
                // Handle embed URLs
                else if (url.includes('youtube.com/embed/')) {
                  return url.split('embed/')[1]?.split('?')[0] || '';
                }
                // Handle standard watch URLs
                else if (url.includes('youtube.com/watch?v=')) {
                  return url.split('v=')[1]?.split('&')[0] || '';
                }
                // Handle short URLs
                else if (url.includes('youtu.be/')) {
                  return url.split('youtu.be/')[1]?.split('?')[0] || '';
                }
                // Assume it's already a video ID
                else {
                  return url;
                }
              };
              
              const videoId = getVideoId(video.youtubeUrl) || video._id || video.id || '';
              
              if (!videoId) {
                console.warn('No video ID found for video:', video);
                return null;
              }
              
              return (
                <View key={video._id || video.id} style={styles.videoContainer}>
                  <YouTubeVideoCard
                    id={video._id || video.id}
                    videoId={videoId}
                    title={video.title || 'Untitled'}
                    thumbnail={video.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                    duration={video.duration || "0:00"}
                    views={video.views || "0 views"}
                    youtubeUrl={video.youtubeUrl}
                  />
                </View>
              );
            }).filter(Boolean)
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No highlights available</Text>
            </View>
          )}
        </ScrollView>
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
    fontSize: 20,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  videoContainer: {
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
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
    color: '#9CA3AF',
    fontSize: 16,
  },
  filterChips: {
    paddingVertical: 8,
    paddingHorizontal: 4,
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
    fontFamily: fonts.body,
    color: "#3B82F6",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
});

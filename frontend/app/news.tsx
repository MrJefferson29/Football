import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts } from '@/utils/typography';
import { newsAPI } from '@/utils/api';
import { getDirectImageUrl } from '@/utils/imageUtils';

export default function NewsScreen() {
  const [newsArticles, setNewsArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'trending', 'breaking', 'transfer', 'match-report', 'analysis', 'other'];

  useEffect(() => {
    fetchNews();
  }, []);

  useEffect(() => {
    if (selectedCategory !== 'All') {
      fetchNewsByCategory();
    } else {
      fetchNews();
    }
  }, [selectedCategory]);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const response = await newsAPI.getNews();
      if (response.success && response.data) {
        setNewsArticles(response.data);
      } else {
        Alert.alert('Error', 'Failed to load news');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load news');
    } finally {
      setLoading(false);
    }
  };

  const fetchNewsByCategory = async () => {
    try {
      setLoading(true);
      const response = await newsAPI.getNews(selectedCategory);
      if (response.success && response.data) {
        setNewsArticles(response.data);
      } else {
        Alert.alert('Error', 'Failed to load news');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load news');
    } finally {
      setLoading(false);
    }
  };

  const filteredNews = selectedCategory === 'All' 
    ? newsArticles 
    : newsArticles.filter(article => article.category === selectedCategory);

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

  const handleArticlePress = (article: any) => {
    const videoUrl = article.youtubeUrl || article.videoUrl;
    if (videoUrl) {
      Linking.openURL(videoUrl);
    } else {
      Linking.openURL('https://www.espn.com/soccer/');
    }
  };

  const handleReadMore = () => {
    fetchNews();
  };

  const getBreakingNews = () => {
    const breaking = newsArticles.find(article => article.category === 'breaking' || article.isTrending);
    return breaking;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
    
          <Text style={styles.headerTitle}>Football News</Text>
          <TouchableOpacity onPress={handleReadMore}>
            <Ionicons name="refresh" size={24} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        {/* Breaking News Banner */}
        {getBreakingNews() && (
          <View style={styles.breakingNewsBanner}>
            <View style={styles.breakingNewsContent}>
              <Ionicons name="flash" size={16} color="#FFFFFF" />
              <Text style={styles.breakingNewsText} numberOfLines={1}>
                BREAKING: {getBreakingNews()?.title}
              </Text>
            </View>
          </View>
        )}

        {/* Categories */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.selectedCategoryButton
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory === category && styles.selectedCategoryText
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* News Articles */}
        <View style={styles.newsSection}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Loading news...</Text>
            </View>
          ) : filteredNews.length > 0 ? (
            filteredNews.map((article: any) => (
              <TouchableOpacity 
                key={article._id || article.id}
                style={styles.articleCard}
                onPress={() => handleArticlePress(article)}
              >
                <View style={styles.articleImageContainer}>
                  <Image 
                    source={{ uri: getDirectImageUrl(article.thumbnail) || 'https://via.placeholder.com/80' }}
                    style={styles.articleImage}
                    onError={(e) => {
                      console.log('Image load error:', article.thumbnail);
                    }}
                  />
                  {article.isTrending && (
                    <View style={styles.trendingBadge}>
                      <Ionicons name="trending-up" size={12} color="#FFFFFF" />
                      <Text style={styles.trendingText}>TRENDING</Text>
                    </View>
                  )}
                </View>
                <View style={styles.articleContent}>
                  <View style={styles.articleHeader}>
                    <Text style={styles.articleCategory}>{article.category || 'News'}</Text>
                    <Text style={styles.articleTime}>{formatTimeAgo(article.createdAt)}</Text>
                  </View>
                  <Text style={styles.articleTitle}>{article.title}</Text>
                  <Text style={styles.articleSummary} numberOfLines={2}>
                    {article.description || ''}
                  </Text>
                  <View style={styles.articleFooter}>
                    <Text style={styles.articleSource}>{article.category || 'News'}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No news available</Text>
            </View>
          )}
        </View>

        {/* Read More Button */}
        <TouchableOpacity 
          style={styles.readMoreButton}
          onPress={handleReadMore}
        >
          <Ionicons name="newspaper" size={20} color="#3B82F6" />
          <Text style={styles.readMoreText}>Read More News</Text>
        </TouchableOpacity>
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
  breakingNewsBanner: {
    backgroundColor: '#EF4444',
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  breakingNewsContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakingNewsText: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  categoriesContainer: {
    marginVertical: 20,
  },
  categoriesContent: {
    paddingHorizontal: 20,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2D3748',
    marginRight: 10,
  },
  selectedCategoryButton: {
    backgroundColor: '#3B82F6',
  },
  categoryText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontFamily: fonts.bodyMedium,
  },
  selectedCategoryText: {
    color: '#FFFFFF',
  },
  newsSection: {
    paddingHorizontal: 20,
  },
  articleCard: {
    flexDirection: 'row',
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  articleImageContainer: {
    position: 'relative',
  },
  articleImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  trendingBadge: {
    position: 'absolute',
    top: -5,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  trendingText: {
    fontSize: 8,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginLeft: 2,
  },
  articleContent: {
    flex: 1,
  },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  articleCategory: {
    fontSize: 12,
    color: '#3B82F6',
    fontFamily: fonts.bodyMedium,
  },
  articleTime: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#9CA3AF',
  },
  articleTitle: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginBottom: 6,
    lineHeight: 22,
  },
  articleSummary: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    lineHeight: 18,
    marginBottom: 10,
  },
  articleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  articleSource: {
    fontSize: 12,
    color: '#3B82F6',
    fontFamily: fonts.bodyMedium,
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2D3748',
    marginHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 30,
  },
  readMoreText: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginLeft: 8,
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
    textAlign: 'center',
  },
});

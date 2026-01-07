import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts } from '@/utils/typography';
import { statisticsAPI } from '@/utils/api';

export default function StatisticsScreen() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchStatistics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatistics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await statisticsAPI.getStatistics();
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        Alert.alert('Error', 'Failed to load statistics');
      }
    } catch (error: any) {
      console.error('Error fetching statistics:', error);
      Alert.alert('Error', error.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const renderOverviewTab = () => {
    if (!stats) return null;

    const overview = stats.overview || {};
    const votingDistribution = stats.votingDistribution || [];

    return (
      <View style={styles.tabContent}>
        {/* Key Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Ionicons name="people" size={24} color="#3B82F6" />
              <Text style={styles.metricValue}>{(overview.totalUsers || 0).toLocaleString()}</Text>
              <Text style={styles.metricLabel}>Total Users</Text>
            </View>
            <View style={styles.metricCard}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={styles.metricValue}>{(overview.totalVotes || 0).toLocaleString()}</Text>
              <Text style={styles.metricLabel}>Total Votes</Text>
            </View>
            <View style={styles.metricCard}>
              <Ionicons name="trophy" size={24} color="#F59E0B" />
              <Text style={styles.metricValue}>{overview.accuracyRate || 0}%</Text>
              <Text style={styles.metricLabel}>Accuracy Rate</Text>
            </View>
            <View style={styles.metricCard}>
              <Ionicons name="trending-up" size={24} color="#EF4444" />
              <Text style={styles.metricValue}>{(overview.dailyActiveUsers || 0).toLocaleString()}</Text>
              <Text style={styles.metricLabel}>Daily Active</Text>
            </View>
          </View>
        </View>

        {/* Voting Distribution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voting Distribution</Text>
          <View style={styles.votingStatsContainer}>
            {votingDistribution.length > 0 ? (
              votingDistribution.map((stat: any, index: number) => (
                <View key={index} style={styles.votingStatItem}>
                  <View style={styles.votingStatHeader}>
                    <Text style={styles.votingStatCategory}>{stat.category}</Text>
                    <Text style={styles.votingStatPercentage}>{stat.percentage}%</Text>
                  </View>
                  <View style={styles.votingStatBar}>
                    <View 
                      style={[
                        styles.votingStatFill, 
                        { width: `${stat.percentage}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.votingStatVotes}>{stat.votes.toLocaleString()} votes</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No voting data available</Text>
            )}
          </View>
        </View>

        {/* Polls List */}
        {stats.polls && stats.polls.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Polls</Text>
            <View style={styles.pollsContainer}>
              {stats.polls.map((poll: any, index: number) => (
                <View key={poll.id || index} style={styles.pollItem}>
                  <View style={styles.pollHeader}>
                    <Text style={styles.pollName}>{poll.name}</Text>
                    <Text style={styles.pollType}>{poll.typeName}</Text>
                  </View>
                  <View style={styles.pollStats}>
                    <View style={styles.pollOption}>
                      <Text style={styles.pollOptionName}>{poll.option1?.name || 'Option 1'}</Text>
                      <Text style={styles.pollOptionVotes}>{poll.option1?.votes || 0} votes</Text>
                    </View>
                    <View style={styles.pollOption}>
                      <Text style={styles.pollOptionName}>{poll.option2?.name || 'Option 2'}</Text>
                      <Text style={styles.pollOptionVotes}>{poll.option2?.votes || 0} votes</Text>
                    </View>
                  </View>
                  <Text style={styles.pollTotalVotes}>Total: {poll.totalVotes || 0} votes</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderEngagementTab = () => {
    if (!stats || !stats.engagement) return null;

    const engagement = stats.engagement;

    const engagementMetrics = [
      {
        metric: 'Daily Active Users',
        value: engagement.dailyActiveUsers?.value || '0',
        change: engagement.dailyActiveUsers?.change || '+0%',
        trend: engagement.dailyActiveUsers?.trend || 'up'
      },
      {
        metric: 'Weekly Retention',
        value: engagement.weeklyRetention?.value || '0%',
        change: engagement.weeklyRetention?.change || '+0%',
        trend: engagement.weeklyRetention?.trend || 'up'
      },
      {
        metric: 'Average Session',
        value: engagement.averageSession?.value || '0m',
        change: engagement.averageSession?.change || '+0m',
        trend: engagement.averageSession?.trend || 'up'
      },
      {
        metric: 'Predictions Made',
        value: engagement.predictionsMade?.value || '0',
        change: engagement.predictionsMade?.change || '+0%',
        trend: engagement.predictionsMade?.trend || 'up'
      }
    ];

    return (
      <View style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Engagement</Text>
          {engagementMetrics.map((item, index) => (
            <View key={index} style={styles.engagementItem}>
              <View style={styles.engagementInfo}>
                <Text style={styles.engagementMetric}>{item.metric}</Text>
                <Text style={styles.engagementValue}>{item.value}</Text>
              </View>
              <View style={styles.engagementChange}>
                <Ionicons 
                  name={item.trend === 'up' ? 'trending-up' : 'trending-down'} 
                  size={16} 
                  color={item.trend === 'up' ? '#10B981' : '#EF4444'} 
                />
                <Text style={[
                  styles.engagementChangeText,
                  { color: item.trend === 'up' ? '#10B981' : '#EF4444' }
                ]}>
                  {item.change}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Additional Engagement Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Growth Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Ionicons name="person-add" size={24} color="#3B82F6" />
              <Text style={styles.metricValue}>{(engagement.newUsersToday || 0).toLocaleString()}</Text>
              <Text style={styles.metricLabel}>New Users Today</Text>
            </View>
            <View style={styles.metricCard}>
              <Ionicons name="calendar" size={24} color="#10B981" />
              <Text style={styles.metricValue}>{(engagement.newUsersThisWeek || 0).toLocaleString()}</Text>
              <Text style={styles.metricLabel}>New This Week</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderActivityTab = () => {
    if (!stats || !stats.activities) return null;

    const activities = stats.activities || [];

    return (
      <View style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {activities.length > 0 ? (
            activities.map((activity: any, index: number) => (
              <View key={index} style={styles.activityItem}>
                <View style={styles.activityIcon}>
                  <Ionicons 
                    name={
                      activity.type === 'vote' ? 'checkmark-circle' :
                      activity.type === 'register' ? 'person-add' :
                      activity.type === 'login' ? 'log-in' :
                      activity.type === 'prediction' ? 'trophy' :
                      'person-circle'
                    } 
                    size={24} 
                    color="#3B82F6" 
                  />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityAction}>{activity.action}</Text>
                  <Text style={styles.activityUser}>by {activity.user}</Text>
                </View>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptySection}>
              <Text style={styles.emptyText}>No recent activity</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading && !stats) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Statistics</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading statistics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Statistics</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'engagement' && styles.activeTab]}
            onPress={() => setActiveTab('engagement')}
          >
            <Text style={[styles.tabText, activeTab === 'engagement' && styles.activeTabText]}>
              Engagement
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'activity' && styles.activeTab]}
            onPress={() => setActiveTab('activity')}
          >
            <Text style={[styles.tabText, activeTab === 'activity' && styles.activeTabText]}>
              Activity
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'engagement' && renderEngagementTab()}
        {activeTab === 'activity' && renderActivityTab()}
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
    fontSize: 20,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
  },
  placeholder: {
    width: 34,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: '#9CA3AF',
  },
  activeTabText: {
    color: '#3B82F6',
    fontFamily: fonts.bodySemiBold,
  },
  tabContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
    marginBottom: 15,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  metricValue: {
    fontSize: 20,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  votingStatsContainer: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 15,
  },
  votingStatItem: {
    marginBottom: 15,
  },
  votingStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  votingStatCategory: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: '#FFFFFF',
  },
  votingStatPercentage: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: '#3B82F6',
  },
  votingStatBar: {
    height: 6,
    backgroundColor: '#4A5568',
    borderRadius: 3,
    marginBottom: 4,
  },
  votingStatFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  votingStatVotes: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#9CA3AF',
  },
  pollsContainer: {
    gap: 12,
  },
  pollItem: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  pollHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pollName: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    flex: 1,
  },
  pollType: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#3B82F6',
    backgroundColor: '#1A202C',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pollStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pollOption: {
    flex: 1,
  },
  pollOptionName: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  pollOptionVotes: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#9CA3AF',
  },
  pollTotalVotes: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#4A5568',
  },
  engagementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  engagementInfo: {
    flex: 1,
  },
  engagementMetric: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  engagementValue: {
    fontSize: 18,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  engagementChange: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  engagementChangeText: {
    fontSize: 12,
    fontFamily: fonts.bodyMedium,
    marginLeft: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  activityIcon: {
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityAction: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  activityUser: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#9CA3AF',
  },
  activityTime: {
    fontSize: 12,
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
    fontFamily: fonts.body,
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 16,
  },
  emptySection: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fonts.body,
    color: '#9CA3AF',
    fontSize: 16,
  },
});

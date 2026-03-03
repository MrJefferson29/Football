import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { matchesAPI } from '@/utils/api';
import { getDirectImageUrl } from '@/utils/imageUtils';
import { fonts } from '@/utils/typography';
import { useTranslation } from 'react-i18next';

export default function MyPoolsScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [activePools, setActivePools] = useState<any[]>([]);
  const [pastPools, setPastPools] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState<'active' | 'past'>('active');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await matchesAPI.getMyPools();
        if (res.success && res.data) {
          setActivePools(res.data.active || []);
          setPastPools(res.data.past || []);
        }
      } catch (e) {
        // swallow; errors are surfaced via alerts in apiRequest
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const poolsToShow = selectedTab === 'active' ? activePools : pastPools;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('My Bets')}</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'active' && styles.tabButtonActive]}
          onPress={() => setSelectedTab('active')}
        >
          <Text style={[styles.tabText, selectedTab === 'active' && styles.tabTextActive]}>
            {t('Active')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'past' && styles.tabButtonActive]}
          onPress={() => setSelectedTab('past')}
        >
          <Text style={[styles.tabText, selectedTab === 'past' && styles.tabTextActive]}>
            {t('Past')}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>{t('Loading your bets...')}</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {poolsToShow.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {selectedTab === 'active'
                  ? t('You have no active bets.')
                  : t('You have no past bets yet.')}
              </Text>
            </View>
          ) : (
            poolsToShow.map((pool: any) => {
              const match = pool.match || {};
              const myEntry = pool.myEntry || {};
              const otherParticipants =
                (pool.participants || []).filter(
                  (p: any) => !myEntry.user || String(p.user?._id || p.user) !== String(myEntry.user?._id || myEntry.user)
                ) || [];

              const isPast = selectedTab === 'past';

              return (
                <View key={pool._id} style={styles.poolCard}>
                  <View style={styles.poolHeaderRow}>
                    <Text style={styles.poolName} numberOfLines={1}>
                      {pool.name || 'Prediction Pool'}
                    </Text>
                    <Text style={styles.stakeTextSmall}>
                      {t('Stake')}: ₦{pool.amount?.toLocaleString?.() || pool.amount}
                    </Text>
                  </View>

                  <View style={styles.matchRow}>
                    <View style={styles.teamCol}>
                      <Image
                        source={{ uri: getDirectImageUrl(match.homeLogo) || 'https://via.placeholder.com/40' }}
                        style={styles.teamLogo}
                      />
                      <Text style={styles.teamName} numberOfLines={1}>{match.homeTeam}</Text>
                    </View>
                    <View style={styles.centerCol}>
                      {isPast && match.homeScore != null && match.awayScore != null ? (
                        <Text style={styles.scoreText}>
                          {match.homeScore} - {match.awayScore}
                        </Text>
                      ) : (
                        <Text style={styles.matchTimeText}>{match.matchTime}</Text>
                      )}
                      <Text style={styles.leagueText}>{match.league || ''}</Text>
                    </View>
                    <View style={styles.teamCol}>
                      <Image
                        source={{ uri: getDirectImageUrl(match.awayLogo) || 'https://via.placeholder.com/40' }}
                        style={styles.teamLogo}
                      />
                      <Text style={styles.teamName} numberOfLines={1}>{match.awayTeam}</Text>
                    </View>
                  </View>

                  <View style={styles.chipsRow}>
                    {myEntry && (
                      <View style={styles.myChip}>
                        <Text style={styles.chipLabel}>{t('Your pick')}</Text>
                        <Text style={styles.chipValue}>
                          {myEntry.prediction === 'home'
                            ? t('Home win')
                            : myEntry.prediction === 'away'
                            ? t('Away win')
                            : t('Draw')}
                        </Text>
                        {myEntry.homeScore != null && myEntry.awayScore != null && (
                          <Text style={styles.chipSub}>
                            {myEntry.homeScore} - {myEntry.awayScore}
                          </Text>
                        )}
                      </View>
                    )}

                    {otherParticipants.length > 0 && (
                      <View style={styles.othersChip}>
                        <Text style={styles.chipLabel}>{t('Other players')}</Text>
                        <Text style={styles.chipSub}>
                          {otherParticipants.length} {t('participant')}{otherParticipants.length === 1 ? '' : 's'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
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
    fontSize: 18,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
  },
  placeholder: {
    width: 34,
  },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 999,
    backgroundColor: '#111827',
    padding: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#2563EB',
  },
  tabText: {
    fontSize: 13,
    fontFamily: fonts.bodyMedium,
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontFamily: fonts.bodySemiBold,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontFamily: fonts.body,
    color: '#FFFFFF',
    fontSize: 14,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fonts.body,
    color: '#9CA3AF',
    fontSize: 14,
  },
  poolCard: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  poolHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  poolName: {
    fontSize: 15,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  stakeTextSmall: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: '#9CA3AF',
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  teamCol: {
    alignItems: 'center',
    width: '30%',
  },
  centerCol: {
    alignItems: 'center',
    width: '40%',
  },
  teamLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 6,
  },
  teamName: {
    fontSize: 12,
    fontFamily: fonts.bodyMedium,
    color: '#E5E7EB',
    textAlign: 'center',
  },
  scoreText: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  matchTimeText: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: '#9CA3AF',
  },
  leagueText: {
    fontSize: 11,
    fontFamily: fonts.body,
    color: '#6B7280',
    marginTop: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  myChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#111827',
    marginRight: 8,
    marginBottom: 4,
  },
  othersChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#1F2937',
    marginRight: 8,
    marginBottom: 4,
  },
  chipLabel: {
    fontSize: 10,
    fontFamily: fonts.body,
    color: '#9CA3AF',
  },
  chipValue: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
  chipSub: {
    fontSize: 11,
    fontFamily: fonts.body,
    color: '#E5E7EB',
  },
});


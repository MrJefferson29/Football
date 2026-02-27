import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PollResultsProps {
  messiPercentage: number;
  ronaldoPercentage: number;
  countryBreakdown: Array<{
    country: string;
    percentage: number;
    color: string;
  }>;
  onShare: () => void;
}

export default function PollResults({ 
  messiPercentage, 
  ronaldoPercentage, 
  countryBreakdown, 
  onShare 
}: PollResultsProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Player Comparison */}
        <View style={styles.playersSection}>
          <View style={styles.player}>
            <View style={styles.playerImage}>
              <Text style={styles.playerEmoji}>👨‍🦱</Text>
            </View>
            <Text style={styles.playerName}>MESSI</Text>
          </View>
          
          <Text style={styles.vsText}>VS</Text>
          
          <View style={styles.player}>
            <View style={styles.playerImage}>
              <Text style={styles.playerEmoji}>👨</Text>
            </View>
            <Text style={styles.playerName}>RONALDO</Text>
          </View>
        </View>

        {/* Overall Percentage */}
        <View style={styles.percentageSection}>
          <View style={styles.percentageBar}>
            <View style={[styles.percentageSegment, styles.messiSegment, { width: `${messiPercentage}%` }]}>
              <Text style={styles.percentageText}>{messiPercentage}%</Text>
            </View>
            <View style={[styles.percentageSegment, styles.ronaldoSegment, { width: `${ronaldoPercentage}%` }]}>
              <Text style={styles.percentageText}>{ronaldoPercentage}%</Text>
            </View>
          </View>
        </View>

        {/* Country Breakdown */}
        <View style={styles.countrySection}>
          <Text style={styles.countryTitle}>Country Breakdown</Text>
          {countryBreakdown.map((country, index) => (
            <View key={index} style={styles.countryItem}>
              <View style={styles.countryBarContainer}>
                <View style={[styles.countryBar, { backgroundColor: country.color, width: `${country.percentage}%` }]} />
              </View>
              <Text style={styles.countryName}>{country.country}</Text>
              <Text style={styles.countryPercentage}>{country.percentage}%</Text>
            </View>
          ))}
        </View>

        {/* Share Button */}
        <TouchableOpacity style={styles.shareButton} onPress={onShare}>
          <Text style={styles.shareButtonText}>Share</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A202C',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  playersSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  player: {
    alignItems: 'center',
    flex: 1,
  },
  playerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2D3748',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  playerEmoji: {
    fontSize: 32,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  vsText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginHorizontal: 20,
  },
  percentageSection: {
    marginBottom: 40,
  },
  percentageBar: {
    height: 40,
    flexDirection: 'row',
    borderRadius: 20,
    overflow: 'hidden',
  },
  percentageSegment: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messiSegment: {
    backgroundColor: '#3B82F6',
  },
  ronaldoSegment: {
    backgroundColor: '#EF4444',
  },
  percentageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  countrySection: {
    marginBottom: 40,
  },
  countryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  countryBarContainer: {
    flex: 1,
    height: 20,
    backgroundColor: '#4A5568',
    borderRadius: 10,
    marginRight: 15,
    overflow: 'hidden',
  },
  countryBar: {
    height: '100%',
    borderRadius: 10,
  },
  countryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    minWidth: 80,
    marginRight: 10,
  },
  countryPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    minWidth: 40,
    textAlign: 'right',
  },
  shareButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 'auto',
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

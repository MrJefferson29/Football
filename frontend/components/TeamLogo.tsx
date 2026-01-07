import React from 'react';
import { Text, StyleSheet } from 'react-native';

interface TeamLogoProps {
  team: string;
  size?: number;
}

const teamLogos: { [key: string]: string } = {
  'Barcelona': '🔴',
  'Real Madrid': '👑',
  'Arsenal': '🔴',
  'Liverpool': '🔴',
  'Chelsea': '🔵',
  'Manchester City': '🔵',
  'Manchester Utd': '🔴',
  'Espanyol': '🔴',
  'Bayern Munich': '🔴',
  'PSG': '🔵',
  'Juventus': '⚫',
  'AC Milan': '🔴',
  'Inter Milan': '🔵',
  'Atletico Madrid': '🔴',
  'Tottenham': '🔵',
  'Leicester': '🔵',
  'West Ham': '🔴',
  'Everton': '🔵',
  'Newcastle': '⚫',
  'Aston Villa': '🔴',
};

export default function TeamLogo({ team, size = 24 }: TeamLogoProps) {
  const logo = teamLogos[team] || '⚽';
  
  return (
    <Text style={[styles.logo, { fontSize: size }]}>
      {logo}
    </Text>
  );
}

const styles = StyleSheet.create({
  logo: {
    textAlign: 'center',
  },
});

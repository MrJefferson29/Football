import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface PlayerImageProps {
  playerName: string;
  imageUrl?: string;
  size?: number;
}

export default function PlayerImage({ playerName, imageUrl, size = 60 }: PlayerImageProps) {
  const [imageError, setImageError] = useState(false);

  if (imageUrl && !imageError) {
    return (
      <Image
        source={{ 
          uri: imageUrl,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        onError={(error) => {
          console.log('Image load error for', playerName, ':', error);
          setImageError(true);
        }}
        onLoad={() => {
          console.log('Image loaded successfully for', playerName);
          setImageError(false);
        }}
        resizeMode="cover"
      />
    );
  }

  // Fallback to emoji-based placeholder
  const getPlayerEmoji = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('messi')) return '';
    if (lowerName.includes('ronaldo')) return '';
    if (lowerName.includes('neymar')) return '👨';
    if (lowerName.includes('mbappe')) return '';
    if (lowerName.includes('haaland')) return '👨';
    return '⚽';
  };

  return (
    <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.emoji, { fontSize: size * 0.4 }]}>
        {getPlayerEmoji(playerName)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#4A5568',
  },
  placeholder: {
    backgroundColor: '#4A5568',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    textAlign: 'center',
  },
});

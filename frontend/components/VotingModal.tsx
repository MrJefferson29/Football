import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { getDirectImageUrl } from '@/utils/imageUtils';

interface VotingModalProps {
  visible: boolean;
  onClose: () => void;
  match: {
    id: string | number;
    _id?: string;
    homeTeam: string;
    awayTeam: string;
    homeLogo: string;
    awayLogo: string;
    time?: string;
    score?: string;
  };
  onVote: (matchId: string, prediction: 'home' | 'draw' | 'away', homeScore?: number, awayScore?: number) => Promise<void>;
}

export default function VotingModal({ visible, onClose, match, onVote }: VotingModalProps) {
  const [selectedPrediction, setSelectedPrediction] = useState<'home' | 'draw' | 'away' | null>(null);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVote = async () => {
    if (!selectedPrediction) {
      Alert.alert('Select Prediction', 'Please select your prediction before voting.');
      return;
    }

    setIsLoading(true);
    try {
      const matchId = match._id || String(match.id);
      const homeScoreNum = homeScore ? parseInt(homeScore, 10) : undefined;
      const awayScoreNum = awayScore ? parseInt(awayScore, 10) : undefined;
      
      await onVote(matchId, selectedPrediction, homeScoreNum, awayScoreNum);
      Alert.alert('Vote Cast! 🎉', 'Your prediction has been recorded successfully.');
      setSelectedPrediction(null);
      setHomeScore('');
      setAwayScore('');
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to cast vote. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const predictionOptions = [
    {
      id: 'home' as const,
      label: match.homeTeam,
      logo: match.homeLogo,
      color: '#3B82F6',
    },
    {
      id: 'draw' as const,
      label: 'Draw',
      logo: null,
      color: '#F59E0B',
    },
    {
      id: 'away' as const,
      label: match.awayTeam,
      logo: match.awayLogo,
      color: '#EF4444',
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.modalContainer}>
          <ScrollView 
            style={styles.modalScrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Predict the Winner</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Match Info */}
          <View style={styles.matchInfo}>
            <View style={styles.team}>
              <Image 
                source={{ uri: getDirectImageUrl(match.homeLogo) || "https://via.placeholder.com/40" }} 
                style={styles.teamLogo}
                onError={(e) => {
                  console.log('Image load error:', match.homeLogo);
                }}
              />
              <Text style={styles.teamName}>{match.homeTeam}</Text>
            </View>
            <View style={styles.vsContainer}>
              <Text style={styles.vsText}>VS</Text>
              {match.time && <Text style={styles.matchTime}>{match.time}</Text>}
              {match.score && <Text style={styles.matchScore}>{match.score}</Text>}
            </View>
            <View style={styles.team}>
              <Text style={styles.teamName}>{match.awayTeam}</Text>
              <Image 
                source={{ uri: getDirectImageUrl(match.awayLogo) || "https://via.placeholder.com/40" }} 
                style={styles.teamLogo}
                onError={(e) => {
                  console.log('Image load error:', match.awayLogo);
                }}
              />
            </View>
          </View>

           {/* Prediction Options */}
           <View style={styles.predictionSection}>
             <Text style={styles.predictionTitle}>Who will win?</Text>
             <View style={styles.optionsContainer}>
               {predictionOptions.map((option) => (
                 <TouchableOpacity
                   key={option.id}
                   style={[
                     styles.predictionOption,
                     selectedPrediction === option.id && styles.selectedOption,
                     { borderColor: option.color },
                   ]}
                   onPress={() => setSelectedPrediction(option.id)}
                 >
                  <View style={styles.optionContent}>
                    {option.logo ? (
                      <Image 
                        source={{ uri: getDirectImageUrl(option.logo) || "https://via.placeholder.com/30" }} 
                        style={styles.optionLogo}
                        onError={(e) => {
                          console.log('Image load error:', option.logo);
                        }}
                      />
                    ) : (
                      <View style={[styles.drawIcon, { backgroundColor: option.color }]}>
                        <Text style={styles.drawText}>=</Text>
                      </View>
                    )}
                    <Text style={styles.optionLabel}>{option.label}</Text>
                  </View>
                   {selectedPrediction === option.id && (
                     <View style={[styles.checkmark, { backgroundColor: option.color }]}>
                       <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                     </View>
                   )}
                 </TouchableOpacity>
               ))}
             </View>
           </View>

           {/* Score Prediction */}
           <View style={styles.scorePredictionSection}>
             <Text style={styles.scorePredictionTitle}>Predict the Score (Optional)</Text>
             <View style={styles.scoreInputContainer}>
               <View style={styles.scoreInputWrapper}>
                 <Text style={styles.scoreTeamLabel}>{match.homeTeam}</Text>
                 <TextInput
                   style={styles.scoreInput}
                   value={homeScore}
                   onChangeText={setHomeScore}
                   placeholder="0"
                   keyboardType="numeric"
                   maxLength={2}
                 />
               </View>
               <Text style={styles.scoreSeparator}>-</Text>
               <View style={styles.scoreInputWrapper}>
                 <Text style={styles.scoreTeamLabel}>{match.awayTeam}</Text>
                 <TextInput
                   style={styles.scoreInput}
                   value={awayScore}
                   onChangeText={setAwayScore}
                   placeholder="0"
                   keyboardType="numeric"
                   maxLength={2}
                 />
               </View>
             </View>
           </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.voteButton,
                (!selectedPrediction || isLoading) && styles.disabledButton,
              ]}
              onPress={handleVote}
              disabled={!selectedPrediction || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.voteButtonText}>Cast Vote</Text>
              )}
            </TouchableOpacity>
          </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#2D3748',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalScrollView: {
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#4A5568',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 5,
  },
  matchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  team: {
    alignItems: 'center',
    flex: 1,
  },
  teamLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 8,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  vsContainer: {
    alignItems: 'center',
    marginHorizontal: 15,
  },
  vsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  matchTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  matchScore: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10B981',
  },
  predictionSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  predictionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 10,
  },
  predictionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4A5568',
    backgroundColor: '#374151',
  },
  selectedOption: {
    backgroundColor: '#1F2937',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionLogo: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 12,
  },
  drawIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  drawText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4A5568',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  voteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#4A5568',
  },
  voteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scorePredictionSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  scorePredictionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  scoreInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreInputWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  scoreTeamLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
    textAlign: 'center',
  },
  scoreInput: {
    backgroundColor: '#4A5568',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    width: 60,
    borderWidth: 1,
    borderColor: '#6B7280',
  },
  scoreSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginHorizontal: 20,
  },
});

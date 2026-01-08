import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts } from '@/utils/typography';
import { predictionsAPI } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

export default function CreatePredictionScreen() {
  const { forumId } = useLocalSearchParams();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    team1Name: '',
    team1Logo: '',
    team2Name: '',
    team2Logo: '',
    predictedScoreTeam1: '',
    predictedScoreTeam2: '',
    matchDate: new Date().toISOString().slice(0, 16), // Format: YYYY-MM-DDTHH:mm
    league: '',
    competition: '',
    odds: '',
    predictionType: 'match-result',
    additionalInfo: ''
  });

  const handleSave = async () => {
    // Validation
    if (!formData.team1Name.trim() || !formData.team2Name.trim()) {
      Alert.alert('Error', 'Please provide both team names');
      return;
    }

    if (!formData.predictedScoreTeam1 || !formData.predictedScoreTeam2) {
      Alert.alert('Error', 'Please provide predicted scores for both teams');
      return;
    }

    const team1Score = parseInt(formData.predictedScoreTeam1);
    const team2Score = parseInt(formData.predictedScoreTeam2);

    if (isNaN(team1Score) || isNaN(team2Score)) {
      Alert.alert('Error', 'Please provide valid scores');
      return;
    }

    try {
      setSaving(true);
      const response = await predictionsAPI.createPrediction({
        forumId: forumId as string,
        team1: {
          name: formData.team1Name.trim(),
          logo: formData.team1Logo.trim() || undefined
        },
        team2: {
          name: formData.team2Name.trim(),
          logo: formData.team2Logo.trim() || undefined
        },
        predictedScore: {
          team1: team1Score,
          team2: team2Score
        },
        matchDate: new Date(formData.matchDate).toISOString(),
        league: formData.league.trim() || undefined,
        competition: formData.competition.trim() || undefined,
        odds: formData.odds ? parseFloat(formData.odds) : undefined,
        predictionType: formData.predictionType,
        additionalInfo: formData.additionalInfo.trim() || undefined
      });

      if (response.success) {
        Alert.alert('Success', 'Prediction created successfully!', [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create prediction');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Prediction</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formCard}>
          {/* Teams Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Teams</Text>
            
            <View style={styles.teamInputGroup}>
              <Text style={styles.label}>Team 1 Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.team1Name}
                onChangeText={(text) => setFormData({ ...formData, team1Name: text })}
                placeholder="Enter team 1 name"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.teamInputGroup}>
              <Text style={styles.label}>Team 1 Logo URL (optional)</Text>
              <TextInput
                style={styles.input}
                value={formData.team1Logo}
                onChangeText={(text) => setFormData({ ...formData, team1Logo: text })}
                placeholder="Enter team 1 logo URL"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.teamInputGroup}>
              <Text style={styles.label}>Team 2 Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.team2Name}
                onChangeText={(text) => setFormData({ ...formData, team2Name: text })}
                placeholder="Enter team 2 name"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.teamInputGroup}>
              <Text style={styles.label}>Team 2 Logo URL (optional)</Text>
              <TextInput
                style={styles.input}
                value={formData.team2Logo}
                onChangeText={(text) => setFormData({ ...formData, team2Logo: text })}
                placeholder="Enter team 2 logo URL"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Score Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Predicted Score</Text>
            
            <View style={styles.scoreInputRow}>
              <View style={styles.scoreInputGroup}>
                <Text style={styles.label}>Team 1 Score *</Text>
                <TextInput
                  style={styles.scoreInput}
                  value={formData.predictedScoreTeam1}
                  onChangeText={(text) => setFormData({ ...formData, predictedScoreTeam1: text })}
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </View>

              <Text style={styles.vsText}>VS</Text>

              <View style={styles.scoreInputGroup}>
                <Text style={styles.label}>Team 2 Score *</Text>
                <TextInput
                  style={styles.scoreInput}
                  value={formData.predictedScoreTeam2}
                  onChangeText={(text) => setFormData({ ...formData, predictedScoreTeam2: text })}
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Match Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Match Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Match Date & Time *</Text>
              <TextInput
                style={styles.input}
                value={formData.matchDate}
                onChangeText={(text) => setFormData({ ...formData, matchDate: text })}
                placeholder="YYYY-MM-DDTHH:mm (e.g., 2024-12-25T15:00)"
                placeholderTextColor="#9CA3AF"
              />
              <Text style={styles.helperText}>
                Format: YYYY-MM-DDTHH:mm (e.g., 2024-12-25T15:00)
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>League</Text>
              <TextInput
                style={styles.input}
                value={formData.league}
                onChangeText={(text) => setFormData({ ...formData, league: text })}
                placeholder="e.g., Premier League"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Competition</Text>
              <TextInput
                style={styles.input}
                value={formData.competition}
                onChangeText={(text) => setFormData({ ...formData, competition: text })}
                placeholder="e.g., FA Cup"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Odds (optional)</Text>
              <TextInput
                style={styles.input}
                value={formData.odds}
                onChangeText={(text) => setFormData({ ...formData, odds: text })}
                placeholder="e.g., 2.5"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Additional Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Additional Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.additionalInfo}
                onChangeText={(text) => setFormData({ ...formData, additionalInfo: text })}
                placeholder="Add any additional information about this prediction..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                maxLength={500}
              />
              <Text style={styles.charCount}>
                {formData.additionalInfo.length}/500
              </Text>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Create Prediction</Text>
              </>
            )}
          </TouchableOpacity>
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
    flex: 1,
    marginHorizontal: 10,
    textAlign: 'center',
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  formCard: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  teamInputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1A202C',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: fonts.body,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#4A5568',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 5,
  },
  scoreInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 15,
  },
  scoreInputGroup: {
    flex: 1,
  },
  scoreInput: {
    backgroundColor: '#1A202C',
    borderRadius: 8,
    padding: 12,
    fontSize: 24,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#4A5568',
    textAlign: 'center',
  },
  vsText: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: '#9CA3AF',
    marginTop: 20,
  },
  helperText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 5,
    fontStyle: 'italic',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 15,
    borderRadius: 8,
    gap: 8,
    marginTop: 10,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFFFFF',
  },
});

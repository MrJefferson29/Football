import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
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
import { matchesAPI } from '@/utils/api';

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
    onVote: (
        matchId: string,
        prediction: 'home' | 'draw' | 'away',
        homeScore: number,
        awayScore: number,
        amount: number
    ) => Promise<void>;
}

const PRICE_RANGES = [
    { label: '1K - 2K', amount: 1000 },
    { label: '2K - 5K', amount: 2000 },
    { label: '5K - 10K', amount: 5000 },
    { label: '10K - 50K', amount: 10000 },
    { label: '50K - 100K', amount: 50000 },
    { label: '100K+', amount: 100000 },
];

export default function VotingModal({ visible, onClose, match, onVote }: VotingModalProps) {
    const [homeScore, setHomeScore] = useState('');
    const [awayScore, setAwayScore] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [autoSelectedPrediction, setAutoSelectedPrediction] = useState<'home' | 'draw' | 'away' | null>(null);
    const [selectedRange, setSelectedRange] = useState<typeof PRICE_RANGES | null>(null);
    const [pools, setPools] = useState<any[]>([]);
    const [poolsLoading, setPoolsLoading] = useState(false);

    useEffect(() => {
        const h = homeScore ? parseInt(homeScore, 10) : null;
        const a = awayScore ? parseInt(awayScore, 10) : null;

        if (h !== null && a !== null && !isNaN(h) && !isNaN(a)) {
            if (h > a) setAutoSelectedPrediction('home');
            else if (a > h) setAutoSelectedPrediction('away');
            else setAutoSelectedPrediction('draw');
        } else {
            setAutoSelectedPrediction(null);
        }
    }, [homeScore, awayScore]);

    useEffect(() => {
        if (!visible) {
            setHomeScore('');
            setAwayScore('');
            setSelectedRange(null);
            setPools([]);
        }
    }, [visible]);

    useEffect(() => {
        if (!visible || !selectedRange) return;
        const matchId = match._id || String(match.id);
        setPoolsLoading(true);
        matchesAPI.getMatchPools(matchId, selectedRange.amount)
            .then((res) => setPools(res.success ? res.data : []))
            .catch(() => setPools([]))
            .finally(() => setPoolsLoading(false));
    }, [visible, selectedRange, match._id, match.id]);

    const handleVote = async () => {
        const h = parseInt(homeScore, 10);
        const a = parseInt(awayScore, 10);

        if (!selectedRange || isNaN(h) || isNaN(a) || !autoSelectedPrediction) {
            Alert.alert('Incomplete', 'Please fill in both scores and select a stake.');
            return;
        }

        setIsLoading(true);
        try {
            await onVote(match._id || String(match.id), autoSelectedPrediction, h, a, selectedRange.amount);
            onClose();
        } catch (error) {
            Alert.alert('Error', 'Failed to submit prediction.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <KeyboardAvoidingView 
                style={styles.overlay} 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.sheetHandle} />
                    
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Predict & Stake</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeIcon}>
                            <Ionicons name="close" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView 
                        showsVerticalScrollIndicator={false} 
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Compact Scoreboard Card */}
                        <View style={styles.scoreboardCard}>
                            <View style={styles.teamContainer}>
                                <Image source={{ uri: getDirectImageUrl(match.homeLogo) }} style={styles.teamLogo} />
                                <Text style={styles.teamName} numberOfLines={1}>{match.homeTeam}</Text>
                                <TextInput
                                    style={[styles.scoreInput, homeScore !== '' && styles.scoreInputActive]}
                                    value={homeScore}
                                    onChangeText={setHomeScore}
                                    placeholder="0"
                                    placeholderTextColor="#4A5568"
                                    keyboardType="numeric"
                                    maxLength={2}
                                />
                            </View>

                            <View style={styles.vsContainer}>
                                <Text style={styles.vsLabel}>VS</Text>
                                <View style={styles.vsLine} />
                            </View>

                            <View style={styles.teamContainer}>
                                <Image source={{ uri: getDirectImageUrl(match.awayLogo) }} style={styles.teamLogo} />
                                <Text style={styles.teamName} numberOfLines={1}>{match.awayTeam}</Text>
                                <TextInput
                                    style={[styles.scoreInput, awayScore !== '' && styles.scoreInputActive]}
                                    value={awayScore}
                                    onChangeText={setAwayScore}
                                    placeholder="0"
                                    placeholderTextColor="#4A5568"
                                    keyboardType="numeric"
                                    maxLength={2}
                                />
                            </View>
                        </View>

                        {/* Prediction Result Badge */}
                        <View style={styles.badgeRow}>
                            {autoSelectedPrediction && (
                                <View style={[styles.predictionBadge, { 
                                    backgroundColor: autoSelectedPrediction === 'draw' ? '#F59E0B' : '#3B82F6' 
                                }]}>
                                    <Text style={styles.predictionBadgeText}>
                                        {autoSelectedPrediction.toUpperCase()} WIN PREDICTED
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Stake Selection */}
                        <Text style={styles.sectionTitle}>Select Stake Range</Text>
                        <View style={styles.stakeGrid}>
                            {PRICE_RANGES.map((range) => (
                                <TouchableOpacity
                                    key={range.amount}
                                    onPress={() => setSelectedRange(range)}
                                    style={[styles.stakeChip, selectedRange?.amount === range.amount && styles.stakeChipActive]}
                                >
                                    <Text style={[styles.stakeText, selectedRange?.amount === range.amount && styles.stakeTextActive]}>
                                        ₦{range.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Pool Status Information */}
                        {selectedRange && (
                            <View style={styles.poolInfoContainer}>
                                <Ionicons name="people-circle-outline" size={16} color="#10B981" />
                                <Text style={styles.poolInfoText}>
                                    {poolsLoading ? 'Checking pools...' : `${pools.filter(p => !p.isClosed).length} active pools found`}
                                </Text>
                            </View>
                        )}

                        {/* Action Buttons */}
                        <View style={styles.footer}>
                            <TouchableOpacity
                                style={[styles.submitButton, (!selectedRange || !autoSelectedPrediction) && styles.submitButtonDisabled]}
                                onPress={handleVote}
                                disabled={!selectedRange || !autoSelectedPrediction || isLoading}
                            >
                                {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitButtonText}>Confirm Entry</Text>}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContainer: { backgroundColor: '#111827', borderTopLeftRadius: 30, borderTopRightRadius: 30, maxHeight: '85%' },
    sheetHandle: { width: 40, height: 4, backgroundColor: '#374151', borderRadius: 2, alignSelf: 'center', marginTop: 12 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },
    closeIcon: { backgroundColor: '#1F2937', padding: 6, borderRadius: 20 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
    scoreboardCard: { 
        flexDirection: 'row', 
        backgroundColor: '#1F2937', 
        padding: 20, 
        borderRadius: 20, 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#374151'
    },
    teamContainer: { alignItems: 'center', width: '40%' },
    teamLogo: { width: 50, height: 50, marginBottom: 8 },
    teamName: { color: '#9CA3AF', fontSize: 12, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
    scoreInput: { 
        backgroundColor: '#111827', 
        width: 65, 
        height: 55, 
        borderRadius: 12, 
        color: '#FFF', 
        fontSize: 24, 
        fontWeight: '900', 
        textAlign: 'center', 
        borderWidth: 1, 
        borderColor: '#374151' 
    },
    scoreInputActive: { borderColor: '#3B82F6', backgroundColor: '#1E293B' },
    vsContainer: { alignItems: 'center' },
    vsLabel: { color: '#4B5563', fontWeight: '900', fontSize: 14, marginBottom: 4 },
    vsLine: { width: 1, height: 40, backgroundColor: '#374151' },
    badgeRow: { height: 40, justifyContent: 'center', alignItems: 'center', marginTop: -15 },
    predictionBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
    predictionBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    sectionTitle: { color: '#6B7280', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginBottom: 16, marginTop: 10 },
    stakeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    stakeChip: { 
        width: '31%', 
        backgroundColor: '#1F2937', 
        paddingVertical: 14, 
        borderRadius: 12, 
        alignItems: 'center', 
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#374151'
    },
    stakeChipActive: { backgroundColor: '#3B82F6', borderColor: '#60A5FA' },
    stakeText: { color: '#9CA3AF', fontWeight: '700', fontSize: 13 },
    stakeTextActive: { color: '#FFF', fontWeight: '800' },
    poolInfoContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    poolInfoText: { color: '#10B981', fontSize: 12, fontWeight: '600', marginLeft: 6 },
    footer: { marginTop: 30 },
    submitButton: { 
        backgroundColor: '#10B981', 
        paddingVertical: 18, 
        borderRadius: 16, 
        alignItems: 'center',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    submitButtonDisabled: { backgroundColor: '#374151', shadowOpacity: 0 },
    submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
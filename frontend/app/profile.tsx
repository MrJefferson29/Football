import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { fonts } from '@/utils/typography';
import * as ImagePicker from 'expo-image-picker';
import { uploadAPI } from '@/utils/api';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '@/i18n';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { user, logout, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const points = user?.points ?? 0;
  const accuracy = user?.accuracy ?? 0;
  const rank = user?.rank || 'Bronze';
  const totalPredictions = user?.totalPredictions ?? 0;
  const correctPredictions = user?.correctPredictions ?? 0;
  const referrals = user?.referrals ?? 0;
  const referralCode = user?.referralCode || '';
  const referralLink = referralCode
    ? `https://fanarena.app/register?ref=${referralCode}`
    : '—';

  const handleChangePhoto = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('Permission needed'),
          t('Please allow photo access to change your avatar.')
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      setUploadingAvatar(true);
      const uploadRes = await uploadAPI.uploadImage(
        result.assets[0].uri,
        'avatars'
      );

      if (uploadRes.success && uploadRes.data?.url) {
        await updateProfile({ avatar: uploadRes.data.url });
        Alert.alert(t('Success'), t('Profile photo updated.'));
      } else {
        throw new Error(uploadRes.message);
      }
    } catch (error: any) {
      Alert.alert(t('Error'), error.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert(t('Copied!'), t('Copied to clipboard'));
  };

  const confirmLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('Profile')}</Text>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarWrapper}>
            <Image
              source={{
                uri:
                  user?.avatar ||
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
              }}
              style={styles.profileAvatar}
            />
          </View>

          <TouchableOpacity
            style={styles.changePhotoButton}
            onPress={handleChangePhoto}
            activeOpacity={0.85}
            disabled={uploadingAvatar}
          >
            {uploadingAvatar ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.changePhotoText}>
                {t('Change Photo')}
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.profileName}>
            {user?.username || 'User'}
          </Text>

          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{rank} Tier</Text>
          </View>

          <Text style={styles.profileEmail}>
            {user?.email || ''}
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {[
            { label: 'Points', value: points },
            { label: 'Accuracy', value: `${accuracy}%` },
            { label: 'Predictions', value: totalPredictions },
            { label: 'Correct Picks', value: correctPredictions },
            { label: 'Referrals', value: referrals },
          ].map((item, index) => (
            <View key={index} style={styles.statCard}>
              <Text style={styles.statValue}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Language Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('Language')}</Text>
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[
                styles.langButton,
                i18n.language === 'en' && styles.langButtonActive,
              ]}
              onPress={() => setLanguage('en')}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.langText,
                  i18n.language === 'en' && styles.langTextActive,
                ]}
              >
                English
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.langButton,
                i18n.language === 'fr' && styles.langButtonActive,
              ]}
              onPress={() => setLanguage('fr')}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.langText,
                  i18n.language === 'fr' && styles.langTextActive,
                ]}
              >
                Français
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Referral Section */}
        <View style={styles.referralCard}>
          <View style={styles.referralHeader}>
            <Ionicons name="gift-outline" size={20} color="#3B82F6" />
            <Text style={styles.referralTitle}>
              {t('Your Referral Code')}
            </Text>
          </View>

          {referralCode ? (
            <>
              <Text style={styles.referralCode}>
                {referralCode}
              </Text>

              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => copyToClipboard(referralCode)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="copy-outline"
                  size={18}
                  color="#FFF"
                />
                <Text style={styles.copyButtonText}>
                  {t('Copy Code')}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.noReferralCode}>
              {t('No referral code available')}
            </Text>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          {['profile', 'rewards'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && styles.activeTab,
              ]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.9}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText,
                ]}
              >
                {tab === 'profile' ? 'Profile' : 'Rewards'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.85}
          onPress={confirmLogout}
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color="#EF4444"
          />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },

  header: {
    paddingVertical: 20,
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 22,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
  },

  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },

  avatarWrapper: {
    padding: 4,
    borderRadius: 60,
    backgroundColor: 'rgba(59,130,246,0.15)',
    marginBottom: 15,
  },

  profileAvatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#3B82F6',
  },

  changePhotoButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 15,
  },

  changePhotoText: {
    color: '#FFF',
    fontFamily: fonts.bodySemiBold,
  },

  profileName: {
    fontSize: 24,
    fontFamily: fonts.heading,
    color: '#FFFFFF',
  },

  profileEmail: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 6,
  },

  levelBadge: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
  },

  levelText: {
    color: '#FFF',
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },

  statCard: {
    backgroundColor: '#1E293B',
    width: '48%',
    borderRadius: 18,
    paddingVertical: 22,
    alignItems: 'center',
    marginBottom: 15,
  },

  statValue: {
    fontSize: 22,
    color: '#FFF',
    fontFamily: fonts.bodySemiBold,
  },

  statLabel: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 6,
  },

  sectionCard: {
    marginHorizontal: 20,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: '#FFF',
    marginBottom: 15,
  },

  langRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  langButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#111827',
    alignItems: 'center',
    marginHorizontal: 5,
  },

  langButtonActive: {
    backgroundColor: '#3B82F6',
  },

  langText: {
    color: '#94A3B8',
    fontFamily: fonts.bodyMedium,
  },

  langTextActive: {
    color: '#FFF',
  },

  referralCard: {
    margin: 20,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.4)',
  },

  referralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  referralTitle: {
    marginLeft: 8,
    color: '#FFF',
    fontFamily: fonts.bodySemiBold,
  },

  referralCode: {
    fontSize: 28,
    color: '#60A5FA',
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 15,
  },

  copyButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },

  copyButtonText: {
    color: '#FFF',
    fontFamily: fonts.bodySemiBold,
  },

  noReferralCode: {
    color: '#94A3B8',
    textAlign: 'center',
  },

  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#111827',
    borderRadius: 30,
    padding: 6,
    marginBottom: 20,
  },

  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 25,
  },

  activeTab: {
    backgroundColor: '#3B82F6',
  },

  tabText: {
    color: '#94A3B8',
    fontFamily: fonts.bodyMedium,
  },

  activeTabText: {
    color: '#FFF',
  },

  logoutButton: {
    marginHorizontal: 20,
    marginBottom: 40,
    paddingVertical: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EF4444',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },

  logoutText: {
    color: '#EF4444',
    fontFamily: fonts.bodySemiBold,
  },
});
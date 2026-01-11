import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, StatusBar, Platform, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

export default function LandingScreen({ navigation }) {
    const handleJoinNow = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        navigation.navigate('Home');
    };

    return (
        <View style={styles.wrapper}>
            <StatusBar barStyle="dark-content" />
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
            >
                <View style={[styles.header, { alignItems: 'flex-start' }]}>
                    <TouchableOpacity onPress={() => navigation.navigate('Landing')}>
                        <Image source={require('../assets/pilahub_logo.png')} style={{ width: 200, height: 80, resizeMode: 'contain' }} />
                    </TouchableOpacity>
                </View>

                {/* Hero Section */}
                <View style={styles.section}>
                    <Text style={styles.heroTitle}>
                        Smart, Efficient, and User-Centered Queue Management
                    </Text>
                    <Text style={styles.heroDescription}>
                        A digital solution designed to organize and manage customer flow efficiently. Minimizing congestion, reducing customer waiting times, and improving both customer experience and operational efficiency.
                    </Text>

                    <TouchableOpacity style={styles.joinButton} onPress={handleJoinNow}>
                        <Text style={styles.joinButtonText}>Join Now</Text>
                    </TouchableOpacity>
                </View>

                {/* Features Grid */}
                <View style={styles.featuresGrid}>
                    <View style={styles.featureRow}>
                        <View style={styles.featureItem}>
                            <Ionicons name="time-outline" size={28} color="#0D9488" />
                            <Text style={styles.featureText}>Reduce customer{'\n'}waiting time</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Ionicons name="stats-chart" size={28} color="#0D9488" />
                            <Text style={styles.featureText}>With line-free flow{'\n'}monitoring system</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Ionicons name="qr-code-outline" size={28} color="#0D9488" />
                            <Text style={styles.featureText}>Join queue easily{'\n'}through QR code</Text>
                        </View>
                    </View>
                    <View style={styles.featureRow}>
                        <View style={styles.featureItem}>
                            <Ionicons name="star" size={28} color="#F59E0B" />
                            <Text style={styles.featureText}>Improve customer{'\n'}satisfaction</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Ionicons name="notifications" size={28} color="#F59E0B" />
                            <Text style={styles.featureText}>Notified when it's{'\n'}your turn</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Ionicons name="flash" size={28} color="#0D9488" />
                            <Text style={styles.featureText}>Real-time queue{'\n'}updates</Text>
                        </View>
                    </View>
                </View>



                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        ...(Platform.OS === 'web' ? { height: '100vh' } : {}),
    },
    container: {
        flex: 1,
        ...(Platform.OS === 'web' ? { height: '100%' } : {}),
    },
    scrollContent: {
        flexGrow: 1,
        ...(Platform.OS === 'web' ? { paddingBottom: 40 } : {}),
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    logo: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
    },
    section: {
        paddingHorizontal: 24,
        marginBottom: 40,
    },
    heroTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1F2937',
        lineHeight: 32,
        marginBottom: 16,
    },
    heroDescription: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 22,
        marginBottom: 24,
    },
    joinButton: {
        backgroundColor: '#1F2937',
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    joinButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    featuresGrid: {
        paddingHorizontal: 24,
        marginBottom: 48,
    },
    featureRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    featureItem: {
        width: (width - 48) / 3,
        alignItems: 'center',
    },
    featureText: {
        fontSize: 11,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 16,
        marginTop: 10,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 24,
    },
    useCaseCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        padding: 20,
        marginBottom: 12,
    },
    useCaseTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0D9488',
        marginBottom: 4,
    },
    useCaseDesc: {
        fontSize: 13,
        color: '#6B7280',
    },
    ctaSection: {
        paddingHorizontal: 24,
        paddingVertical: 40,
        backgroundColor: '#F9FAFB',
        alignItems: 'center',
    },
    ctaTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 20,
    },
});

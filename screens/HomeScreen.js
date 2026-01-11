import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, StatusBar, Image } from 'react-native';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
    const handlePress = (screen) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        navigation.navigate(screen);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={[styles.header, { alignItems: 'flex-start' }]}>
                <TouchableOpacity onPress={() => navigation.navigate('Landing')}>
                    <Image source={require('../assets/pilahub_logo.png')} style={{ width: 200, height: 80, resizeMode: 'contain' }} />
                </TouchableOpacity>
            </View>

            {/* Main Content */}
            <View style={styles.content}>
                <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => handlePress('User')}
                    activeOpacity={0.9}
                >
                    <Text style={styles.primaryButtonText}>Get a number</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => handlePress('Admin')}
                    activeOpacity={0.7}
                >
                    <Text style={styles.secondaryButtonText}>Admin</Text>
                </TouchableOpacity>
            </View>

            {/* Close Button */}
            <TouchableOpacity style={styles.closeButton}>
                <Text style={styles.closeIcon}>×</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        alignItems: 'flex-start',
    },
    logo: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        letterSpacing: 0.5,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    primaryButton: {
        width: '100%',
        backgroundColor: '#1F2937',
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 16,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#6B7280',
        fontSize: 16,
        fontWeight: '500',
        textDecorationLine: 'underline',
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        padding: 10,
    },
    closeIcon: {
        fontSize: 28,
        color: '#9CA3AF',
        fontWeight: '300',
    },
});

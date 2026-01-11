import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';

export default function LoadingSpinner({ message = 'Loading...' }) {
    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#0D9488" />
            <Text style={styles.text}>{message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    text: {
        marginTop: 16,
        fontSize: 16,
        color: '#6B7280',
    },
});

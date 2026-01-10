import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Dimensions, StatusBar } from 'react-native';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import QRCode from 'react-native-qrcode-svg';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function AdminScreen({ navigation }) {
    const [queue, setQueue] = useState([]);
    const [showQR, setShowQR] = useState(false);
    const [isMonitorMode, setIsMonitorMode] = useState(false);
    const [stats, setStats] = useState({ waiting: 0, served: 0 });
    const [nowServingNumber, setNowServingNumber] = useState(null);

    useEffect(() => {
        const q = query(collection(db, "queue"), orderBy("timestamp", "asc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const tickets = [];
            let waitingCount = 0;
            let servedCount = 0;
            let currentServing = null;

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                tickets.push({ id: doc.id, ...data });
                if (data.status === 'waiting') waitingCount++;
                if (data.status === 'done') servedCount++;
                if (data.status === 'serving') currentServing = data.ticketNumber;
            });
            setQueue(tickets);
            setStats({ waiting: waitingCount, served: servedCount });
            setNowServingNumber(currentServing);
        });
        return () => unsubscribe();
    }, []);

    const notifyUser = async (id) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await updateDoc(doc(db, "queue", id), { notification: Date.now() });
        Alert.alert("Sent", "Notification sent to user.");
    };

    const callNext = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const servingTickets = queue.filter(t => t.status === 'serving');
        for (const ticket of servingTickets) {
            await updateDoc(doc(db, "queue", ticket.id), { status: 'done' });
        }

        const nextTicket = queue.find(t => t.status === 'waiting');
        if (nextTicket) {
            await updateDoc(doc(db, "queue", nextTicket.id), { status: 'serving' });
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert("Queue Empty", "No waiting tickets.");
        }
    };

    const completeServing = async (id) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await updateDoc(doc(db, "queue", id), { status: 'done' });
    };

    const resetQueue = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
            "Reset Queue",
            "Are you sure? This will delete all tickets.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reset",
                    style: "destructive",
                    onPress: async () => {
                        const q = query(collection(db, "queue"));
                        const snapshot = await getDocs(q);
                        snapshot.forEach(async (d) => {
                            await deleteDoc(doc(db, "queue", d.id));
                        });
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }
                }
            ]
        );
    };

    const renderItem = (item) => {
        const isServing = item.status === 'serving';
        const isDone = item.status === 'done';

        return (
            <View key={item.id} style={[styles.queueItem, isServing && styles.queueItemServing, isDone && styles.queueItemDone]}>
                <View style={styles.queueItemLeft}>
                    <Text style={[styles.queueNumber, isServing && styles.queueNumberServing]}>#{item.ticketNumber}</Text>
                    <View style={[styles.statusBadge, isServing && styles.statusBadgeServing, isDone && styles.statusBadgeDone]}>
                        <Text style={[styles.statusText, isServing && styles.statusTextServing, isDone && styles.statusTextDone]}>
                            {item.status.toUpperCase()}
                        </Text>
                    </View>
                </View>
                {isServing && (
                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.notifyButton} onPress={() => notifyUser(item.id)}>
                            <Text style={styles.notifyButtonText}>🔔</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.doneButton} onPress={() => completeServing(item.id)}>
                            <Text style={styles.doneButtonText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    // Monitor Mode
    if (isMonitorMode) {
        return (
            <View style={styles.monitorContainer}>
                <StatusBar barStyle="light-content" />
                <TouchableOpacity style={styles.exitMonitorButton} onPress={() => setIsMonitorMode(false)}>
                    <Text style={styles.exitMonitorText}>×</Text>
                </TouchableOpacity>

                <View style={styles.monitorContent}>
                    <Text style={styles.monitorLabel}>NOW SERVING</Text>
                    <Text style={styles.monitorNumber}>{nowServingNumber || '--'}</Text>
                    <View style={styles.monitorStats}>
                        <Text style={styles.monitorStatText}>{stats.waiting} waiting</Text>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <Text style={styles.logo}>PilaHub</Text>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                        <Text style={styles.closeIcon}>×</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.headerTitle}>Admin Dashboard</Text>
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{stats.waiting}</Text>
                    <Text style={styles.statLabel}>Waiting</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{stats.served}</Text>
                    <Text style={styles.statLabel}>Served</Text>
                </View>
                <View style={[styles.statCard, styles.statCardHighlight]}>
                    <Text style={[styles.statValue, styles.statValueHighlight]}>{nowServingNumber || '-'}</Text>
                    <Text style={[styles.statLabel, styles.statLabelHighlight]}>Now Serving</Text>
                </View>
            </View>

            {/* Controls */}
            <View style={styles.controls}>
                <TouchableOpacity style={styles.primaryButton} onPress={callNext}>
                    <Text style={styles.primaryButtonText}>Call Next</Text>
                </TouchableOpacity>
                <View style={styles.controlRow}>
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowQR(true)}>
                        <Text style={styles.secondaryButtonText}>Show QR</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => setIsMonitorMode(true)}>
                        <Text style={styles.secondaryButtonText}>Monitor</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Queue List */}
            <View style={styles.listSection}>
                <Text style={styles.sectionTitle}>Queue</Text>
                <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={true}>
                    {queue.map((item) => renderItem(item))}
                    {queue.length === 0 && (
                        <Text style={styles.emptyText}>No tickets in queue</Text>
                    )}
                </ScrollView>
            </View>

            {/* Reset Button */}
            <TouchableOpacity style={styles.resetButton} onPress={resetQueue}>
                <Text style={styles.resetButtonText}>Reset Queue</Text>
            </TouchableOpacity>

            {/* QR Modal */}
            <Modal visible={showQR} animationType="fade" transparent={true}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Scan to Join Queue</Text>
                        <View style={styles.qrContainer}>
                            <QRCode value="JOIN_QUEUE" size={200} />
                        </View>
                        <TouchableOpacity style={styles.modalButton} onPress={() => setShowQR(false)}>
                            <Text style={styles.modalButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
        paddingHorizontal: 24,
        paddingBottom: 20,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    logo: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        letterSpacing: 0.5,
    },
    closeButton: {
        padding: 5,
    },
    closeIcon: {
        fontSize: 28,
        color: '#9CA3AF',
        fontWeight: '300',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1F2937',
    },
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    statCardHighlight: {
        backgroundColor: '#0D9488',
        borderColor: '#0D9488',
    },
    statValue: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1F2937',
    },
    statValueHighlight: {
        color: '#FFFFFF',
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    statLabelHighlight: {
        color: 'rgba(255,255,255,0.8)',
    },
    controls: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    primaryButton: {
        backgroundColor: '#1F2937',
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 12,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    controlRow: {
        flexDirection: 'row',
        gap: 12,
    },
    secondaryButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#374151',
        fontSize: 14,
        fontWeight: '600',
    },
    listSection: {
        flex: 1,
        paddingHorizontal: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 12,
    },
    list: {
        flex: 1,
    },
    queueItem: {
        backgroundColor: '#F9FAFB',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    queueItemServing: {
        backgroundColor: '#0D9488',
        borderColor: '#0D9488',
    },
    queueItemDone: {
        opacity: 0.5,
    },
    queueItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    queueNumber: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
    },
    queueNumberServing: {
        color: '#FFFFFF',
    },
    statusBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusBadgeServing: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    statusBadgeDone: {
        backgroundColor: '#D1FAE5',
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#92400E',
        letterSpacing: 0.5,
    },
    statusTextServing: {
        color: '#FFFFFF',
    },
    statusTextDone: {
        color: '#065F46',
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    notifyButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notifyButtonText: {
        fontSize: 16,
    },
    doneButton: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    doneButtonText: {
        color: '#0D9488',
        fontWeight: '600',
        fontSize: 14,
    },
    emptyText: {
        textAlign: 'center',
        color: '#9CA3AF',
        fontSize: 14,
        marginTop: 40,
    },
    resetButton: {
        position: 'absolute',
        bottom: 30,
        left: 24,
        right: 24,
        backgroundColor: '#FEE2E2',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    resetButtonText: {
        color: '#DC2626',
        fontSize: 14,
        fontWeight: '600',
    },
    // Monitor Mode
    monitorContainer: {
        flex: 1,
        backgroundColor: '#1F2937',
        justifyContent: 'center',
        alignItems: 'center',
    },
    exitMonitorButton: {
        position: 'absolute',
        top: 50,
        right: 30,
        padding: 10,
    },
    exitMonitorText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 36,
        fontWeight: '300',
    },
    monitorContent: {
        alignItems: 'center',
    },
    monitorLabel: {
        color: '#0D9488',
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: 4,
        marginBottom: 20,
    },
    monitorNumber: {
        color: '#FFFFFF',
        fontSize: 160,
        fontWeight: '800',
    },
    monitorStats: {
        marginTop: 40,
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
    },
    monitorStatText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 18,
    },
    // Modal
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        padding: 32,
        borderRadius: 16,
        alignItems: 'center',
        marginHorizontal: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 24,
    },
    qrContainer: {
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
    },
    modalButton: {
        marginTop: 24,
        paddingVertical: 12,
        paddingHorizontal: 32,
    },
    modalButtonText: {
        color: '#6B7280',
        fontSize: 16,
        fontWeight: '600',
    },
});

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Dimensions, StatusBar, Platform, TextInput, KeyboardAvoidingView, Image } from 'react-native';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import QRCode from 'react-native-qrcode-svg';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import CustomModal from '../components/CustomModal';

const { width, height } = Dimensions.get('window');
const ADMIN_PASSWORD = 'admin123'; // Default password

export default function AdminScreen({ navigation }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [passwordError, setPasswordError] = useState(false);
    const [queue, setQueue] = useState([]);
    const [showQR, setShowQR] = useState(false);
    const [isMonitorMode, setIsMonitorMode] = useState(false);
    const [stats, setStats] = useState({ waiting: 0, served: 0 });
    const [nowServingNumber, setNowServingNumber] = useState(null);
    const [resetModalVisible, setResetModalVisible] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) return;

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
    }, [isAuthenticated]);

    const handleLogin = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (passwordInput === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            setPasswordError(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
            setPasswordError(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    };

    const notifyUser = async (id) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await updateDoc(doc(db, "queue", id), { notification: Date.now() });
            if (Platform.OS === 'web') {
                window.alert("Notification sent to user.");
            } else {
                Alert.alert("Sent", "Notification sent to user.");
            }
        } catch (error) {
            console.error("Notify failed:", error);
            Alert.alert("Error", "Failed to send notification.");
        }
    };

    const callNext = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const servingTickets = queue.filter(t => t.status === 'serving');
        for (const ticket of servingTickets) {
            const servedAt = new Date();
            const joinedAt = ticket.timestamp?.toDate?.() || new Date();
            const waitTime = Math.round((servedAt - joinedAt) / 60000); // minutes
            await updateDoc(doc(db, "queue", ticket.id), {
                status: 'done',
                servedAt: servedAt,
                waitTime: waitTime
            });
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
        const ticket = queue.find(t => t.id === id);
        const servedAt = new Date();
        const joinedAt = ticket?.timestamp?.toDate?.() || new Date();
        const waitTime = Math.round((servedAt - joinedAt) / 60000);
        await updateDoc(doc(db, "queue", id), {
            status: 'done',
            servedAt: servedAt,
            waitTime: waitTime
        });
    };

    const resetQueue = () => {
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        setResetModalVisible(true);
    };

    const confirmResetQueue = async () => {
        try {
            const q = query(collection(db, "queue"));
            const snapshot = await getDocs(q);
            const deletePromises = snapshot.docs.map((d) =>
                deleteDoc(doc(db, "queue", d.id))
            );
            await Promise.all(deletePromises);
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (error) {
            console.error("Reset failed:", error);
        }
        setResetModalVisible(false);
    };

    const renderItem = (item) => {
        const isServing = item.status === 'serving';
        const isDone = item.status === 'done';

        return (
            <View key={item.id} style={[styles.queueItem, isServing && styles.queueItemServing, isDone && styles.queueItemDone]}>
                <View style={styles.queueItemLeft}>
                    <Text style={[styles.queueNumber, isServing && styles.queueNumberServing]}>#{item.ticketNumber}</Text>
                    <View style={[styles.statusBadge, isServing && styles.statusBadgeServing, isDone && styles.statusBadgeDone, { marginLeft: 12 }]}>
                        <Text style={[styles.statusText, isServing && styles.statusTextServing, isDone && styles.statusTextDone]}>
                            {item.status.toUpperCase()}
                        </Text>
                    </View>
                    {item.serviceType && (
                        <View style={[styles.serviceTypeBadge, { marginLeft: 8 }]}>
                            <Text style={styles.serviceTypeText}>{item.serviceType}</Text>
                        </View>
                    )}
                </View>
                {isServing && (
                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.notifyButton} onPress={() => notifyUser(item.id)}>
                            <Ionicons name="notifications" size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.doneButton, { marginLeft: 8 }]} onPress={() => completeServing(item.id)}>
                            <Text style={styles.doneButtonText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    // Login Screen
    if (!isAuthenticated) {
        return (
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <StatusBar barStyle="dark-content" />

                <View style={styles.header}>
                    <View style={[styles.headerTop, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                        <TouchableOpacity onPress={() => navigation.navigate('Landing')}>
                            <Image source={require('../assets/pilahub_logo.png')} style={{ width: 200, height: 80, resizeMode: 'contain' }} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                            <Text style={styles.closeIcon}>×</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.loginContainer}>
                    <View style={styles.lockIcon}>
                        <Ionicons name="lock-closed" size={36} color="#0D9488" />
                    </View>
                    <Text style={styles.loginTitle}>Admin Access</Text>
                    <Text style={styles.loginSubtitle}>Enter password to continue</Text>

                    <TextInput
                        style={[styles.passwordInput, passwordError && styles.passwordInputError]}
                        placeholder="Enter password"
                        placeholderTextColor="#9CA3AF"
                        secureTextEntry
                        value={passwordInput}
                        onChangeText={(text) => {
                            setPasswordInput(text);
                            setPasswordError(false);
                        }}
                        onSubmitEditing={handleLogin}
                    />
                    {passwordError && (
                        <Text style={styles.errorText}>Incorrect password</Text>
                    )}

                    <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                        <Text style={styles.loginButtonText}>Login</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        );
    }

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
                <View style={[styles.headerTop, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                    <TouchableOpacity onPress={() => navigation.navigate('Landing')}>
                        <Image source={require('../assets/pilahub_logo.png')} style={{ width: 200, height: 80, resizeMode: 'contain' }} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                        <Text style={styles.closeIcon}>×</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.headerTitle}>Admin Dashboard</Text>
            </View>

            {/* Dashboard Content */}
            <View style={styles.content}>
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
                    <View style={styles.controlRow}>
                        <TouchableOpacity style={styles.secondaryButtonWithIcon} onPress={() => navigation.navigate('ServiceSetup')}>
                            <Ionicons name="settings-outline" size={18} color="#374151" />
                            <Text style={[styles.secondaryButtonText, { marginLeft: 6 }]}>Services</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.secondaryButtonWithIcon} onPress={() => navigation.navigate('Analytics')}>
                            <Ionicons name="bar-chart-outline" size={18} color="#374151" />
                            <Text style={[styles.secondaryButtonText, { marginLeft: 6 }]}>Analytics</Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={[styles.secondaryButton, { borderColor: '#FEE2E2', backgroundColor: '#FEF2F2', marginTop: 8, marginHorizontal: 0 }]} onPress={resetQueue}>
                        <Text style={[styles.secondaryButtonText, { color: '#DC2626' }]}>Reset Queue</Text>
                    </TouchableOpacity>
                </View>

                {/* Queue List */}
                <View style={styles.listSection}>
                    <Text style={styles.sectionTitle}>Queue</Text>
                    {Platform.OS === 'web' ? (
                        <View style={{ height: 400, overflowY: 'auto', width: '100%', borderRadius: 12, backgroundColor: '#fff' }}>
                            <View style={{ paddingBottom: 20 }}>
                                {queue.map((item) => renderItem(item))}
                                {queue.length === 0 && (
                                    <Text style={styles.emptyText}>No tickets in queue</Text>
                                )}
                            </View>
                        </View>
                    ) : (
                        <View style={styles.listWrapper}>
                            <ScrollView
                                style={styles.list}
                                contentContainerStyle={{ paddingBottom: 20 }}
                                showsVerticalScrollIndicator={true}
                            >
                                {queue.map((item) => renderItem(item))}
                                {queue.length === 0 && (
                                    <Text style={styles.emptyText}>No tickets in queue</Text>
                                )}
                            </ScrollView>
                        </View>
                    )}
                </View>


            </View>

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

            {/* Reset Queue Confirmation Modal */}
            <CustomModal
                visible={resetModalVisible}
                type="warning"
                title="Reset Queue"
                message="Are you sure you want to reset the queue? This will delete all tickets and cannot be undone."
                confirmText="Reset"
                cancelText="Cancel"
                onConfirm={confirmResetQueue}
                onCancel={() => setResetModalVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    content: {
        flex: 1,
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
    // Login Styles
    loginContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    lockIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    lockEmoji: {
        fontSize: 36,
    },
    loginTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
    },
    loginSubtitle: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 32,
    },
    passwordInput: {
        width: '100%',
        backgroundColor: '#F9FAFB',
        padding: 16,
        borderRadius: 12,
        fontSize: 16,
        color: '#1F2937',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        textAlign: 'center',
        marginBottom: 16,
    },
    passwordInputError: {
        borderColor: '#EF4444',
        backgroundColor: '#FEF2F2',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 14,
        marginBottom: 16,
    },
    loginButton: {
        width: '100%',
        backgroundColor: '#1F2937',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    // Stats
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 18,
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
        marginHorizontal: 6,
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
        marginBottom: 8,
    },
    secondaryButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 6,
    },
    secondaryButtonText: {
        color: '#374151',
        fontSize: 14,
        fontWeight: '600',
    },
    secondaryButtonWithIcon: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        marginHorizontal: 6,
    },
    listSection: {
        flex: 1,
        paddingHorizontal: 24,
        minHeight: 0,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 12,
    },
    listWrapper: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
        ...(Platform.OS === 'web' ? { height: '50vh' } : {}),
    },
    list: {
        flex: 1,
        ...(Platform.OS === 'web' ? { overflowY: 'auto', height: '100%' } : {}),
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
    serviceTypeBadge: {
        backgroundColor: '#E0E7FF',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    serviceTypeText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#4338CA',
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
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
        marginTop: 16,
        marginHorizontal: 24,
        marginBottom: 30,
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

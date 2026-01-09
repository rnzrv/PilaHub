import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Dimensions, Modal, StatusBar } from 'react-native';
import { db } from '../firebaseConfig';
import { collection, addDoc, onSnapshot, query, orderBy, limit, doc, where, getDocs } from 'firebase/firestore';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';

const { width } = Dimensions.get('window');

export default function UserScreen({ navigation }) {
    const [ticketId, setTicketId] = useState(null);
    const [ticketData, setTicketData] = useState(null);
    const [nowServing, setNowServing] = useState(null);
    const [password, setPassword] = useState('');
    const [peopleAhead, setPeopleAhead] = useState(0);
    const [permission, requestPermission] = useCameraPermissions();
    const [showCamera, setShowCamera] = useState(false);
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        const q = query(collection(db, "queue"), where("status", "==", "serving"), limit(1));
        const unsub = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                setNowServing(snapshot.docs[0].data().ticketNumber);
            } else {
                setNowServing(null);
            }
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (ticketId) {
            const unsub = onSnapshot(doc(db, "queue", ticketId), (doc) => {
                setTicketData(doc.data());
            });
            return () => unsub();
        }
    }, [ticketId]);

    useEffect(() => {
        if (ticketData && nowServing) {
            const diff = ticketData.ticketNumber - nowServing;
            setPeopleAhead(diff > 0 ? diff : 0);
        }
    }, [ticketData, nowServing]);

    useEffect(() => {
        if (ticketData?.status === 'serving') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    }, [ticketData?.status]);

    const handleJoinQueue = async (method = 'code') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (method === 'code' && password !== "12345") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        try {
            const q = query(collection(db, "queue"), orderBy("timestamp", "desc"), limit(1));
            const snapshot = await getDocs(q);
            let nextNumber = 1;
            if (!snapshot.empty) {
                nextNumber = snapshot.docs[0].data().ticketNumber + 1;
            }

            const docRef = await addDoc(collection(db, "queue"), {
                timestamp: new Date(),
                status: 'waiting',
                ticketNumber: nextNumber
            });
            setTicketId(docRef.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setPassword('');
            setShowCamera(false);
        } catch (e) {
            console.error("Error adding document: ", e);
        }
    };

    const handleBarCodeScanned = async ({ type, data }) => {
        if (scanned) return;
        setScanned(true);

        if (data !== "JOIN_QUEUE") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setScanned(false);
            return;
        }

        await handleJoinQueue('qr');
    };

    const handleLeaveQueue = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTicketId(null);
        setTicketData(null);
        setScanned(false);
    };

    const openCamera = async () => {
        if (!permission) return;
        if (!permission.granted) {
            const result = await requestPermission();
            if (!result.granted) return;
        }
        setScanned(false);
        setShowCamera(true);
    };

    // Ticket View
    if (ticketData) {
        const isServing = ticketData.status === 'serving';
        const isDone = ticketData.status === 'done';

        return (
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" />

                <View style={styles.header}>
                    <Text style={styles.logo}>PilaHub</Text>
                    <TouchableOpacity onPress={handleLeaveQueue} style={styles.closeButton}>
                        <Text style={styles.closeIcon}>×</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.ticketContainer}>
                    <View style={[styles.ticketCard, isServing && styles.ticketCardServing]}>
                        <Text style={styles.ticketLabel}>Your Number</Text>
                        <Text style={[styles.ticketNumber, isServing && styles.ticketNumberServing]}>
                            {ticketData.ticketNumber}
                        </Text>
                        <View style={[styles.statusBadge, isServing && styles.statusBadgeServing, isDone && styles.statusBadgeDone]}>
                            <Text style={[styles.statusText, isServing && styles.statusTextServing, isDone && styles.statusTextDone]}>
                                {isServing ? 'NOW SERVING' : isDone ? 'COMPLETED' : 'WAITING'}
                            </Text>
                        </View>
                    </View>

                    {!isDone && (
                        <View style={styles.infoCard}>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Now Serving</Text>
                                <Text style={styles.infoValue}>#{nowServing || '-'}</Text>
                            </View>
                            {!isServing && (
                                <>
                                    <View style={styles.divider} />
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>People Ahead</Text>
                                        <Text style={styles.infoValue}>{peopleAhead}</Text>
                                    </View>
                                    <View style={styles.divider} />
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Est. Wait</Text>
                                        <Text style={styles.infoValue}>{peopleAhead * 2} min</Text>
                                    </View>
                                </>
                            )}
                        </View>
                    )}

                    {isDone && (
                        <TouchableOpacity style={styles.primaryButton} onPress={handleLeaveQueue}>
                            <Text style={styles.primaryButtonText}>Done</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    }

    // Join Queue View
    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <Text style={styles.logo}>PilaHub</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                    <Text style={styles.closeIcon}>×</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <Text style={styles.title}>Join Queue</Text>
                <Text style={styles.subtitle}>Enter the queue code or scan QR</Text>

                <View style={styles.nowServingCard}>
                    <Text style={styles.nowServingLabel}>Now Serving</Text>
                    <Text style={styles.nowServingValue}>#{nowServing || '-'}</Text>
                </View>

                <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>Queue Code</Text>
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Enter code"
                        keyboardType="numeric"
                        placeholderTextColor="#9CA3AF"
                    />
                </View>

                <TouchableOpacity style={styles.primaryButton} onPress={() => handleJoinQueue('code')}>
                    <Text style={styles.primaryButtonText}>Get Number</Text>
                </TouchableOpacity>

                <View style={styles.orDivider}>
                    <View style={styles.line} />
                    <Text style={styles.orText}>or</Text>
                    <View style={styles.line} />
                </View>

                <TouchableOpacity style={styles.secondaryButton} onPress={openCamera}>
                    <Text style={styles.secondaryButtonText}>Scan QR Code</Text>
                </TouchableOpacity>
            </View>

            <Modal visible={showCamera} animationType="slide">
                <View style={styles.cameraContainer}>
                    <CameraView
                        style={styles.camera}
                        facing="back"
                        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                    />
                    <TouchableOpacity style={styles.closeCameraButton} onPress={() => setShowCamera(false)}>
                        <Text style={styles.closeCameraText}>Cancel</Text>
                    </TouchableOpacity>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 10,
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
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 32,
    },
    nowServingCard: {
        backgroundColor: '#F9FAFB',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    nowServingLabel: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 4,
    },
    nowServingValue: {
        fontSize: 36,
        fontWeight: '700',
        color: '#1F2937',
    },
    inputSection: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F9FAFB',
        padding: 16,
        borderRadius: 8,
        fontSize: 16,
        color: '#1F2937',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    primaryButton: {
        backgroundColor: '#1F2937',
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    orDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E7EB',
    },
    orText: {
        marginHorizontal: 16,
        color: '#9CA3AF',
        fontSize: 14,
    },
    secondaryButton: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#374151',
        fontSize: 16,
        fontWeight: '600',
    },
    // Ticket View Styles
    ticketContainer: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 20,
    },
    ticketCard: {
        backgroundColor: '#F9FAFB',
        padding: 40,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    ticketCardServing: {
        backgroundColor: '#0D9488',
        borderColor: '#0D9488',
    },
    ticketLabel: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 8,
    },
    ticketNumber: {
        fontSize: 72,
        fontWeight: '800',
        color: '#1F2937',
        marginBottom: 16,
    },
    ticketNumberServing: {
        color: '#FFFFFF',
    },
    statusBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusBadgeServing: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    statusBadgeDone: {
        backgroundColor: '#D1FAE5',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#92400E',
        letterSpacing: 1,
    },
    statusTextServing: {
        color: '#FFFFFF',
    },
    statusTextDone: {
        color: '#065F46',
    },
    infoCard: {
        backgroundColor: '#F9FAFB',
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    infoLabel: {
        fontSize: 16,
        color: '#6B7280',
    },
    infoValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
    },
    // Camera Styles
    cameraContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    closeCameraButton: {
        position: 'absolute',
        bottom: 50,
        alignSelf: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 8,
    },
    closeCameraText: {
        color: '#1F2937',
        fontWeight: '600',
        fontSize: 16,
    },
});

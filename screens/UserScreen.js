import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Dimensions, Modal, StatusBar, Alert, Vibration, Platform, ScrollView, KeyboardAvoidingView, Image } from 'react-native';
import { db } from '../firebaseConfig';
import { collection, addDoc, onSnapshot, query, orderBy, limit, doc, where, getDocs } from 'firebase/firestore';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import CustomModal from '../components/CustomModal';

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

    // Service type selection
    const [serviceTypes, setServiceTypes] = useState([]);
    const [selectedService, setSelectedService] = useState(null);
    const [showServicePicker, setShowServicePicker] = useState(false);

    // Notification modals
    const [youreUpModalVisible, setYoureUpModalVisible] = useState(false);
    const [reminderModalVisible, setReminderModalVisible] = useState(false);

    // Load service types from Firebase
    useEffect(() => {
        const q = query(collection(db, "serviceTypes"), orderBy("order", "asc"));
        const unsub = onSnapshot(q, (snapshot) => {
            const types = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setServiceTypes(types);
        });
        return () => unsub();
    }, []);

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

    // Alert when it's your turn
    useEffect(() => {
        console.log('Status changed:', ticketData?.status);
        if (ticketData?.status === 'serving') {
            console.log('SHOWING YOURE UP MODAL');
            if (Platform.OS !== 'web') {
                Vibration.vibrate([0, 500, 200, 500, 200, 500]);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }
            setYoureUpModalVisible(true);
        }
    }, [ticketData?.status]);

    // Alert when admin sends notification
    useEffect(() => {
        console.log('Notification changed:', ticketData?.notification);
        if (ticketData?.notification) {
            console.log('SHOWING REMINDER MODAL');
            if (Platform.OS !== 'web') {
                Vibration.vibrate([0, 300, 100, 300, 100, 300, 100, 500]);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }
            setReminderModalVisible(true);
        }
    }, [ticketData?.notification]);

    const handleJoinQueue = async (method = 'code') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (method === 'code' && password !== "12345") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        // Check if service types exist but none selected
        if (serviceTypes.length > 0 && !selectedService) {
            setShowServicePicker(true);
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
                ticketNumber: nextNumber,
                serviceType: selectedService?.name || null
            });
            setTicketId(docRef.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setPassword('');
            setShowCamera(false);
            setSelectedService(null);
        } catch (e) {
            console.error("Error adding document: ", e);
            Alert.alert("Error", "Failed to join queue. Please try again.");
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

        // Check if need service selection
        if (serviceTypes.length > 0 && !selectedService) {
            setShowCamera(false);
            setShowServicePicker(true);
            return;
        }

        await handleJoinQueue('qr');
    };

    const handleSelectService = (service) => {
        setSelectedService(service);
        setShowServicePicker(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleLeaveQueue = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTicketId(null);
        setTicketData(null);
        setScanned(false);
        setSelectedService(null);
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

    // Render ticket view content
    const renderTicketView = () => {
        const isServing = ticketData.status === 'serving';
        const isDone = ticketData.status === 'done';

        return (
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" />

                <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                    <TouchableOpacity onPress={() => navigation.navigate('Landing')}>
                        <Image source={require('../assets/pilahub_logo.png')} style={{ width: 200, height: 80, resizeMode: 'contain' }} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleLeaveQueue} style={styles.closeButton}>
                        <Text style={styles.closeIcon}>×</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.ticketContainer}>
                    <View style={[styles.ticketCard, isServing && styles.ticketCardServing]}>
                        <Text style={[styles.ticketLabel, isServing && { color: 'rgba(255,255,255,0.7)' }]}>Your Number</Text>
                        <Text style={[styles.ticketNumber, isServing && styles.ticketNumberServing]}>
                            {ticketData.ticketNumber}
                        </Text>
                        <View style={[styles.statusBadge, isServing && styles.statusBadgeServing, isDone && styles.statusBadgeDone]}>
                            <Text style={[styles.statusText, isServing && styles.statusTextServing, isDone && styles.statusTextDone]}>
                                {isServing ? 'NOW SERVING' : isDone ? 'COMPLETED' : 'WAITING'}
                            </Text>
                        </View>
                        {ticketData.serviceType && (
                            <View style={[styles.serviceTag, isServing && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                <Text style={[styles.serviceTagText, isServing && { color: '#FFFFFF' }]}>
                                    {ticketData.serviceType}
                                </Text>
                            </View>
                        )}
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
    };

    // Render join queue view content  
    const renderJoinQueueView = () => (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <Image source={require('../assets/pilahub_logo.png')} style={{ width: 120, height: 40, resizeMode: 'contain' }} />
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                    <Text style={styles.closeIcon}>×</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
                <Text style={styles.title}>Join Queue</Text>
                <Text style={styles.subtitle}>Enter the queue code or scan QR</Text>

                <View style={styles.nowServingCard}>
                    <Text style={styles.nowServingLabel}>Now Serving</Text>
                    <Text style={styles.nowServingNumber}>#{nowServing || '-'}</Text>
                </View>

                {/* Service Type Selector */}
                {serviceTypes.length > 0 && (
                    <TouchableOpacity
                        style={styles.serviceSelector}
                        onPress={() => setShowServicePicker(true)}
                    >
                        {selectedService ? (
                            <View style={styles.selectedService}>
                                <View style={[styles.selectedServiceIconBox, { backgroundColor: selectedService.color + '20' }]}>
                                    <Ionicons name={selectedService.icon || 'cube-outline'} size={20} color={selectedService.color} />
                                </View>
                                <Text style={styles.serviceSelectorText}>{selectedService.name}</Text>
                            </View>
                        ) : (
                            <Text style={styles.serviceSelectorPrompt}>Select Service Type</Text>
                        )}
                        <Ionicons name="chevron-down" size={20} color="#6B7280" />
                    </TouchableOpacity>
                )}

                <TextInput
                    style={styles.input}
                    placeholder="Enter code"
                    value={password}
                    onChangeText={setPassword}
                    keyboardType="default"
                    placeholderTextColor="#9CA3AF"
                />

                <TouchableOpacity style={styles.primaryButton} onPress={() => handleJoinQueue('code')}>
                    <Text style={styles.primaryButtonText}>Get Number</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.qrButton} onPress={openCamera}>
                    <Ionicons name="qr-code-outline" size={20} color="#0D9488" />
                    <Text style={styles.qrButtonText}>Scan QR Code</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Service Type Picker Modal */}
            <Modal visible={showServicePicker} animationType="slide" transparent>
                <View style={styles.pickerOverlay}>
                    <View style={styles.pickerContent}>
                        <Text style={styles.pickerTitle}>Select Service</Text>
                        {serviceTypes.map((service) => (
                            <TouchableOpacity
                                key={service.id}
                                style={styles.pickerOption}
                                onPress={() => {
                                    setSelectedService(service);
                                    setShowServicePicker(false);
                                }}
                            >
                                <View style={styles.pickerOptionLeft}>
                                    <View style={[styles.pickerIconBox, { backgroundColor: service.color + '20' }]}>
                                        <Ionicons name={service.icon || 'cube-outline'} size={22} color={service.color} />
                                    </View>
                                    <Text style={styles.pickerOptionText}>{service.name}</Text>
                                </View>
                                {selectedService?.id === service.id && (
                                    <Ionicons name="checkmark-circle" size={24} color="#0D9488" />
                                )}
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={styles.pickerCancel}
                            onPress={() => setShowServicePicker(false)}
                        >
                            <Text style={styles.pickerCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Camera Modal */}
            <Modal visible={showCamera} animationType="slide">
                <View style={styles.cameraContainer}>
                    <CameraView
                        style={styles.camera}
                        facing="back"
                        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                        barcodeScannerSettings={{
                            barcodeTypes: ['qr'],
                        }}
                    />
                    <View style={styles.cameraOverlay}>
                        <View style={styles.scanFrame} />
                        <Text style={styles.scanText}>Point at QR code</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.cameraClose}
                        onPress={() => setShowCamera(false)}
                    >
                        <Text style={styles.cameraCloseText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );

    // Single return with modals always rendered
    return (
        <>
            {ticketData ? renderTicketView() : renderJoinQueueView()}

            {/* You're Up! Notification Modal */}
            <CustomModal
                visible={youreUpModalVisible}
                type="success"
                title="You're Up!"
                message="It's your turn! Please proceed to the counter now."
                onConfirm={() => setYoureUpModalVisible(false)}
            />

            {/* Reminder Notification Modal */}
            <CustomModal
                visible={reminderModalVisible}
                type="warning"
                title="Reminder"
                message="Please proceed to the counter immediately. You're being called!"
                onConfirm={() => setReminderModalVisible(false)}
            />
        </>
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
        ...(Platform.OS === 'web' ? { overflowY: 'auto', height: '100%' } : {}),
    },
    contentContainer: {
        paddingTop: 20,
        paddingBottom: 40,
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
        marginBottom: 24,
    },
    nowServingCard: {
        backgroundColor: '#F9FAFB',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 24,
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
    // Service Selector
    serviceSelector: {
        backgroundColor: '#F9FAFB',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    serviceSelectorLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 6,
    },
    serviceSelectorValue: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    serviceSelectorPlaceholder: {
        fontSize: 16,
        color: '#0D9488',
        fontWeight: '600',
    },
    selectedServiceDisplay: {
        flexDirection: 'row',
        alignItems: 'center',

    },
    selectedServiceIconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedServiceName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    selectServicePrompt: {
        flexDirection: 'row',
        alignItems: 'center',

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
    serviceTag: {
        marginTop: 12,
        backgroundColor: '#E0E7FF',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
    },
    serviceTagText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4338CA',
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
    // Service Picker Modal
    pickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    pickerContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '70%',
    },
    pickerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'center',
    },
    pickerSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 20,
    },
    serviceList: {
        maxHeight: 300,
    },
    serviceOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: '#F9FAFB',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    serviceOptionSelected: {
        borderColor: '#0D9488',
        backgroundColor: '#F0FDFA',
    },
    serviceOptionIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    serviceOptionEmoji: {
        fontSize: 22,
    },
    serviceOptionName: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    checkmark: {
        fontSize: 18,
        color: '#0D9488',
        fontWeight: '700',
    },
    pickerCancelButton: {
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    pickerCancelText: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '600',
    },
    // QR Button styles
    qrButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
    },
    qrButtonText: {
        marginLeft: 8,
        fontSize: 16,
        fontWeight: '600',
        color: '#0D9488',
    },
    // Service selector styles
    serviceSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F9FAFB',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 16,
    },
    selectedService: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    selectedServiceIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    serviceSelectorText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    serviceSelectorPrompt: {
        fontSize: 15,
        color: '#9CA3AF',
    },
    // Picker modal styles
    pickerOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 8,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
    },
    pickerOptionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pickerIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    pickerOptionText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    pickerCancel: {
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
    },
});

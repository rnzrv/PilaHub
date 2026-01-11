import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, StatusBar, Alert, Platform, KeyboardAvoidingView, Pressable } from 'react-native';
import { db } from '../firebaseConfig';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import * as Haptics from 'expo-haptics';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import CustomModal from '../components/CustomModal';

const ICON_OPTIONS = [
    { name: 'cash-outline', library: 'Ionicons' },
    { name: 'help-circle-outline', library: 'Ionicons' },
    { name: 'cube-outline', library: 'Ionicons' },
    { name: 'document-text-outline', library: 'Ionicons' },
    { name: 'construct-outline', library: 'Ionicons' },
    { name: 'medkit-outline', library: 'Ionicons' },
    { name: 'clipboard-outline', library: 'Ionicons' },
    { name: 'ticket-outline', library: 'Ionicons' },
    { name: 'call-outline', library: 'Ionicons' },
    { name: 'checkmark-circle-outline', library: 'Ionicons' },
    { name: 'refresh-outline', library: 'Ionicons' },
    { name: 'person-outline', library: 'Ionicons' },
];

const COLOR_OPTIONS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1'];

export default function ServiceSetupScreen({ navigation }) {
    const [services, setServices] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('cash-outline');
    const [color, setColor] = useState('#10B981');

    // Delete confirmation modal state
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [serviceToDelete, setServiceToDelete] = useState(null);

    useEffect(() => {
        const q = query(collection(db, "serviceTypes"), orderBy("order", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const serviceList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setServices(serviceList);
        });
        return () => unsubscribe();
    }, []);

    const openAddModal = () => {
        setEditingService(null);
        setName('');
        setIcon('cash-outline');
        setColor('#10B981');
        setShowModal(true);
    };

    const openEditModal = (service) => {
        setEditingService(service);
        setName(service.name);
        setIcon(service.icon || 'cash-outline');
        setColor(service.color);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a service name');
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            if (editingService) {
                await updateDoc(doc(db, "serviceTypes", editingService.id), {
                    name: name.trim(),
                    icon,
                    color
                });
            } else {
                await addDoc(collection(db, "serviceTypes"), {
                    name: name.trim(),
                    icon,
                    color,
                    order: services.length + 1
                });
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowModal(false);
        } catch (error) {
            console.error("Save failed:", error);
            Alert.alert('Error', 'Failed to save service type');
        }
    };

    const handleDelete = (service) => {
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        setServiceToDelete(service);
        setDeleteModalVisible(true);
    };

    const confirmDelete = async () => {
        if (!serviceToDelete) return;

        try {
            await deleteDoc(doc(db, "serviceTypes", serviceToDelete.id));
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (error) {
            console.error('Delete error:', error);
        }
        setDeleteModalVisible(false);
        setServiceToDelete(null);
    };

    const renderIcon = (iconName, iconColor, size = 22) => {
        return <Ionicons name={iconName} size={size} color={iconColor} />;
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#0D9488" />
                        <Text style={styles.backText}>Back</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.headerTitle}>Service Types</Text>
                <Text style={styles.headerSubtitle}>Configure the services your queue offers</Text>
            </View>

            {/* Services List */}
            <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 100 }}>
                {services.map((service) => (
                    <View key={service.id} style={styles.serviceItem}>
                        <TouchableOpacity
                            style={styles.serviceLeft}
                            onPress={() => {
                                console.log('Edit pressed:', service.name);
                                openEditModal(service);
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.serviceIcon, { backgroundColor: service.color + '20' }]}>
                                {renderIcon(service.icon || 'cash-outline', service.color, 24)}
                            </View>
                            <Text style={[styles.serviceName, { marginLeft: 12 }]}>{service.name}</Text>
                        </TouchableOpacity>
                        {Platform.OS === 'web' ? (
                            <div
                                style={{ padding: 12, cursor: 'pointer' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    console.log('DELETE CLICKED (web):', service.name);
                                    handleDelete(service);
                                }}
                            >
                                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                            </div>
                        ) : (
                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => {
                                    console.log('DELETE PRESSED (native):', service.name);
                                    handleDelete(service);
                                }}
                            >
                                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                            </TouchableOpacity>
                        )}
                    </View>
                ))}

                {services.length === 0 && (
                    <View style={styles.emptyState}>
                        <Ionicons name="clipboard-outline" size={48} color="#9CA3AF" />
                        <Text style={styles.emptyText}>No service types yet</Text>
                        <Text style={styles.emptySubtext}>Add your first service type below</Text>
                    </View>
                )}
            </ScrollView>

            {/* Add Button */}
            <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
                <Ionicons name="add" size={24} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Add Service Type</Text>
            </TouchableOpacity>

            {/* Add/Edit Modal */}
            <Modal visible={showModal} animationType="slide" transparent>
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <ScrollView
                        contentContainerStyle={styles.modalScrollContent}
                        keyboardShouldPersistTaps="handled"
                        bounces={false}
                    >
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>
                                {editingService ? 'Edit Service' : 'Add Service'}
                            </Text>

                            <Text style={styles.inputLabel}>Service Name</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="e.g., Payment, Inquiry"
                                placeholderTextColor="#9CA3AF"
                            />

                            <Text style={styles.inputLabel}>Icon</Text>
                            <View style={styles.optionsGrid}>
                                {ICON_OPTIONS.map((iconOption) => (
                                    <TouchableOpacity
                                        key={iconOption.name}
                                        style={[styles.iconOption, icon === iconOption.name && styles.iconOptionSelected]}
                                        onPress={() => setIcon(iconOption.name)}
                                    >
                                        <Ionicons name={iconOption.name} size={24} color={icon === iconOption.name ? '#0D9488' : '#6B7280'} />
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.inputLabel}>Color</Text>
                            <View style={styles.optionsGrid}>
                                {COLOR_OPTIONS.map((c) => (
                                    <TouchableOpacity
                                        key={c}
                                        style={[styles.colorOption, { backgroundColor: c }, color === c && styles.colorOptionSelected]}
                                        onPress={() => setColor(c)}
                                    />
                                ))}
                            </View>

                            <View style={styles.modalActions}>
                                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowModal(false)}>
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                                    <Text style={styles.saveButtonText}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>

            {/* Delete Confirmation Modal */}
            <CustomModal
                visible={deleteModalVisible}
                type="warning"
                title="Delete Service"
                message={`Are you sure you want to delete "${serviceToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={confirmDelete}
                onCancel={() => {
                    setDeleteModalVisible(false);
                    setServiceToDelete(null);
                }}
            />
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
        marginBottom: 16,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,

    },
    backText: {
        fontSize: 16,
        color: '#0D9488',
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#6B7280',
    },
    list: {
        flex: 1,
        paddingHorizontal: 24,
        ...(Platform.OS === 'web' ? { overflow: 'auto' } : {}),
    },
    serviceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F9FAFB',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    serviceLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
    },
    serviceIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    serviceName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    deleteButton: {
        padding: 12,
        marginLeft: 8,
        cursor: 'pointer',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
        marginTop: 16,
        marginBottom: 4,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#9CA3AF',
    },
    addButton: {
        position: 'absolute',
        bottom: 30,
        left: 24,
        right: 24,
        backgroundColor: '#1F2937',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',

    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalScrollContent: {
        flexGrow: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 24,
        textAlign: 'center',
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
        borderRadius: 12,
        fontSize: 16,
        color: '#1F2937',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 20,
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',

        marginBottom: 20,
    },
    iconOption: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#F9FAFB',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    iconOptionSelected: {
        borderColor: '#0D9488',
        backgroundColor: '#F0FDFA',
    },
    colorOption: {
        width: 48,
        height: 48,
        borderRadius: 12,
        borderWidth: 3,
        borderColor: 'transparent',
    },
    colorOptionSelected: {
        borderColor: '#1F2937',
    },
    modalActions: {
        flexDirection: 'row',

        marginTop: 8,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    cancelButtonText: {
        color: '#6B7280',
        fontSize: 16,
        fontWeight: '600',
    },
    saveButton: {
        flex: 1,
        backgroundColor: '#0D9488',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

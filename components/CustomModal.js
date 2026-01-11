import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * CustomModal - A styled modal component for alerts and confirmations
 * 
 * Props:
 * - visible: boolean - whether modal is shown
 * - type: 'confirm' | 'alert' | 'success' | 'warning' - modal type
 * - title: string - modal title
 * - message: string - modal message
 * - onConfirm: function - callback for confirm button
 * - onCancel: function - callback for cancel button (also closes modal)
 * - confirmText: string - text for confirm button (default: 'Confirm')
 * - cancelText: string - text for cancel button (default: 'Cancel')
 */
export default function CustomModal({
    visible,
    type = 'alert',
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
}) {
    const getIconConfig = () => {
        switch (type) {
            case 'confirm':
                return { name: 'help-circle', color: '#3B82F6', bgColor: '#EFF6FF' };
            case 'success':
                return { name: 'checkmark-circle', color: '#10B981', bgColor: '#ECFDF5' };
            case 'warning':
                return { name: 'warning', color: '#F59E0B', bgColor: '#FFFBEB' };
            case 'error':
                return { name: 'close-circle', color: '#EF4444', bgColor: '#FEF2F2' };
            default:
                return { name: 'information-circle', color: '#0D9488', bgColor: '#F0FDFA' };
        }
    };

    const iconConfig = getIconConfig();
    const isConfirmType = type === 'confirm' || type === 'warning';

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Icon */}
                    <View style={[styles.iconContainer, { backgroundColor: iconConfig.bgColor }]}>
                        <Ionicons name={iconConfig.name} size={32} color={iconConfig.color} />
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>{title}</Text>

                    {/* Message */}
                    <Text style={styles.message}>{message}</Text>

                    {/* Buttons */}
                    <View style={styles.buttonContainer}>
                        {isConfirmType && (
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={onCancel}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.cancelButtonText}>{cancelText}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[
                                styles.confirmButton,
                                type === 'warning' && styles.warningButton,
                                type === 'error' && styles.errorButton,
                                !isConfirmType && styles.fullWidthButton,
                            ]}
                            onPress={onConfirm}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.confirmButtonText}>
                                {isConfirmType ? confirmText : 'OK'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        ...(Platform.OS === 'web' ? { boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' } : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 25 },
            shadowOpacity: 0.25,
            shadowRadius: 50,
            elevation: 25,
        }),
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        marginRight: 8,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
    },
    confirmButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#0D9488',
        marginLeft: 8,
    },
    warningButton: {
        backgroundColor: '#EF4444',
    },
    errorButton: {
        backgroundColor: '#EF4444',
    },
    fullWidthButton: {
        marginLeft: 0,
        marginRight: 0,
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Dimensions, Platform } from 'react-native';
import { db } from '../firebaseConfig';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function AnalyticsScreen({ navigation }) {
    const [stats, setStats] = useState({
        totalServed: 0,
        avgWaitTime: 0,
        currentWaiting: 0
    });
    const [recentServed, setRecentServed] = useState([]);
    const [serviceBreakdown, setServiceBreakdown] = useState([]);

    useEffect(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const queueQuery = query(collection(db, "queue"), orderBy("timestamp", "desc"));
        const unsubQueue = onSnapshot(queueQuery, (snapshot) => {
            let totalServed = 0;
            let totalWaitTime = 0;
            let waitTimeCount = 0;
            let currentWaiting = 0;
            const recent = [];
            const serviceCount = {};

            snapshot.docs.forEach(doc => {
                const data = doc.data();

                if (data.status === 'done') {
                    totalServed++;
                    if (data.waitTime) {
                        totalWaitTime += data.waitTime;
                        waitTimeCount++;
                    }
                    if (recent.length < 10) {
                        recent.push({
                            id: doc.id,
                            ticketNumber: data.ticketNumber,
                            serviceType: data.serviceType || 'General',
                            waitTime: data.waitTime || 0,
                            servedAt: data.servedAt?.toDate?.()
                        });
                    }
                    const type = data.serviceType || 'General';
                    serviceCount[type] = (serviceCount[type] || 0) + 1;
                }
                if (data.status === 'waiting') {
                    currentWaiting++;
                }
            });

            setStats({
                totalServed,
                avgWaitTime: waitTimeCount > 0 ? Math.round(totalWaitTime / waitTimeCount) : 0,
                currentWaiting
            });
            setRecentServed(recent);

            const breakdown = Object.entries(serviceCount).map(([name, count]) => ({
                name,
                count,
                percentage: totalServed > 0 ? Math.round((count / totalServed) * 100) : 0
            })).sort((a, b) => b.count - a.count);
            setServiceBreakdown(breakdown);
        });

        return () => unsubQueue();
    }, []);

    const formatTime = (date) => {
        if (!date) return '-';
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
                <Text style={styles.headerTitle}>Analytics</Text>
                <Text style={styles.headerSubtitle}>Queue performance overview</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Stats Cards */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, styles.statCardPrimary]}>
                        <Ionicons name="checkmark-done" size={24} color="#FFFFFF" style={{ marginBottom: 8 }} />
                        <Text style={styles.statValuePrimary}>{stats.totalServed}</Text>
                        <Text style={styles.statLabelPrimary}>Total Served</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="time-outline" size={24} color="#0D9488" style={{ marginBottom: 8 }} />
                        <Text style={styles.statValue}>{stats.avgWaitTime}</Text>
                        <Text style={styles.statLabel}>Avg Wait (min)</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="people-outline" size={24} color="#F59E0B" style={{ marginBottom: 8 }} />
                        <Text style={styles.statValue}>{stats.currentWaiting}</Text>
                        <Text style={styles.statLabel}>Waiting Now</Text>
                    </View>
                </View>

                {/* Service Breakdown */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="pie-chart-outline" size={20} color="#1F2937" />
                        <Text style={styles.sectionTitle}>Service Breakdown</Text>
                    </View>
                    {serviceBreakdown.length > 0 ? (
                        serviceBreakdown.map((service, index) => (
                            <View key={service.name} style={styles.breakdownItem}>
                                <View style={styles.breakdownLeft}>
                                    <Text style={styles.breakdownName}>{service.name}</Text>
                                    <Text style={styles.breakdownCount}>{service.count} served</Text>
                                </View>
                                <View style={styles.breakdownRight}>
                                    <View style={styles.barContainer}>
                                        <View style={[styles.bar, { width: `${service.percentage}%` }]} />
                                    </View>
                                    <Text style={styles.breakdownPercent}>{service.percentage}%</Text>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="analytics-outline" size={32} color="#9CA3AF" />
                            <Text style={styles.emptyText}>No data yet</Text>
                        </View>
                    )}
                </View>

                {/* Recent History */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="list-outline" size={20} color="#1F2937" />
                        <Text style={styles.sectionTitle}>Recent History</Text>
                    </View>
                    {recentServed.length > 0 ? (
                        recentServed.map((ticket) => (
                            <View key={ticket.id} style={styles.historyItem}>
                                <View style={styles.historyLeft}>
                                    <Text style={styles.historyNumber}>#{ticket.ticketNumber}</Text>
                                    <View style={styles.historyBadge}>
                                        <Text style={styles.historyBadgeText}>{ticket.serviceType}</Text>
                                    </View>
                                </View>
                                <View style={styles.historyRight}>
                                    <View style={styles.historyWaitRow}>
                                        <Ionicons name="time-outline" size={14} color="#6B7280" />
                                        <Text style={styles.historyWait}>{ticket.waitTime} min</Text>
                                    </View>
                                    <Text style={styles.historyTime}>{formatTime(ticket.servedAt)}</Text>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="receipt-outline" size={32} color="#9CA3AF" />
                            <Text style={styles.emptyText}>No tickets served yet</Text>
                        </View>
                    )}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
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
    content: {
        flex: 1,
        paddingHorizontal: 24,
    },
    statsRow: {
        flexDirection: 'row',
        marginBottom: 32,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginHorizontal: 6,
    },
    statCardPrimary: {
        backgroundColor: '#0D9488',
        borderColor: '#0D9488',
    },
    statValue: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1F2937',
    },
    statValuePrimary: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    statLabel: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: 4,
        textAlign: 'center',
    },
    statLabelPrimary: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
        textAlign: 'center',
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    breakdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    breakdownLeft: {
        flex: 1,
    },
    breakdownName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    breakdownCount: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
    breakdownRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    barContainer: {
        width: 80,
        height: 8,
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        overflow: 'hidden',
    },
    bar: {
        height: '100%',
        backgroundColor: '#0D9488',
        borderRadius: 4,
    },
    breakdownPercent: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1F2937',
        width: 40,
        textAlign: 'right',
    },
    historyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 14,
        borderRadius: 12,
        marginBottom: 8,
    },
    historyLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    historyNumber: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    historyBadge: {
        backgroundColor: '#E0E7FF',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    historyBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#4338CA',
    },
    historyRight: {
        alignItems: 'flex-end',
    },
    historyWaitRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    historyWait: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
    },
    historyTime: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    emptyText: {
        textAlign: 'center',
        color: '#9CA3AF',
        fontSize: 14,
        marginTop: 8,
    },
});

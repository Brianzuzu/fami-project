import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Dimensions,
    Modal,
    FlatList,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { auth, db } from "../firebaseConfig";
import { collection, onSnapshot, query, where, addDoc, Timestamp, orderBy } from "firebase/firestore";

export default function Finances() {
    const [records, setRecords] = useState<any[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [newRecord, setNewRecord] = useState({
        type: "Expense",
        amount: "",
        category: "Inputs",
        description: "",
        produce: "",
        quantity: "",
    });

    const stats = records.reduce(
        (acc, rec) => {
            const amt = parseFloat(rec.amount) || 0;
            if (rec.type === "Income") acc.income += amt;
            else acc.expenses += amt;
            return acc;
        },
        { income: 0, expenses: 0 }
    );

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        const q = query(
            collection(db, "farm_records"),
            where("uid", "==", user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data: any[] = [];
            snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
            // Client-side sorting by date descending
            data.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
            setRecords(data);
        });
        return () => unsubscribe();
    }, []);

    const handleAddRecord = async () => {
        if (!newRecord.amount || !newRecord.description) return;
        try {
            await addDoc(collection(db, "farm_records"), {
                ...newRecord,
                uid: auth.currentUser?.uid,
                date: Timestamp.now(),
            });
            setIsModalVisible(false);
            setNewRecord({ type: "Expense", amount: "", category: "Inputs", description: "", produce: "", quantity: "" });
        } catch (error) {
            console.error("Error adding record:", error);
        }
    };

    const renderRecordItem = ({ item }: { item: any }) => (
        <View style={styles.recordItem}>
            <View style={[styles.iconBox, { backgroundColor: item.type === "Income" ? "#DCFCE7" : "#FEE2E2" }]}>
                <MaterialCommunityIcons
                    name={item.type === "Income" ? "plus" : "minus"}
                    size={20}
                    color={item.type === "Income" ? "#166534" : "#991B1B"}
                />
            </View>
            <View style={styles.recordInfo}>
                <Text style={styles.recordDesc}>{item.description}</Text>
                <Text style={styles.recordSub}>
                    {item.category} {item.produce ? `• ${item.produce}` : ""} {item.quantity ? `(${item.quantity})` : ""} • {item.date?.toDate().toLocaleDateString()}
                </Text>
            </View>
            <Text style={[styles.recordAmount, { color: item.type === "Income" ? "#166534" : "#EF4444" }]}>
                {item.type === "Income" ? "+" : "-"} KES {parseFloat(item.amount).toLocaleString()}
            </Text>
        </View>
    );

    // Aggregate data by month for performance tracking
    const monthlyStats = records.reduce((acc: any, rec: any) => {
        const date = rec.date?.toDate() || new Date();
        const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
        if (!acc[monthYear]) acc[monthYear] = { income: 0, expenses: 0 };
        const amt = parseFloat(rec.amount) || 0;
        if (rec.type === "Income") acc[monthYear].income += amt;
        else acc[monthYear].expenses += amt;
        return acc;
    }, {});

    const latestMonths = Object.keys(monthlyStats).slice(0, 6).reverse();

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={styles.pageHeader}>
                    <View>
                        <Text style={styles.title}>Farm Finances</Text>
                        <Text style={styles.subtitle}>Track your business growth</Text>
                    </View>
                    <TouchableOpacity style={styles.addBtn} onPress={() => setIsModalVisible(true)}>
                        <Ionicons name="add" size={24} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Main Performance Card */}
                <View style={styles.performanceCard}>
                    <View style={styles.cardInfo}>
                        <Text style={styles.perfLabel}>Cumulative Net Profit</Text>
                        <Text style={styles.perfValue}>KES {(stats.income - stats.expenses).toLocaleString()}</Text>
                        {(stats.income > 0 || stats.expenses > 0) && (
                            <View style={styles.growthBadge}>
                                <Ionicons name="trending-up" size={14} color="#10B981" />
                                <Text style={styles.growthText}>Based on your recorded activity</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.cardActions}>
                        <View style={styles.cardStat}>
                            <Text style={styles.cardStatLabel}>INCOME</Text>
                            <Text style={[styles.cardStatValue, { color: '#10B981' }]}>KES {stats.income.toLocaleString()}</Text>
                        </View>
                        <View style={styles.cardStatDivider} />
                        <View style={styles.cardStat}>
                            <Text style={styles.cardStatLabel}>EXPENSES</Text>
                            <Text style={[styles.cardStatValue, { color: '#F87171' }]}>KES {stats.expenses.toLocaleString()}</Text>
                        </View>
                    </View>
                </View>

                {/* Performance Analytics Preview */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Performance Pulse</Text>
                    <TouchableOpacity>
                        <Text style={styles.seeAllLink}>Detailed Analytics</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.chartContainer}>
                    <View style={styles.chartYAxis}>
                        <Text style={styles.yLabel}>100k</Text>
                        <Text style={styles.yLabel}>50k</Text>
                        <Text style={styles.yLabel}>0</Text>
                    </View>
                    <View style={styles.chartArea}>
                        {latestMonths.length > 0 ? latestMonths.map((m) => {
                            const data = monthlyStats[m];
                            const maxVal = Math.max(stats.income, stats.expenses, 100000);
                            const iHeight = (data.income / maxVal) * 100;
                            const eHeight = (data.expenses / maxVal) * 100;
                            return (
                                <View key={m} style={styles.chartCol}>
                                    <View style={styles.barGroup}>
                                        <View style={[styles.bar, { height: Math.max(iHeight, 5), backgroundColor: '#79BF4E' }]} />
                                        <View style={[styles.bar, { height: Math.max(eHeight, 5), backgroundColor: '#F87171' }]} />
                                    </View>
                                    <Text style={styles.barLabel}>{m.split(' ')[0]}</Text>
                                </View>
                            );
                        }) : (
                            <View style={styles.emptyChart}>
                                <Text style={styles.emptyChartText}>No monthly data yet</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* History List */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Transactions</Text>
                    <TouchableOpacity onPress={() => setIsModalVisible(true)}>
                        <Text style={styles.addLink}>View All</Text>
                    </TouchableOpacity>
                </View>

                {records.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="notebook-outline" size={48} color="#CBD5E1" />
                        <Text style={styles.emptyText}>Start logging your farm activities.</Text>
                    </View>
                ) : (
                    records.slice(0, 10).map(rec => renderRecordItem({ item: rec }))
                )}
            </ScrollView>

            {/* Add Record Modal */}
            <Modal visible={isModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>New Farm Entry</Text>
                            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.typeSelector}>
                            <TouchableOpacity
                                style={[styles.typeBtn, newRecord.type === 'Expense' && styles.typeBtnActive]}
                                onPress={() => setNewRecord({ ...newRecord, type: 'Expense', category: 'Inputs' })}
                            >
                                <Text style={[styles.typeBtnText, newRecord.type === 'Expense' && styles.typeBtnTextActive]}>Expense</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.typeBtn, newRecord.type === 'Income' && styles.typeBtnActive]}
                                onPress={() => setNewRecord({ ...newRecord, type: 'Income', category: 'Sales' })}
                            >
                                <Text style={[styles.typeBtnText, newRecord.type === 'Income' && styles.typeBtnTextActive]}>Income</Text>
                            </TouchableOpacity>
                        </View>

                        {newRecord.type === 'Income' && (
                            <Text style={[styles.label, { fontSize: 18, color: '#0F172A', fontWeight: 'bold', marginBottom: 15 }]}>Sales</Text>
                        )}

                        <Text style={styles.label}>Amount (KES)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="0.00"
                            keyboardType="numeric"
                            value={newRecord.amount}
                            onChangeText={(text) => setNewRecord({ ...newRecord, amount: text })}
                        />

                        {newRecord.type === 'Income' && (
                            <>
                                <Text style={styles.label}>Produce Name</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Maize, Tomatoes"
                                    value={newRecord.produce}
                                    onChangeText={(text) => setNewRecord({ ...newRecord, produce: text })}
                                />

                                <Text style={styles.label}>Quantity (e.g. 50kg, 10 crates)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. 100 kg"
                                    value={newRecord.quantity}
                                    onChangeText={(text) => setNewRecord({ ...newRecord, quantity: text })}
                                />
                            </>
                        )}

                        {newRecord.type === 'Expense' && (
                            <>
                                <Text style={styles.label}>Category</Text>
                                <View style={styles.categoryGrid}>
                                    {['Inputs', 'Labor', 'Fuel', 'Transport', 'Other'].map(cat => (
                                        <TouchableOpacity
                                            key={cat}
                                            style={[styles.catChip, newRecord.category === cat && styles.catChipActive, { marginRight: 10, marginBottom: 10 }]}
                                            onPress={() => setNewRecord({ ...newRecord, category: cat })}
                                        >
                                            <Text style={[styles.catChipText, newRecord.category === cat && styles.catChipTextActive]}>{cat}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        )}

                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Bought 2 bags of DAP"
                            value={newRecord.description}
                            onChangeText={(text) => setNewRecord({ ...newRecord, description: text })}
                        />

                        <TouchableOpacity style={styles.submitBtn} onPress={handleAddRecord}>
                            <Text style={styles.submitText}>Save Record</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    scroll: {
        padding: 20,
        paddingBottom: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#0B3D2E",
    },
    pageHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 25,
    },
    subtitle: {
        fontSize: 14,
        color: "#64748B",
        marginTop: 2,
    },
    addBtn: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: "#0B3D2E",
        justifyContent: "center",
        alignItems: "center",
        elevation: 4,
        shadowColor: "#0B3D2E",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    performanceCard: {
        backgroundColor: "white",
        borderRadius: 24,
        padding: 24,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: "#F1F5F9",
        elevation: 2,
    },
    cardInfo: {
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
        paddingBottom: 20,
        marginBottom: 20,
    },
    perfLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: "#64748B",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    perfValue: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#0F172A",
        marginTop: 8,
    },
    growthBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#DCFCE7",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        alignSelf: "flex-start",
        marginTop: 10,
    },
    growthText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#166534",
        marginLeft: 4,
    },
    cardActions: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    cardStat: {
        flex: 1,
    },
    cardStatLabel: {
        fontSize: 10,
        fontWeight: "bold",
        color: "#94A3B8",
    },
    cardStatValue: {
        fontSize: 16,
        fontWeight: "bold",
        marginTop: 2,
    },
    cardStatDivider: {
        width: 1,
        height: 30,
        backgroundColor: "#F1F5F9",
        marginHorizontal: 15,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    seeAllLink: {
        color: '#0B3D2E',
        fontWeight: '700',
        fontSize: 13,
    },
    chartContainer: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 20,
        paddingBottom: 15,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        flexDirection: 'row',
    },
    chartYAxis: {
        justifyContent: 'space-between',
        paddingVertical: 20,
        marginRight: 10,
    },
    yLabel: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '600',
    },
    chartArea: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        height: 150,
        paddingBottom: 10,
    },
    chartCol: {
        alignItems: 'center',
        flex: 1,
    },
    barGroup: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 4,
        height: 120,
        marginBottom: 10,
    },
    bar: {
        width: 10,
        borderRadius: 4,
    },
    barLabel: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '700',
    },
    emptyChart: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyChartText: {
        color: '#CBD5E1',
        fontSize: 12,
    },
    addLink: {
        color: '#0B3D2E',
        fontWeight: 'bold',
        fontSize: 14,
    },
    recordItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    recordInfo: {
        flex: 1,
    },
    recordDesc: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
    },
    recordSub: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    recordAmount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    emptyContainer: {
        alignItems: 'center',
        marginVertical: 40,
    },
    emptyText: {
        marginTop: 12,
        color: '#94A3B8',
        fontSize: 14,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 25,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    typeSelector: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 15,
        padding: 4,
        marginBottom: 25,
    },
    typeBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 12,
    },
    typeBtnActive: {
        backgroundColor: 'white',
        elevation: 2,
    },
    typeBtnText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#64748B',
    },
    typeBtnTextActive: {
        color: '#0F172A',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 10,
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 20,
    },
    catChip: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
    },
    catChipActive: {
        backgroundColor: '#0B3D2E',
    },
    catChipText: {
        fontSize: 13,
        color: '#475569',
        fontWeight: '600',
    },
    catChipTextActive: {
        color: 'white',
    },
    submitBtn: {
        backgroundColor: '#0B3D2E',
        padding: 18,
        borderRadius: 15,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    submitText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

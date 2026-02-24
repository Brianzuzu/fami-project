import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Dimensions,
    ActivityIndicator,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { auth, db } from "../firebaseConfig";
import { signOut } from "firebase/auth";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";

export default function FarmerHome() {
    const router = useRouter();
    const [userData, setUserData] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [income, setIncome] = useState(0);
    const [expenses, setExpenses] = useState(0);

    const handleLogout = () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Logout",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await signOut(auth);
                            router.replace("/");
                        } catch (error: any) {
                            Alert.alert("Error", "Failed to log out. Please try again.");
                        }
                    }
                }
            ]
        );
    };

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        // Listen to user profile
        const userUnsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) setUserData(docSnap.data());
            setLoading(false);
        });

        // Listen to this farmer's financial records for real totals
        const recordsQ = query(
            collection(db, "farm_records"),
            where("uid", "==", user.uid)
        );
        const recordsUnsub = onSnapshot(recordsQ, (snap) => {
            let totalIncome = 0;
            let totalExpenses = 0;
            snap.forEach(d => {
                const r = d.data();
                const amt = parseFloat(r.amount) || 0;
                if (r.type === "Income") totalIncome += amt;
                else totalExpenses += amt;
            });
            setIncome(totalIncome);
            setExpenses(totalExpenses);
        });

        return () => { userUnsub(); recordsUnsub(); };
    }, []);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0B3D2E" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Header Section */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Habari, Mkulima</Text>
                        <Text style={styles.username}>{userData.username || "Farmer"}</Text>
                    </View>
                    <TouchableOpacity style={styles.profileBtn} onPress={handleLogout}>
                        <Ionicons name="person-circle-outline" size={40} color="#0B3D2E" />
                    </TouchableOpacity>
                </View>

                {/* Financial Pulse Card */}
                <View style={styles.pulseCard}>
                    <View style={styles.pulseHeader}>
                        <Text style={styles.pulseTitle}>Seasonal Pulse</Text>
                        <TouchableOpacity onPress={() => router.push("/(farmer-tabs)/Finances")}>
                            <Text style={styles.viewMore}>Records</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.pulseContent}>
                        <View style={styles.pulseItem}>
                            <View style={[styles.iconBox, { backgroundColor: '#DCFCE7', marginRight: 12 }]}>
                                <Ionicons name="trending-up" size={20} color="#166534" />
                            </View>
                            <View>
                                <Text style={styles.pulseLabel}>Total Sales</Text>
                                <Text style={styles.pulseValue}>KES {income.toLocaleString()}</Text>
                            </View>
                        </View>
                        <View style={styles.pulseDivider} />
                        <View style={styles.pulseItem}>
                            <View style={[styles.iconBox, { backgroundColor: '#FEE2E2', marginRight: 12 }]}>
                                <Ionicons name="trending-down" size={20} color="#991B1B" />
                            </View>
                            <View>
                                <Text style={styles.pulseLabel}>Expenses</Text>
                                <Text style={styles.pulseValue}>KES {expenses.toLocaleString()}</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.profitBadge}>
                        <Text style={styles.profitText}>Net Profit: KES {(income - expenses).toLocaleString()}</Text>
                    </View>
                </View>

                {/* Smart Advice Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Smart Advice</Text>
                </View>
                <View style={styles.adviceCard}>
                    <View style={styles.adviceTop}>
                        <MaterialCommunityIcons name="weather-partly-rainy" size={32} color="#0369A1" style={{ marginRight: 15 }} />
                        <View style={styles.adviceInfo}>
                            <Text style={styles.adviceTitle}>Localized Weather Alert</Text>
                            <Text style={styles.adviceSub}>Narok County - Region 4</Text>
                        </View>
                    </View>
                    <Text style={styles.adviceText}>
                        Expect light showers this evening. Perfect time for fertilizer application on maize crops.
                    </Text>
                    <View style={styles.calendarTag}>
                        <Ionicons name="calendar-outline" size={14} color="#0B3D2E" style={{ marginRight: 6 }} />
                        <Text style={styles.calendarText}>Planting Window: 3 days left</Text>
                    </View>
                </View>

                {/* Quick Actions Grid */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                </View>
                <View style={styles.actionGrid}>
                    <TouchableOpacity style={styles.actionItem} onPress={() => router.push("/(farmer-tabs)/Marketplace")}>
                        <View style={[styles.actionIcon, { backgroundColor: '#FFEDD5' }]}>
                            <MaterialCommunityIcons name="camera-plus-outline" size={24} color="#9A3412" />
                        </View>
                        <Text style={styles.actionLabel}>List Produce</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionItem} onPress={() => router.push("/(farmer-tabs)/Finances")}>
                        <View style={[styles.actionIcon, { backgroundColor: '#F1F5F9' }]}>
                            <MaterialCommunityIcons name="notebook-edit-outline" size={24} color="#334155" />
                        </View>
                        <Text style={styles.actionLabel}>Log Expense</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionItem} onPress={() => router.push("/(farmer-tabs)/InputShop")}>
                        <View style={[styles.actionIcon, { backgroundColor: '#E0F2FE' }]}>
                            <MaterialCommunityIcons name="tractor" size={24} color="#0369A1" />
                        </View>
                        <Text style={styles.actionLabel}>Buy Inputs</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionItem} onPress={() => router.push("/(farmer-tabs)/Loans")}>
                        <View style={[styles.actionIcon, { backgroundColor: '#F0FDF4' }]}>
                            <MaterialCommunityIcons name="hand-heart-outline" size={24} color="#166534" />
                        </View>
                        <Text style={styles.actionLabel}>Get Credit</Text>
                    </TouchableOpacity>
                </View>

                {/* Community Highlight */}
                <View style={styles.communityCard}>
                    <View style={styles.communityInfo}>
                        <Text style={styles.communityTitle}>Farmer Community</Text>
                        <Text style={styles.communityText}>Connect with other farmers, share market tips and growing strategies.</Text>
                    </View>
                    <TouchableOpacity style={styles.joinBtn} onPress={() => router.push("/(farmer-tabs)/Community")}>
                        <Text style={styles.joinText}>Join</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scroll: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
    },
    greeting: {
        fontSize: 16,
        color: '#64748B',
    },
    username: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#0F172A',
        marginTop: 2,
    },
    profileBtn: {
        padding: 4,
    },
    pulseCard: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 2,
        marginBottom: 25,
    },
    pulseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    pulseTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    viewMore: {
        fontSize: 14,
        color: '#0B3D2E',
        fontWeight: '600',
    },
    pulseContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    pulseItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    pulseDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#F1F5F9',
        marginHorizontal: 10,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pulseLabel: {
        fontSize: 12,
        color: '#64748B',
        marginBottom: 2,
    },
    pulseValue: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
    },
    profitBadge: {
        backgroundColor: '#0B3D2E',
        paddingVertical: 10,
        borderRadius: 12,
        marginTop: 20,
        alignItems: 'center',
    },
    profitText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    sectionHeader: {
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    adviceCard: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 20,
        borderLeftWidth: 6,
        borderLeftColor: '#0369A1',
        marginBottom: 25,
    },
    adviceTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    adviceInfo: {
        flex: 1,
    },
    adviceTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
    },
    adviceSub: {
        fontSize: 12,
        color: '#64748B',
    },
    adviceText: {
        fontSize: 14,
        color: '#334155',
        lineHeight: 20,
        marginBottom: 15,
    },
    calendarTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDF4',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    calendarText: {
        fontSize: 12,
        color: '#166534',
        fontWeight: '600',
    },
    actionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 25,
    },
    actionItem: {
        width: (Dimensions.get("window").width - 55) / 2,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    actionIcon: {
        width: 50,
        height: 50,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    actionLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#334155',
    },
    communityCard: {
        backgroundColor: '#0B3D2E',
        borderRadius: 24,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    communityInfo: {
        flex: 1,
        marginRight: 15,
    },
    communityTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    communityText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        lineHeight: 18,
    },
    joinBtn: {
        backgroundColor: 'white',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 12,
    },
    joinText: {
        color: '#0B3D2E',
        fontSize: 14,
        fontWeight: 'bold',
    }
});

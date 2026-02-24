import React, { useState, useEffect } from "react";
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
    TextInput
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { db, auth } from "./firebaseConfig";
import { doc, getDoc, addDoc, collection, Timestamp, updateDoc } from "firebase/firestore";


export default function PoolDetails() {
    const { width } = Dimensions.get("window");
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const [contractType, setContractType] = useState("standard");
    const [pool, setPool] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [investing, setInvesting] = useState(false);
    const [investAmount, setInvestAmount] = useState("10000");

    useEffect(() => {
        if (!id) return;
        const fetchPool = async () => {
            try {
                const docRef = doc(db, "pools", id as string);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setPool({ id: docSnap.id, ...docSnap.data() });
                } else {
                    Alert.alert("Error", "Pool not found.");
                    router.back();
                }
            } catch (error) {
                console.error("Error fetching pool:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPool();
    }, [id]);

    const handleInvest = () => {
        if (!pool) return;
        const amt = parseFloat(investAmount);

        if (isNaN(amt) || amt < 5000) {
            Alert.alert("Invalid Amount", "Minimum investment is KES 5,000");
            return;
        }
        if (amt > 1000000) {
            Alert.alert("Invalid Amount", "Maximum investment is KES 1,000,000");
            return;
        }

        router.push({
            pathname: "/ConfirmPay",
            params: {
                poolId: pool.id,
                poolName: pool.name,
                amount: amt.toString(),
                contractType,
                roi: contractType === 'standard' ? pool.standardROI : pool.revenueROI,
                duration: pool.duration
            }
        } as any);
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color="#0B3D2E" />
            </View>
        );
    }

    if (!pool) return null;

    const RiskGauge = ({ value }: { value: number }) => (
        <View style={styles.gaugeContainer}>
            <View style={styles.gaugeBackground}>
                <View style={[styles.gaugeFill, { width: `${value}%`, backgroundColor: value > 70 ? "#10B981" : "#F59E0B" }]} />
            </View>
            <View style={styles.gaugeLabelRow}>
                <Text style={styles.gaugeLabelText}>Security Score</Text>
                <Text style={styles.gaugeValueText}>{value}/100</Text>
            </View>
        </View>
    );

    const ProcedureGuide = () => (
        <View style={styles.procedureContainer}>
            <Text style={styles.sectionTitle}>Investment Procedure</Text>
            <div style={{ marginBottom: 15 }}>
                <View style={styles.procedureStep}>
                    <View style={styles.stepIconContainer}>
                        <MaterialCommunityIcons name="lock-outline" size={20} color="#0B3D2E" />
                    </View>
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Step 1: Escrow Protection</Text>
                        <Text style={styles.stepDesc}>Capital is held in a protected Escrow account until project milestones are verified.</Text>
                    </View>
                </View>
                <View style={styles.procedureStep}>
                    <View style={styles.stepIconContainer}>
                        <MaterialCommunityIcons name="flag-checkered" size={20} color="#0B3D2E" />
                    </View>
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Step 2: Milestone Funding</Text>
                        <Text style={styles.stepDesc}>Funds released to farmers in tranches upon completion of planting and weeding phases.</Text>
                    </View>
                </View>
                <View style={styles.procedureStep}>
                    <View style={styles.stepIconContainer}>
                        <MaterialCommunityIcons name="chart-line" size={20} color="#0B3D2E" />
                    </View>
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Step 3: Payout Phase</Text>
                        <Text style={styles.stepDesc}>Profits distributed automatically after harvest based on your {contractType} contract.</Text>
                    </View>
                </View>
            </div>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <StatusBar barStyle="light-content" />

            {/* Dynamic Header with Category Color */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Pool Analytics</Text>
                <TouchableOpacity style={styles.shareButton}>
                    <Ionicons name="share-outline" size={24} color="white" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Top Info Section */}
                <View style={styles.topSection}>
                    <View style={styles.poolTag}>
                        <Text style={styles.poolTagText}>{pool.category}</Text>
                    </View>
                    <Text style={styles.poolName}>{pool.name}</Text>
                    <View style={styles.locationRow}>
                        <Ionicons name="location" size={16} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.locationText}>{pool.location}</Text>
                    </View>
                </View>

                {/* Analytics Section */}
                <View style={styles.analyticsWrapper}>
                    <View style={styles.analyticsCard}>
                        <Text style={styles.sectionTitle}>Risk & Analytics Tools</Text>
                        <RiskGauge value={pool.riskScore} />

                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                            <View style={{ flex: 1, backgroundColor: '#F8FAFC', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                <Text style={{ fontSize: 10, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 5 }}>Investment Amount</Text>
                                <TextInput
                                    style={{ fontSize: 18, fontWeight: '800', color: '#0B3D2E', padding: 0 }}
                                    keyboardType="numeric"
                                    value={investAmount}
                                    onChangeText={setInvestAmount}
                                    placeholder="KES..."
                                />
                            </View>
                        </View>

                        <View style={styles.riskGrid}>
                            <View style={styles.riskItem}>
                                <MaterialCommunityIcons name="weather-partly-cloudy" size={20} color="#64748B" />
                                <View>
                                    <Text style={styles.riskLabel}>Weather Risk</Text>
                                    <Text style={[styles.riskValue, { color: "#10B981" }]}>{pool.weatherRisk}</Text>
                                </View>
                            </View>
                            <View style={styles.riskItem}>
                                <MaterialCommunityIcons name="trending-up" size={20} color="#64748B" />
                                <View>
                                    <Text style={styles.riskLabel}>Market Risk</Text>
                                    <Text style={[styles.riskValue, { color: "#F59E0B" }]}>{pool.marketRisk}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Description */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Project Overview</Text>
                    <Text style={styles.descriptionText}>{pool.description}</Text>
                </View>

                {/* Impact */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Social & ESG Impact (Kenya Tiers)</Text>
                    {pool.impact?.map((item: string, idx: number) => (
                        <View key={idx} style={styles.impactRow}>
                            <View style={[styles.bullet, { backgroundColor: pool.color }]} />
                            <Text style={styles.impactText}>{item}</Text>
                        </View>
                    ))}
                    <View style={styles.tierBadge}>
                        <MaterialCommunityIcons name="shield-star" size={16} color="#0B3D2E" />
                        <Text style={styles.tierText}>Alignment: Vision 2030 Agriculture Pillar</Text>
                    </View>
                </View>

                {/* Shamba Visit / Farm Report */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Shamba Visit & Farm Report</Text>
                        <TouchableOpacity style={styles.reportBtn}>
                            <Text style={styles.reportBtnText}>Latest Update</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.reportCard}>
                        <View style={styles.reportItem}>
                            <Ionicons name="calendar" size={18} color="#0B3D2E" />
                            <View>
                                <Text style={styles.reportDate}>Last Inspection: Feb 12</Text>
                                <Text style={styles.reportStatus}>Status: Germination Phase Successful</Text>
                            </View>
                        </View>
                        <View style={styles.shambaVisitCard}>
                            <MaterialCommunityIcons name="camera" size={24} color="white" />
                            <Text style={styles.visitText}>Request Virtual Shamba Visit</Text>
                        </View>
                    </View>
                </View>

                {/* Contract Selection */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Revenue-Sharing Contracts</Text>
                    <View style={styles.contractSelector}>
                        <TouchableOpacity
                            style={[styles.contractOption, contractType === 'standard' && styles.activeContract]}
                            onPress={() => setContractType('standard')}
                        >
                            <Text style={[styles.contractName, contractType === 'standard' && styles.activeText]}>Standard Loan</Text>
                            <Text style={[styles.contractRoi, contractType === 'standard' && styles.activeText]}>{pool.standardROI}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.contractOption, contractType === 'revenue' && styles.activeContract]}
                            onPress={() => setContractType('revenue')}
                        >
                            <Text style={[styles.contractName, contractType === 'revenue' && styles.activeText]}>Revenue Share</Text>
                            <Text style={[styles.contractRoi, contractType === 'revenue' && styles.activeText]}>{pool.revenueROI}</Text>
                            <View style={styles.popularBadge}>
                                <Text style={styles.popularText}>BEST ROI</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Sticky Bottom Action */}
            <View style={styles.bottomAction}>
                <View>
                    <Text style={styles.priceLabel}>Min. Investment</Text>
                    <Text style={styles.priceValue}>KES 5,000</Text>
                </View>
                <TouchableOpacity
                    style={[styles.investBtn, investing && { opacity: 0.7 }]}
                    onPress={handleInvest}
                    disabled={investing}
                >
                    {investing ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.investBtnText}>Invest in Pool</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    header: {
        backgroundColor: "#0B3D2E",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    backButton: { padding: 5 },
    shareButton: { padding: 5 },
    headerTitle: { fontSize: 18, fontWeight: "700", color: "white" },
    scrollContent: { paddingBottom: 100 },
    topSection: {
        backgroundColor: "#0B3D2E",
        paddingHorizontal: 20,
        paddingBottom: 40,
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
    },
    poolTag: {
        backgroundColor: "rgba(255,255,255,0.2)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: "flex-start",
        marginBottom: 12,
    },
    poolTagText: { color: "white", fontSize: 12, fontWeight: "700" },
    poolName: { fontSize: 26, fontWeight: "800", color: "white", marginBottom: 8 },
    locationRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    locationText: { color: "rgba(255,255,255,0.7)", fontSize: 14 },
    analyticsWrapper: {
        paddingHorizontal: 20,
        marginTop: -25,
    },
    analyticsCard: {
        backgroundColor: "white",
        borderRadius: 24,
        padding: 24,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    sectionTitle: { fontSize: 17, fontWeight: "700", color: "#0F172A", marginBottom: 15 },
    gaugeContainer: { marginVertical: 10 },
    gaugeBackground: {
        height: 12,
        backgroundColor: "#F1F5F9",
        borderRadius: 6,
        overflow: "hidden",
        marginBottom: 8,
    },
    gaugeFill: { height: "100%", borderRadius: 6 },
    gaugeLabelRow: { flexDirection: "row", justifyContent: "space-between" },
    gaugeLabelText: { fontSize: 12, color: "#64748B", fontWeight: "600" },
    gaugeValueText: { fontSize: 12, color: "#0F172A", fontWeight: "800" },
    riskGrid: {
        flexDirection: "row",
        marginTop: 20,
        gap: 15,
    },
    riskItem: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: "#F8FAFC",
        padding: 12,
        borderRadius: 16,
    },
    riskLabel: { fontSize: 10, color: "#94A3B8" },
    riskValue: { fontSize: 13, fontWeight: "700" },
    section: { padding: 20 },
    descriptionText: { fontSize: 15, color: "#475569", lineHeight: 24 },
    impactRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
    bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981" },
    impactText: { fontSize: 14, color: "#475569" },
    tierBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F0FDF4",
        padding: 10,
        borderRadius: 12,
        marginTop: 15,
        gap: 8,
    },
    tierText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#166534",
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15,
    },
    reportBtn: {
        backgroundColor: "#E2E8F0",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    reportBtnText: {
        fontSize: 10,
        fontWeight: "bold",
        color: "#475569",
    },
    reportCard: {
        backgroundColor: "white",
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    reportItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 15,
    },
    reportDate: {
        fontSize: 13,
        fontWeight: "bold",
        color: "#1E293B",
    },
    reportStatus: {
        fontSize: 12,
        color: "#64748B",
    },
    shambaVisitCard: {
        backgroundColor: "#0B3D2E",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 15,
        borderRadius: 15,
        gap: 10,
    },
    visitText: {
        color: "white",
        fontSize: 14,
        fontWeight: "bold",
    },
    contractSelector: { gap: 12 },
    contractOption: {
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 20,
        padding: 20,
        position: "relative",
    },
    activeContract: {
        borderColor: "#0B3D2E",
        backgroundColor: "#F0FDF4",
        borderWidth: 2,
    },
    contractName: { fontSize: 16, fontWeight: "700", color: "#1E293B", marginBottom: 4 },
    contractRoi: { fontSize: 14, color: "#64748B" },
    activeText: { color: "#0B3D2E" },
    popularBadge: {
        position: "absolute",
        top: -10,
        right: 20,
        backgroundColor: "#F59E0B",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    popularText: { color: "white", fontSize: 10, fontWeight: "800" },
    bottomAction: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "white",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderTopWidth: 1,
        borderTopColor: "#E2E8F0",
    },
    priceLabel: { fontSize: 12, color: "#64748B", marginBottom: 2 },
    priceValue: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
    investBtn: {
        backgroundColor: "#0B3D2E",
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 16,
    },
    investBtnText: { color: "white", fontSize: 16, fontWeight: "700" },
    // Procedure Styles
    procedureContainer: {
        backgroundColor: "white",
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    procedureStep: {
        flexDirection: "row",
        marginBottom: 15,
        alignItems: "flex-start",
    },
    stepIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "#F0FDF4",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 15,
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#1E293B",
        marginBottom: 2,
    },
    stepDesc: {
        fontSize: 12,
        color: "#64748B",
        lineHeight: 18,
    },
});

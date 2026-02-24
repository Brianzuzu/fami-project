import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";

import { db } from "./firebaseConfig";
import { collection, onSnapshot, query, addDoc, getDocs } from "firebase/firestore";

const CATEGORIES = [
    { id: "all", name: "All Pools", icon: "apps" },
    { id: "poultry", name: "Poultry", icon: "bird" },
    { id: "livestock", name: "Livestock", icon: "cow" },
    { id: "horticulture", name: "Horticulture", icon: "leaf" },
    { id: "orchards", name: "Orchards", icon: "tree" },
    { id: "grain", name: "Grains & Cereals", icon: "corn" },
    { id: "institutions", name: "Chamas & SACCOs", icon: "office-building" },
];

const CATEGORY_INSIGHTS: Record<string, any> = {
    poultry: {
        risks: "High sensitivity to disease outbreaks (Newcastle, Gumboro). Feed price volatility.",
        profits: "Fastest turnaround (45-60 days). ROI: 12-15% per cycle.",
        trends: "Rising demand for 'Kienyeji' (organic/local) varieties in urban Nairobi/Mombasa.",
        color: "#EF4444"
    },
    livestock: {
        risks: "Drought impact on fodder, Veterinary costs for dairy cows/goats.",
        profits: "Steady monthly returns (Dairy) or long-term capital gain (Beef). ROI: 8-12% p.a.",
        trends: "Value addition (yogurt/cheese) is the new growth frontier for smallholders.",
        color: "#F59E0B"
    },
    horticulture: {
        risks: "Highly perishable. Strict export quality barriers (EU/Middle East).",
        profits: "High margin on specialty vegetables (Chillies, French Beans). ROI: 20-30%.",
        trends: "Shift towards greenhouses and drip irrigation to avoid seasonal dependence.",
        color: "#166534"
    },
    orchards: {
        risks: "Pests (Fruit Fly), Long gestation periods (2-3 years before first harvest).",
        profits: "Excellent long-term retirement planning asset. ROI: 25%+ after maturity.",
        trends: "Hass Avocado export demand continuing to grow to China and EU markets.",
        color: "#10B981"
    },
    grain: {
        risks: "Post-harvest losses (Aflatoxin). Dependence on long rain cycles.",
        profits: "Volume-based returns. Essential for national food security. ROI: 15-18%.",
        trends: "Mechanization leasing (tractors/combines) is increasing yield for small clusters.",
        color: "#78350F"
    },
    institutions: {
        risks: "Governance issues, Loan default rates by members, Management overheads.",
        profits: "Stable annual dividends + interest on deposits. Yield: 10-14% p.a.",
        trends: "Digital transition of SACCOs allowing for instant credit and better tracking.",
        color: "#0B3D2E"
    }
};



const KilimoPulse = () => (
    <View style={styles.pulseContainer}>
        <View style={styles.pulseHeader}>
            <View style={styles.pulseTitleRow}>
                <Ionicons name="flash" size={16} color="#F59E0B" />
                <Text style={styles.pulseTitle}>Kilimo Pulse</Text>
            </View>
            <Text style={styles.pulseDate}>Feb 16 - Mar 01</Text>
        </View>
        <Text style={styles.pulseAdvice}>
            ⚠️ <Text style={{ fontWeight: 'bold' }}>Seasonal Alert:</Text> Long rains expected in North Rift. Ensure you top-dress Maize by week 3.
        </Text>
    </View>
);


const SectorSnapshot = ({ category }: { category: string }) => {
    const insight = CATEGORY_INSIGHTS[category];
    if (!insight) return null;

    const isInstitutional = category === 'institutions';

    return (
        <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
                <Text style={styles.insightTitle}>{category.toUpperCase()} SECTOR INSIGHTS</Text>
                <View style={[styles.trendTag, { backgroundColor: insight.color + "20" }]}>
                    <Ionicons name={isInstitutional ? "shield-checkmark" : "trending-up"} size={12} color={insight.color} />
                    <Text style={[styles.trendText, { color: insight.color }]}>
                        {isInstitutional ? "REGULATED" : "BULLISH"}
                    </Text>
                </View>
            </View>

            <View style={styles.insightRow}>
                <View style={styles.insightItem}>
                    <Text style={styles.insightLabel}>
                        {isInstitutional ? "DIVIDEND POTENTIAL" : "PROFIT POTENTIAL"}
                    </Text>
                    <Text style={styles.insightValue}>{insight.profits}</Text>
                </View>
                <View style={styles.insightItem}>
                    <Text style={styles.insightLabel}>
                        {isInstitutional ? "SECTOR STABILITY" : "MARKET TREND"}
                    </Text>
                    <Text style={styles.insightValue}>{insight.trends}</Text>
                </View>
            </View>

            <View style={styles.riskFooter}>
                <MaterialCommunityIcons
                    name={isInstitutional ? "lock-check" : "alert-circle-outline"}
                    size={14}
                    color="#64748B"
                />
                <Text style={styles.riskValueText} numberOfLines={2}>
                    <Text style={{ fontWeight: 'bold' }}>
                        {isInstitutional ? "Governance & Risks:" : "Risks:"}
                    </Text> {insight.risks}
                </Text>
            </View>

            <TouchableOpacity style={[styles.directInvestBtn, { backgroundColor: insight.color }]}>
                <Text style={styles.directInvestText}>
                    {isInstitutional ? "Browse Trusted Institutions" : `Invest Directly in ${category}`}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

export default function FarmerPools() {
    const router = useRouter();
    const [pools, setPools] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const q = collection(db, "pools");
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const poolsList: any[] = [];
            snapshot.forEach((doc) => {
                poolsList.push({ id: doc.id, ...doc.data() });
            });
            setPools(poolsList);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredPools = pools.filter((pool) => {
        const matchesCategory = activeCategory === "all" || pool.category === activeCategory;
        const matchesSearch = pool.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Farmer Pools</Text>
                <TouchableOpacity style={styles.filterButton}>
                    <MaterialCommunityIcons name="tune" size={24} color="#0B3D2E" />
                </TouchableOpacity>
            </View>

            <ScrollView stickyHeaderIndices={[2]} showsVerticalScrollIndicator={false}>
                {/* Search */}
                <View style={styles.searchSection}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color="#94A3B8" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by region (e.g. Eldoret)..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>

                {/* Cultural Pulse Widget */}
                <KilimoPulse />

                {/* Institutional Callout */}
                <TouchableOpacity
                    style={styles.trustedBanner}
                    onPress={() => setActiveCategory('institutions')}
                >
                    <View style={styles.bannerBadge}>
                        <MaterialCommunityIcons name="shield-check" size={16} color="white" />
                        <Text style={styles.bannerBadgeText}>VERIFIED</Text>
                    </View>
                    <View style={styles.bannerContent}>
                        <Text style={styles.bannerTitle}>Browse Trusted Institutions</Text>
                        <Text style={styles.bannerSubtitle}>Invest in SASRA-regulated SACCOs & registered Chamas with 10+ years of stability.</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#0B3D2E" />
                </TouchableOpacity>

                {/* Categories Tab Bar */}
                <View style={styles.categoriesWrapper}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoriesContainer}
                    >
                        {CATEGORIES.map((cat) => (
                            <TouchableOpacity
                                key={cat.id}
                                style={[
                                    styles.categoryItem,
                                    activeCategory === cat.id && styles.activeCategoryItem,
                                ]}
                                onPress={() => setActiveCategory(cat.id)}
                            >
                                <MaterialCommunityIcons
                                    name={cat.icon as any}
                                    size={20}
                                    color={activeCategory === cat.id ? "white" : "#64748B"}
                                />
                                <Text style={[
                                    styles.categoryText,
                                    activeCategory === cat.id && styles.activeCategoryText
                                ]}>
                                    {cat.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Pools List */}
                <View style={styles.listContainer}>
                    {filteredPools.map((pool) => (
                        <TouchableOpacity
                            key={pool.id}
                            style={styles.poolCard}
                            onPress={() => router.push({
                                pathname: "/PoolDetails",
                                params: { id: pool.id }
                            } as any)}
                        >
                            <View style={[styles.cardHeader, { backgroundColor: pool.color + "10" }]}>
                                <View style={styles.poolType}>
                                    <MaterialCommunityIcons
                                        name={(CATEGORIES.find(c => c.id === pool.category)?.icon || "sprout") as any}
                                        size={20}
                                        color={pool.color}
                                    />
                                    <Text style={[styles.typeText, { color: pool.color }]}>
                                        {pool.category.toUpperCase()}
                                    </Text>
                                    {pool.isChamaReady && (
                                        <View style={styles.chamaBadge}>
                                            <MaterialCommunityIcons name="account-group" size={12} color="#0B3D2E" />
                                            <Text style={styles.chamaText}>CHAMA READY</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.riskBadge}>
                                    <Text style={styles.riskText}>{pool.risk} Risk</Text>
                                </View>
                            </View>


                            <View style={styles.cardBody}>
                                <Text style={styles.poolTitle}>{pool.name}</Text>
                                <View style={styles.locationContainer}>
                                    <Ionicons name="location-outline" size={14} color="#64748B" />
                                    <Text style={styles.locationText}>{pool.location}</Text>
                                </View>

                                <Text style={styles.description} numberOfLines={2}>
                                    {pool.description}
                                </Text>

                                <View style={styles.progressSection}>
                                    <View style={styles.progressHeader}>
                                        <Text style={styles.progressLabel}>Funding Progress</Text>
                                        <Text style={styles.progressPercent}>{pool.funded}</Text>
                                    </View>
                                    <View style={styles.progressBarBg}>
                                        <View style={[styles.progressBarFill, { width: pool.funded as any, backgroundColor: pool.color }]} />
                                    </View>
                                </View>

                                <View style={styles.footer}>
                                    <View style={styles.metric}>
                                        <Text style={styles.mLabel}>{pool.category === 'institutions' ? "Type" : "Proj. ROI"}</Text>
                                        <Text style={styles.mValue}>{pool.category === 'institutions' ? pool.institutionType : pool.roi}</Text>
                                    </View>
                                    <View style={styles.divider} />
                                    <View style={styles.metric}>
                                        <Text style={styles.mLabel}>{pool.category === 'institutions' ? "Assets" : "Duration"}</Text>
                                        <Text style={styles.mValue}>{pool.category === 'institutions' ? pool.assetBase : pool.duration}</Text>
                                    </View>
                                    <TouchableOpacity style={[styles.investBtn, { backgroundColor: pool.color }]}>
                                        <Text style={styles.investBtnText}>View</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: "white",
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: "#0F172A",
    },
    filterButton: {
        padding: 5,
    },
    searchSection: {
        padding: 20,
        backgroundColor: "white",
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F1F5F9",
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 50,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: "#0F172A",
    },
    categoriesWrapper: {
        backgroundColor: "white",
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    categoriesContainer: {
        paddingHorizontal: 20,
        gap: 12,
    },
    categoryItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: "#F1F5F9",
        gap: 8,
    },
    activeCategoryItem: {
        backgroundColor: "#0B3D2E",
    },
    categoryText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#64748B",
    },
    activeCategoryText: {
        color: "white",
    },

    // Trusted Banner Styles
    trustedBanner: {
        backgroundColor: "#DCFCE7", // Light emerald
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 16,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#bbf7d0", // Green-200
        position: "relative",
        overflow: "hidden",
    },
    bannerBadge: {
        position: "absolute",
        top: 0,
        left: 0,
        backgroundColor: "#0B3D2E",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderBottomRightRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    bannerBadgeText: {
        color: "white",
        fontSize: 10,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    bannerContent: {
        flex: 1,
        marginTop: 12, // Space for badge
        marginRight: 12,
    },
    bannerTitle: {
        fontSize: 16,
        fontWeight: "800",
        color: "#0B3D2E",
        marginBottom: 4,
    },
    bannerSubtitle: {
        fontSize: 12,
        color: "#334155",
        lineHeight: 18,
    },
    // Kilimo Pulse Styles
    pulseContainer: {
        backgroundColor: "#0B3D2E",
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 20,
        padding: 16,
    },
    pulseHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    pulseTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    pulseTitle: {
        color: "white",
        fontSize: 14,
        fontWeight: "bold",
    },
    pulseDate: {
        color: "rgba(255,255,255,0.6)",
        fontSize: 10,
        fontWeight: "600",
    },
    pulseAdvice: {
        color: "white",
        fontSize: 13,
        lineHeight: 18,
    },
    chamaBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "white",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        gap: 4,
        marginLeft: 8,
    },
    chamaText: {
        fontSize: 8,
        fontWeight: "900",
        color: "#0B3D2E",
    },
    // Sector Insight Styles
    insightCard: {
        backgroundColor: "white",
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    insightHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15,
    },
    insightTitle: {
        fontSize: 12,
        fontWeight: "800",
        color: "#64748B",
        letterSpacing: 1,
    },
    trendTag: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    trendText: {
        fontSize: 10,
        fontWeight: "bold",
    },
    insightRow: {
        flexDirection: "row",
        gap: 15,
        marginBottom: 15,
    },
    insightItem: {
        flex: 1,
        backgroundColor: "#F8FAFC",
        padding: 12,
        borderRadius: 12,
    },
    insightLabel: {
        fontSize: 9,
        fontWeight: "800",
        color: "#94A3B8",
        marginBottom: 4,
    },
    insightValue: {
        fontSize: 12,
        fontWeight: "700",
        color: "#1E293B",
        lineHeight: 16,
    },
    riskFooter: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 15,
        paddingHorizontal: 4,
    },
    riskValueText: {
        fontSize: 11,
        color: "#64748B",
        flex: 1,
    },
    directInvestBtn: {
        height: 45,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    directInvestText: {
        color: "white",
        fontSize: 14,
        fontWeight: "bold",
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        gap: 20,
    },
    poolCard: {
        backgroundColor: "white",
        borderRadius: 24,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    poolType: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    typeText: {
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 1,
    },
    riskBadge: {
        backgroundColor: "white",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    riskText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#475569",
    },
    cardBody: {
        padding: 20,
    },
    poolTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#0F172A",
        marginBottom: 6,
    },
    locationContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginBottom: 12,
    },
    locationText: {
        fontSize: 13,
        color: "#64748B",
        fontWeight: "500",
    },
    description: {
        fontSize: 14,
        color: "#475569",
        lineHeight: 20,
        marginBottom: 20,
    },
    progressSection: {
        marginBottom: 20,
    },
    progressHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    progressLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: "#94A3B8",
    },
    progressPercent: {
        fontSize: 12,
        fontWeight: "800",
        color: "#0F172A",
    },
    progressBarBg: {
        height: 8,
        backgroundColor: "#F1F5F9",
        borderRadius: 4,
    },
    progressBarFill: {
        height: "100%",
        borderRadius: 4,
    },
    footer: {
        flexDirection: "row",
        alignItems: "center",
        borderTopWidth: 1,
        borderTopColor: "#F1F5F9",
        paddingTop: 15,
    },
    metric: {
        flex: 1,
    },
    mLabel: {
        fontSize: 10,
        color: "#94A3B8",
        marginBottom: 2,
        textTransform: "uppercase",
    },
    mValue: {
        fontSize: 15,
        fontWeight: "700",
        color: "#0F172A",
    },
    divider: {
        width: 1,
        height: 20,
        backgroundColor: "#F1F5F9",
        marginHorizontal: 15,
    },
    investBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
    },
    investBtnText: {
        color: "white",
        fontSize: 14,
        fontWeight: "700",
    },
});

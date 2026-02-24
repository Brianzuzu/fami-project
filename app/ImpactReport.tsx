import React from "react";
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";

import { auth, db } from "./firebaseConfig";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export default function ImpactReport() {
    const router = useRouter();
    const [investments, setInvestments] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        const q = query(collection(db, "investments"), where("uid", "==", user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data: any[] = [];
            snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
            setInvestments(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const jobsSupported = investments.length * 5;
    const foodProduced = (investments.length * 0.4).toFixed(1);

    const ImpactMetric = ({ icon, title, value, unit, description, color }: any) => (
        <View style={styles.metricCard}>
            <View style={[styles.metricHeader, { backgroundColor: color + "10" }]}>
                <MaterialCommunityIcons name={icon} size={28} color={color} />
                <View>
                    <Text style={styles.metricTitle}>{title}</Text>
                    <Text style={styles.metricDescription}>{description}</Text>
                </View>
            </View>
            <View style={styles.metricBody}>
                <Text style={[styles.metricValue, { color }]}>{value}</Text>
                <Text style={styles.metricUnit}>{unit}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Impact Report</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.heroSection}>
                    <View style={styles.heroCard}>
                        <MaterialCommunityIcons name="earth" size={40} color="white" />
                        <View>
                            <Text style={styles.heroTitle}>ESG Progress</Text>
                            <Text style={styles.heroSubtitle}>Your investments are changing lives.</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Social & Food Security</Text>
                    <ImpactMetric
                        icon="account-group"
                        title="Jobs Supported"
                        description="Livelihoods directly funded by you"
                        value={jobsSupported.toString()}
                        unit="Farmers"
                        color="#0B3D2E"
                    />
                    <ImpactMetric
                        icon="food-apple"
                        title="Food Production"
                        description="Contribution to regional food security"
                        value={foodProduced}
                        unit="Tons"
                        color="#10B981"
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Environmental Impact</Text>
                    <ImpactMetric
                        icon="leaf"
                        title="Sustainability"
                        description="Land managed under organic practices"
                        value="100%"
                        unit="Compliance"
                        color="#059669"
                    />
                    <ImpactMetric
                        icon="water"
                        title="Water Efficiency"
                        description="Water saved via smart-irrigation"
                        value="15k"
                        unit="Litres"
                        color="#3B82F6"
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Community Stories</Text>
                    <View style={styles.storyCard}>
                        <View style={styles.storyAvatar}>
                            <Text style={styles.avatarText}>JM</Text>
                        </View>
                        <View style={styles.storyContent}>
                            <Text style={styles.storyName}>John Maina</Text>
                            <Text style={styles.storyRole}>Maize Farmer, Nakuru</Text>
                            <Text style={styles.storyText}>
                                "Because of the Maize Pool A funding, I was able to purchase high-grade seeds that resisted the drought. My yield increased by 40%."
                            </Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.downloadBtn}
                    onPress={() => { }}
                >
                    <MaterialCommunityIcons name="file-pdf-box" size={24} color="white" />
                    <Text style={styles.downloadBtnText}>Download Detailed ESG PDF</Text>
                </TouchableOpacity>
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
    backButton: { padding: 5 },
    headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
    content: { padding: 20 },
    heroSection: { marginBottom: 25 },
    heroCard: {
        backgroundColor: "#0B3D2E",
        padding: 24,
        borderRadius: 24,
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    heroTitle: { fontSize: 20, fontWeight: "800", color: "white" },
    heroSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.7)" },
    section: { marginBottom: 30 },
    sectionTitle: { fontSize: 16, fontWeight: "700", color: "#64748B", marginBottom: 15, textTransform: "uppercase", letterSpacing: 1 },
    metricCard: {
        backgroundColor: "white",
        borderRadius: 20,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        marginBottom: 15,
    },
    metricHeader: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        gap: 12,
    },
    metricTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
    metricDescription: { fontSize: 12, color: "#64748B" },
    metricBody: {
        padding: 16,
        flexDirection: "row",
        alignItems: "baseline",
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: "#F1F5F9",
    },
    metricValue: { fontSize: 28, fontWeight: "800" },
    metricUnit: { fontSize: 14, color: "#64748B", fontWeight: "600" },
    storyCard: {
        backgroundColor: "white",
        padding: 20,
        borderRadius: 20,
        flexDirection: "row",
        gap: 15,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    storyAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#0B3D2E",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarText: { color: "white", fontWeight: "bold" },
    storyContent: { flex: 1 },
    storyName: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
    storyRole: { fontSize: 12, color: "#64748B", marginBottom: 8 },
    storyText: { fontSize: 13, color: "#475569", lineHeight: 20, fontStyle: "italic" },
    downloadBtn: {
        backgroundColor: "#0B3D2E",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
        borderRadius: 16,
        gap: 10,
        marginTop: 10,
        marginBottom: 30,
    },
    downloadBtnText: { color: "white", fontSize: 16, fontWeight: "700" },
});

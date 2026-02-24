import React, { useState, useEffect } from "react";
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView,
    TouchableOpacity, Alert, ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { auth, db } from "../firebaseConfig";
import {
    collection, query, where, onSnapshot,
    orderBy, addDoc, Timestamp, updateDoc, doc, increment
} from "firebase/firestore";
import { calculateAndSaveTrustScore } from "../../services/loanService";

const LOAN_OPTIONS = [
    { id: '1', lender: 'KCB Bank', type: 'bank', baseAmount: 200000, interest: '6.5%', term: '12 Months', minScore: 600 },
    { id: '2', lender: 'M-Pesa Business', type: 'mpesa', baseAmount: 50000, interest: '8.5%', term: '1 Month', minScore: 400 },
    { id: '3', lender: 'Fami CredLink', type: 'fami', baseAmount: 15000, interest: '4%', term: '3 Months', minScore: 300 },
];

export default function Loans() {
    const [userData, setUserData] = useState<any>(null);
    const [activeLoans, setActiveLoans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState<string | null>(null);

    // Admin-granted fields
    const isGranted = userData?.trustScoreStatus === 'granted';
    const grantedScore = isGranted ? userData?.trustScore : null;
    const eligibleOffers = isGranted
        ? LOAN_OPTIONS.filter(opt => (grantedScore?.overall || 0) >= opt.minScore)
        : [];

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        // Trigger background score calculation (saves as pending for admin)
        calculateAndSaveTrustScore(user.uid).catch(() => { });

        // Listen to user doc for admin-granted trust score fields
        const userUnsub = onSnapshot(doc(db, "users", user.uid), snap => {
            if (snap.exists()) setUserData(snap.data());
            setLoading(false);
        });

        // Listen to this user's loans
        const loansQ = query(
            collection(db, "loans"),
            where("uid", "==", user.uid),
            orderBy("requestedAt", "desc")
        );
        let loansUnsub = onSnapshot(loansQ, snap => {
            setActiveLoans(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, () => {
            // Fallback without index
            const q2 = query(collection(db, "loans"), where("uid", "==", user.uid));
            onSnapshot(q2, snap => {
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                data.sort((a: any, b: any) =>
                    (b.requestedAt?.seconds || 0) - (a.requestedAt?.seconds || 0)
                );
                setActiveLoans(data);
            });
        });

        return () => { userUnsub(); loansUnsub(); };
    }, []);

    const handleApply = async (option: typeof LOAN_OPTIONS[0]) => {
        const user = auth.currentUser;
        if (!user || !grantedScore) return;

        const maxAmount = Math.floor(option.baseAmount * (grantedScore.overall / 1000));

        Alert.alert(
            `Request ${option.lender} Loan`,
            `Based on your Trust Score (${grantedScore.overall}), you qualify for up to KES ${maxAmount.toLocaleString()}. Confirm request for registration?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Request Now",
                    onPress: async () => {
                        setApplying(option.id);
                        try {
                            await addDoc(collection(db, "loans"), {
                                uid: user.uid,
                                lender: option.lender,
                                type: option.type,
                                amount: maxAmount,
                                interest: option.interest,
                                term: option.term,
                                purpose: "Agricultural Loan",
                                status: "Pending",
                                repaidAmount: 0,
                                balance: maxAmount,
                                trustScore: grantedScore.overall,
                                trustLevel: grantedScore.level,
                                requestedAt: Timestamp.now(),
                                createdAt: Timestamp.now(),
                            });
                            Alert.alert("Success", "Request submitted! Approval pending verification.");
                        } catch {
                            Alert.alert("Error", "Could not submit request. Please try again.");
                        } finally {
                            setApplying(null);
                        }
                    }
                }
            ]
        );
    };

    const handlePayment = async (loan: any) => {
        Alert.alert("Make Repayment", "Simulate a payment of KES 5,000 for this loan?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Confirm Payment",
                onPress: async () => {
                    try {
                        const newRepaid = (loan.repaidAmount || 0) + 5000;
                        const newStatus = newRepaid >= loan.amount ? "Repaid" : "Partially Repaid";
                        await updateDoc(doc(db, "loans", loan.id), {
                            repaidAmount: increment(5000),
                            status: newStatus,
                        });
                        Alert.alert("Success", "Payment recorded successfully!");
                    } catch { Alert.alert("Error", "Payment failed. Try again."); }
                }
            }
        ]);
    };

    const statusColor = (s: string) => ({
        Approved: "#10B981",
        "Partially Repaid": "#3B82F6",
        Repaid: "#94A3B8",
        Rejected: "#EF4444",
    }[s] || "#F59E0B");

    const renderRepaymentCard = (loan: any) => {
        const progress = loan.amount > 0
            ? Math.round(((loan.repaidAmount || 0) / loan.amount) * 100)
            : 0;
        const canPay = loan.status === "Approved" || loan.status === "Partially Repaid";

        return (
            <View key={loan.id} style={styles.repaymentCard}>
                <View style={styles.loanTop}>
                    <View>
                        <Text style={styles.lenderName}>{loan.lender}</Text>
                        <Text style={[styles.loanStatus, { color: statusColor(loan.status) }]}>
                            {loan.status}
                        </Text>
                    </View>
                    <Text style={styles.loanAmount}>{loan.amount ? `KES ${loan.amount.toLocaleString()}` : '---'}</Text>
                </View>

                {/* Pending message shown inline on the card */}
                {loan.status === "Pending" && (
                    <View style={styles.pendingNotice}>
                        <Ionicons name="time-outline" size={14} color="#92400E" style={{ marginRight: 6 }} />
                        <Text style={styles.pendingNoticeText}>Awaiting admin review</Text>
                    </View>
                )}
                {loan.status === "Rejected" && (
                    <View style={[styles.pendingNotice, { backgroundColor: '#FEF2F2' }]}>
                        <Ionicons name="close-circle-outline" size={14} color="#991B1B" style={{ marginRight: 6 }} />
                        <Text style={[styles.pendingNoticeText, { color: '#991B1B' }]}>Application was not approved</Text>
                    </View>
                )}

                {canPay && (
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` as any }]} />
                        </View>
                        <View style={styles.progressLabelRow}>
                            <Text style={styles.progressText}>{progress}% Repaid</Text>
                            <TouchableOpacity style={styles.payTinyBtn} onPress={() => handlePayment(loan)}>
                                <Text style={styles.payTinyText}>Make Payment</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color="#0B3D2E" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.title}>Credit Center</Text>

                {/* ── Trust Score Card (always shown) ── */}
                <View style={styles.scoreCard}>
                    <View style={styles.scoreInfo}>
                        <Text style={styles.scoreLabel}>Accumulated Trust Score</Text>
                        <Text style={[styles.scoreValue, !isGranted && styles.scoreValueMuted]}>
                            {isGranted ? grantedScore?.overall : '---'}
                        </Text>
                        <Text style={styles.scoreStatus}>
                            {isGranted
                                ? `Level: ${grantedScore?.level || 'Bronze Mkulima'}`
                                : 'Pending verification'}
                        </Text>
                    </View>
                    <View style={styles.scoreBadge}>
                        <MaterialCommunityIcons
                            name="seal"
                            size={50}
                            color={isGranted ? "#79BF4E" : "rgba(255,255,255,0.2)"}
                        />
                    </View>
                </View>

                {/* ── Score Breakdown Row (always shown) ── */}
                <View style={styles.breakdownRow}>
                    {[
                        { label: "Bank", value: isGranted ? grantedScore?.bank : '---', icon: "business" },
                        { label: "M-Pesa", value: isGranted ? grantedScore?.mpesa : '---', icon: "phone-portrait" },
                        { label: "Fami", value: isGranted ? grantedScore?.fami : '---', icon: "leaf" },
                    ].map(item => (
                        <View key={item.label} style={styles.miniScore}>
                            <Ionicons name={item.icon as any} size={20} color="#64748B" />
                            <Text style={styles.miniScoreLabel}>{item.label}</Text>
                            <Text style={[styles.miniScoreValue, !isGranted && { color: '#CBD5E1' }]}>
                                {item.value}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* ── Eligible Offers (always shown, populated only when granted) ── */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Eligible Offers</Text>
                    <Text style={styles.sectionSub}>Based on your app activity</Text>
                </View>

                {!isGranted ? (
                    // Design preserved — show placeholder cards greyed out
                    LOAN_OPTIONS.map(loan => (
                        <View key={loan.id} style={[styles.loanCard, styles.loanCardLocked]}>
                            <View style={styles.loanTop}>
                                <Text style={[styles.lenderName, { color: '#CBD5E1' }]}>{loan.lender}</Text>
                                <View style={styles.lockedBadge}>
                                    <Ionicons name="lock-closed-outline" size={12} color="#94A3B8" />
                                    <Text style={styles.lockedBadgeText}>Locked</Text>
                                </View>
                            </View>
                            <View style={styles.loanDetail}>
                                <Text style={[styles.detailLabel, { color: '#E2E8F0' }]}>Limit up to</Text>
                                <Text style={[styles.detailValue, { color: '#E2E8F0' }]}>--- KES</Text>
                            </View>
                            <View style={[styles.applyBtn, { backgroundColor: '#F1F5F9' }]}>
                                <Text style={[styles.applyBtnText, { color: '#CBD5E1' }]}>Not Yet Available</Text>
                            </View>
                        </View>
                    ))
                ) : eligibleOffers.length === 0 ? (
                    <View style={styles.noOffersCard}>
                        <MaterialCommunityIcons name="lock-outline" size={32} color="#CBD5E1" />
                        <Text style={styles.noOffersText}>
                            Your score ({grantedScore?.overall}) doesn't qualify for any products yet.{'\n'}Keep logging farm activity to improve it.
                        </Text>
                    </View>
                ) : (
                    eligibleOffers.map(loan => (
                        <View key={loan.id} style={styles.loanCard}>
                            <View style={styles.loanTop}>
                                <Text style={styles.lenderName}>{loan.lender}</Text>
                                <Text style={styles.interestText}>{loan.interest} p.m</Text>
                            </View>
                            <View style={styles.loanDetail}>
                                <Text style={styles.detailLabel}>Limit up to</Text>
                                <Text style={styles.detailValue}>
                                    KES {Math.floor(loan.baseAmount * (grantedScore.overall / 1000)).toLocaleString()}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.applyBtn, applying === loan.id && { opacity: 0.6 }]}
                                onPress={() => handleApply(loan)}
                                disabled={applying === loan.id}
                            >
                                {applying === loan.id
                                    ? <ActivityIndicator color="white" />
                                    : <Text style={styles.applyBtnText}>Request Funds</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    ))
                )}

                {/* ── Repayment Progress (always shown) ── */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Repayment Progress</Text>
                </View>

                {activeLoans.length === 0 ? (
                    <View style={styles.emptyRepayment}>
                        <MaterialCommunityIcons name="finance" size={40} color="#CBD5E1" />
                        <Text style={styles.emptyText}>No active loan obligations found.</Text>
                    </View>
                ) : (
                    activeLoans.map(renderRepaymentCard)
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F8FAFC" },
    scroll: { padding: 20, paddingBottom: 60 },
    loadingBox: { flex: 1, justifyContent: "center", alignItems: "center" },
    title: { fontSize: 24, fontWeight: "bold", color: "#0B3D2E", marginBottom: 20 },

    /* Score card */
    scoreCard: {
        backgroundColor: "#0B3D2E", borderRadius: 24, padding: 24,
        flexDirection: "row", alignItems: "center", marginBottom: 20, elevation: 4,
    },
    scoreInfo: { flex: 1 },
    scoreLabel: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
    scoreValue: { color: "white", fontSize: 48, fontWeight: "bold", marginVertical: 4 },
    scoreValueMuted: { color: "rgba(255,255,255,0.25)", fontSize: 40 },
    scoreStatus: { color: "#79BF4E", fontSize: 14, fontWeight: "700" },
    scoreBadge: { width: 80, height: 80, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 40, justifyContent: "center", alignItems: "center" },

    /* Breakdown */
    breakdownRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
    miniScore: { backgroundColor: "white", flex: 1, marginHorizontal: 5, padding: 15, borderRadius: 20, alignItems: "center", borderWidth: 1, borderColor: "#F1F5F9" },
    miniScoreLabel: { fontSize: 11, color: "#94A3B8", fontWeight: "700", marginTop: 5 },
    miniScoreValue: { fontSize: 16, fontWeight: "bold", color: "#0F172A", marginTop: 2 },

    /* Section headers */
    sectionHeader: { marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#1E293B" },
    sectionSub: { fontSize: 13, color: "#64748B", marginTop: 2 },

    /* Loan offer cards */
    loanCard: {
        backgroundColor: "white", borderRadius: 24, padding: 20,
        marginBottom: 20, borderWidth: 1, borderColor: "#F1F5F9", elevation: 2,
    },
    loanCardLocked: { opacity: 0.7 },
    loanTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
    lenderName: { fontSize: 16, fontWeight: "bold", color: "#0F172A" },
    interestText: { fontSize: 13, color: "#166534", fontWeight: "700", backgroundColor: "#DCFCE7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    lockedBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: "#E2E8F0" },
    lockedBadgeText: { fontSize: 11, color: "#94A3B8", fontWeight: "700", marginLeft: 4 },
    loanDetail: { marginBottom: 20 },
    detailLabel: { fontSize: 12, color: "#94A3B8", fontWeight: "600" },
    detailValue: { fontSize: 22, fontWeight: "bold", color: "#0B3D2E", marginTop: 2 },
    applyBtn: { backgroundColor: "#0B3D2E", padding: 16, borderRadius: 15, alignItems: "center" },
    applyBtnText: { color: "white", fontSize: 15, fontWeight: "bold" },

    /* No offers state */
    noOffersCard: {
        alignItems: "center", padding: 30, backgroundColor: "white", borderRadius: 24,
        borderWidth: 1, borderStyle: "dashed", borderColor: "#CBD5E1", marginBottom: 20,
    },
    noOffersText: { fontSize: 13, color: "#94A3B8", textAlign: "center", marginTop: 10, lineHeight: 20 },

    /* Repayment cards */
    repaymentCard: { backgroundColor: "white", borderRadius: 24, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: "#F1F5F9" },
    loanAmount: { fontSize: 16, fontWeight: "bold", color: "#0B3D2E" },
    loanStatus: { fontSize: 12, fontWeight: "700", marginTop: 4 },
    pendingNotice: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: "#FFFBEB", paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 10, marginTop: 10,
    },
    pendingNoticeText: { fontSize: 12, color: "#92400E", fontWeight: "600" },
    progressContainer: { marginTop: 15 },
    progressBar: { height: 10, backgroundColor: "#F1F5F9", borderRadius: 5, overflow: "hidden" },
    progressFill: { height: "100%" as any, backgroundColor: "#0B3D2E", borderRadius: 5 },
    progressLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
    progressText: { fontSize: 12, color: "#64748B", fontWeight: "600" },
    payTinyBtn: { backgroundColor: "#E2E8F0", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    payTinyText: { fontSize: 11, fontWeight: "bold", color: "#0B3D2E" },

    /* Empty repayment */
    emptyRepayment: {
        alignItems: "center", justifyContent: "center", padding: 40,
        backgroundColor: "white", borderRadius: 24, borderStyle: "dashed",
        borderWidth: 1, borderColor: "#CBD5E1",
    },
    emptyText: { marginTop: 10, color: "#94A3B8", fontSize: 13, textAlign: "center" },
});

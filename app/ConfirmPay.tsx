import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { db, auth } from "./firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";
import { handleCloudFunctionError } from "../services/cloudFunctions";
import { processLocalInvestment } from "../services/localInvestment";

const PAYMENT_METHODS = [
    { id: "Wallet", name: "Fami Wallet", icon: "wallet-outline", provider: "MaterialCommunityIcons", color: "#0B3D2E" },
    { id: "M-Pesa", name: "M-Pesa Paybill", icon: "cellphone-check", provider: "MaterialCommunityIcons", color: "#248906" },
    { id: "Bank", name: "Direct Bank", icon: "university", provider: "FontAwesome5", color: "#64748B" },
];

export default function ConfirmPay() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { poolId, poolName, amount, contractType, roi, duration } = params as any;
    const [loading, setLoading] = useState(false);
    const [balance, setBalance] = useState(0);
    const [selectedMethod, setSelectedMethod] = useState("Wallet");

    React.useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        return onSnapshot(doc(db, "users", user.uid), (snap) => {
            if (snap.exists()) {
                setBalance(snap.data().balance || 0);
            }
        });
    }, []);

    const handleConfirm = async () => {
        const user = auth.currentUser;
        if (!user) {
            Alert.alert("Error", "User not authenticated");
            return;
        }

        if (!poolId) {
            Alert.alert("Error", "Pool information missing. Please go back and try again.");
            return;
        }

        const investmentAmount = parseFloat(amount);
        if (isNaN(investmentAmount) || investmentAmount <= 0) {
            Alert.alert("Error", "Invalid investment amount.");
            return;
        }

        console.log(`Starting investment flow: ${selectedMethod} for ${poolName} (KES ${investmentAmount})`);

        if (selectedMethod !== "Wallet") {
            router.push({
                pathname: "/PaymentPortal",
                params: {
                    poolId,
                    poolName,
                    amount: investmentAmount.toString(),
                    contractType,
                    method: selectedMethod
                }
            } as any);
            return;
        }

        if (balance < investmentAmount) {
            Alert.alert("Insufficient Balance", "Please top up your wallet or choose another payment method.");
            return;
        }

        setLoading(true);
        try {
            console.log("Processing Wallet Investment...");
            // Call Local Service to process investment for Wallet
            const result = await processLocalInvestment({
                poolId: poolId,
                amount: investmentAmount,
                contractType: contractType,
                paymentMethod: selectedMethod
            });

            if (result.success) {
                Alert.alert(
                    "Success",
                    `Investment Confirmed!\n\nPool: ${poolName}\nAmount: KES ${investmentAmount.toLocaleString()}\nMethod: Fami Wallet`,
                    [{ text: "Awesome", onPress: () => router.push("/(tabs)/Home" as any) }]
                );
            } else {
                Alert.alert("Error", result.message || "Failed to process investment. Please try again.");
            }
        } catch (error: any) {
            console.error("Investment Error Catch:", error);
            const errorMessage = handleCloudFunctionError(error);
            Alert.alert("Processing Error", errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Confirm & Pay</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.summaryCard}>
                    <Text style={styles.cardTitle}>Investment Summary</Text>

                    <View style={styles.row}>
                        <Text style={styles.label}>Pool Name</Text>
                        <Text style={styles.value}>{poolName}</Text>
                    </View>
                    <View style={styles.divider} />

                    <View style={styles.row}>
                        <Text style={styles.label}>Contract Type</Text>
                        <Text style={styles.value}>{contractType === 'revenue' ? 'Revenue Share' : 'Standard Loan'}</Text>
                    </View>
                    <View style={styles.divider} />

                    <View style={styles.row}>
                        <Text style={styles.label}>Expected ROI</Text>
                        <Text style={[styles.value, { color: '#16A34A' }]}>{roi}</Text>
                    </View>
                    <View style={styles.divider} />

                    <View style={styles.row}>
                        <Text style={styles.label}>Duration</Text>
                        <Text style={styles.value}>{duration}</Text>
                    </View>
                    <View style={styles.divider} />

                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total Amount</Text>
                        <Text style={styles.totalValue}>KES {parseInt(amount).toLocaleString()}</Text>
                    </View>
                </View>

                <View style={styles.paymentMethodSection}>
                    <Text style={styles.sectionTitle}>Choose Payment Method</Text>
                    {PAYMENT_METHODS.map((method) => (
                        <TouchableOpacity
                            key={method.id}
                            onPress={() => setSelectedMethod(method.id)}
                            style={[
                                styles.methodCard,
                                selectedMethod === method.id && styles.selectedMethodCard
                            ]}
                        >
                            <View style={[styles.methodIcon, { backgroundColor: method.color + "15" }]}>
                                {method.provider === "MaterialCommunityIcons" ? (
                                    <MaterialCommunityIcons name={method.icon as any} size={24} color={method.color} />
                                ) : (
                                    <FontAwesome5 name={method.icon as any} size={20} color={method.color} />
                                )}
                            </View>
                            <View style={styles.methodDetails}>
                                <Text style={styles.methodName}>{method.name}</Text>
                                {method.id === "Wallet" && (
                                    <Text style={styles.methodBalance}>Balance: KES {balance.toLocaleString()}</Text>
                                )}
                                {method.id === "M-Pesa" && (
                                    <Text style={styles.methodBalance}>Instant Mobile Payment</Text>
                                )}
                            </View>
                            <Ionicons
                                name={selectedMethod === method.id ? "checkmark-circle" : "ellipse-outline"}
                                size={24}
                                color={selectedMethod === method.id ? "#0B3D2E" : "#E2E8F0"}
                            />
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.warningBox}>
                    <Ionicons name="shield-checkmark" size={20} color="#0B3D2E" />
                    <Text style={styles.warningText}>
                        Secured by Fami Escrow. Your capital is protected until project milestones are verified by our field agents.
                    </Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.confirmButton, loading && styles.disabledButton]}
                    onPress={handleConfirm}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#0D4D3B" />
                    ) : (
                        <Text style={styles.confirmButtonText}>Complete Investment</Text>
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
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: "white",
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#0F172A",
        textTransform: 'uppercase',
        letterSpacing: -0.5,
    },
    content: {
        padding: 20,
    },
    summaryCard: {
        backgroundColor: "white",
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: "900",
        color: "#94A3B8",
        marginBottom: 20,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    label: {
        fontSize: 14,
        color: "#64748B",
        fontWeight: "500",
    },
    value: {
        fontSize: 14,
        fontWeight: "700",
        color: "#1E293B",
    },
    divider: {
        height: 1,
        backgroundColor: "#F1F5F9",
        marginBottom: 12,
    },
    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 2,
        borderTopColor: "#F1F5F9",
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: "800",
        color: "#0F172A",
    },
    totalValue: {
        fontSize: 20,
        fontWeight: "900",
        color: "#0B3D2E",
    },
    paymentMethodSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "900",
        color: "#94A3B8",
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    methodCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "white",
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        marginBottom: 12,
    },
    selectedMethodCard: {
        borderColor: "#0B3D2E",
        backgroundColor: "#F0FDF4",
        borderWidth: 2,
    },
    methodIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
    },
    methodDetails: {
        flex: 1,
    },
    methodName: {
        fontSize: 15,
        fontWeight: "800",
        color: "#1E293B",
    },
    methodBalance: {
        fontSize: 11,
        color: "#64748B",
        fontWeight: "600",
        marginTop: 2,
    },
    warningBox: {
        flexDirection: "row",
        backgroundColor: "#F0FDF4",
        padding: 16,
        borderRadius: 20,
        gap: 12,
        borderWidth: 1,
        borderColor: "#DCFCE7",
    },
    warningText: {
        flex: 1,
        fontSize: 12,
        color: "#166534",
        fontWeight: "600",
        lineHeight: 18,
    },
    footer: {
        padding: 20,
        backgroundColor: "white",
        borderTopWidth: 1,
        borderTopColor: "#E2E8F0",
    },
    confirmButton: {
        backgroundColor: "#79BF4E",
        paddingVertical: 18,
        borderRadius: 20,
        alignItems: "center",
        shadowColor: "#79BF4E",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    disabledButton: {
        backgroundColor: "#E2E8F0",
        shadowOpacity: 0,
        elevation: 0,
    },
    confirmButtonText: {
        color: "#0D4D3B",
        fontSize: 16,
        fontWeight: "900",
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});
import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    ScrollView,
    Clipboard,
    Dimensions,
    Modal
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { handleCloudFunctionError } from "../services/cloudFunctions";
import { processLocalInvestment } from "../services/localInvestment";

const { width, height } = Dimensions.get("window");

export default function PaymentPortal() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { poolId, poolName, amount, contractType, method } = params as any;

    const [reference, setReference] = useState("");
    const [loading, setLoading] = useState(false);
    const [showSimulation, setShowSimulation] = useState(false);
    const [simulationStep, setSimulationStep] = useState(1); // 1: prompt, 2: processing, 3: success

    const PAYMENT_DETAILS = {
        "M-Pesa": {
            businessNumber: "400200", // Sample Paybill
            accountNumber: `INV-${poolId?.slice(-4).toUpperCase() || 'FAMI'}`,
            instructions: "1. Go to M-Pesa menu\n2. Select Lipa na M-Pesa\n3. Select Paybill\n4. Enter Business Number 400200\n5. Enter Account Number shown below\n6. Enter Amount and M-Pesa PIN"
        },
        "Bank": {
            bankName: "KCB Bank Kenya",
            accountName: "Fami Limited Escrow",
            accountNumber: "1283940561",
            branch: "Nairobi Main",
            instructions: "1. Transfer the exact amount to the account details below\n2. Download the payment confirmation/receipt\n3. Enter the Transaction Reference below"
        }
    };

    const details = PAYMENT_DETAILS[method as keyof typeof PAYMENT_DETAILS];

    const copyToClipboard = (text: string, label: string) => {
        Clipboard.setString(text);
        Alert.alert("Copied", `${label} copied to clipboard`);
    };

    const handleVerify = async (providedRef?: string) => {
        const refToUse = providedRef || reference;
        if (!refToUse || refToUse.length < 5) {
            Alert.alert("Invalid Reference", "Please enter a valid transaction reference code.");
            return;
        }

        setLoading(true);
        try {
            const result = await processLocalInvestment({
                poolId,
                amount: parseFloat(amount),
                contractType,
                paymentMethod: method,
                paymentReference: refToUse
            });

            if (result.success) {
                if (providedRef) {
                    setSimulationStep(3);
                } else {
                    Alert.alert(
                        "Payment Recorded",
                        "Your payment has been submitted for verification. Your investment will show as 'Active' once the funds are cleared by our financial team.",
                        [{ text: "Great", onPress: () => router.push("/(tabs)/Home") }]
                    );
                }
            } else {
                Alert.alert("Error", "Failed to submit payment. Please contact support.");
            }
        } catch (error) {
            const msg = handleCloudFunctionError(error);
            Alert.alert("Submission Error", msg);
        } finally {
            setLoading(false);
        }
    };

    const startSimulation = () => {
        setShowSimulation(true);
        setSimulationStep(1);
    };

    const runMockPayment = () => {
        setSimulationStep(2);
        // Simulate network/processing delay
        setTimeout(() => {
            const mockRef = `DEMO-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
            handleVerify(mockRef);
        }, 2000);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{method} Portal</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.amountBanner}>
                    <Text style={styles.amountLabel}>Total to Pay</Text>
                    <Text style={styles.amountValue}>KES {parseFloat(amount).toLocaleString()}</Text>
                </View>

                {/* Simulation Shortcut for Demo Users */}
                <TouchableOpacity style={styles.demoCard} onPress={startSimulation}>
                    <View style={styles.demoIcon}>
                        <MaterialCommunityIcons name="rocket-launch" size={24} color="#0B3D2E" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.demoTitle}>Interactive Demo Mode</Text>
                        <Text style={styles.demoText}>Experience the checkout flow directly in-app without leaving.</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#0B3D2E" />
                </TouchableOpacity>

                <View style={styles.dividerRow}>
                    <View style={styles.line} />
                    <Text style={styles.dividerText}>OR MANUAL TRANSFER</Text>
                    <View style={styles.line} />
                </View>

                <View style={styles.instructionCard}>
                    <Text style={styles.sectionTitle}>Manual Instructions</Text>
                    <Text style={styles.instructionsText}>{details?.instructions}</Text>
                </View>

                {method === "M-Pesa" && (
                    <View style={styles.detailsGrid}>
                        <TouchableOpacity
                            style={styles.detailItem}
                            onPress={() => copyToClipboard(PAYMENT_DETAILS["M-Pesa"].businessNumber, "Business Number")}
                        >
                            <Text style={styles.detailLabel}>Business No.</Text>
                            <View style={styles.copyRow}>
                                <Text style={styles.detailValue}>{PAYMENT_DETAILS["M-Pesa"].businessNumber}</Text>
                                <Ionicons name="copy-outline" size={16} color="#0B3D2E" />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.detailItem}
                            onPress={() => copyToClipboard(PAYMENT_DETAILS["M-Pesa"].accountNumber, "Account Number")}
                        >
                            <Text style={styles.detailLabel}>Account No.</Text>
                            <View style={styles.copyRow}>
                                <Text style={styles.detailValue}>{PAYMENT_DETAILS["M-Pesa"].accountNumber}</Text>
                                <Ionicons name="copy-outline" size={16} color="#0B3D2E" />
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                {method === "Bank" && (
                    <View style={styles.bankCard}>
                        <View style={styles.bankDetailRow}>
                            <Text style={styles.bankLabel}>Bank</Text>
                            <Text style={styles.bankValue}>{PAYMENT_DETAILS.Bank.bankName}</Text>
                        </View>
                        <View style={styles.bankDetailRow}>
                            <Text style={styles.bankLabel}>A/C Name</Text>
                            <Text style={styles.bankValue}>{PAYMENT_DETAILS.Bank.accountName}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.bankDetailRow}
                            onPress={() => copyToClipboard(PAYMENT_DETAILS.Bank.accountNumber, "Bank Account Number")}
                        >
                            <Text style={styles.bankLabel}>A/C Number</Text>
                            <View style={styles.copyRow}>
                                <Text style={styles.bankValue}>{PAYMENT_DETAILS.Bank.accountNumber}</Text>
                                <Ionicons name="copy-outline" size={16} color="#0B3D2E" />
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.referenceSection}>
                    <Text style={styles.sectionTitle}>Verification</Text>
                    <Text style={styles.inputLabel}>Enter Transaction Reference (M-Pesa Code or Bank Ref)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. RDJ2N9K1L"
                        value={reference}
                        onChangeText={(text) => setReference(text.toUpperCase())}
                        autoCapitalize="characters"
                    />
                </View>

                <TouchableOpacity
                    style={[styles.payButton, loading && styles.disabledButton]}
                    onPress={() => handleVerify()}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="white" /> : <Text style={styles.payButtonText}>Submit for Verification</Text>}
                </TouchableOpacity>
            </ScrollView>

            {/* Simulation Modal */}
            <Modal visible={showSimulation} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.stkCard}>
                        {simulationStep === 1 && (
                            <>
                                <View style={styles.stkHeader}>
                                    <MaterialCommunityIcons name={method === "M-Pesa" ? "cellphone-check" : "bank"} size={40} color="#0B3D2E" />
                                    <Text style={styles.stkTitle}>Confirm Investment</Text>
                                </View>
                                <Text style={styles.stkDesc}>
                                    Do you want to authorize a {method} transfer of KES {parseFloat(amount).toLocaleString()} to Fami Escrow?
                                </Text>
                                <View style={styles.stkActions}>
                                    <TouchableOpacity style={styles.stkCancel} onPress={() => setShowSimulation(false)}>
                                        <Text style={styles.stkCancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.stkSuccess} onPress={runMockPayment}>
                                        <Text style={styles.stkSuccessText}>Authorize</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}

                        {simulationStep === 2 && (
                            <View style={styles.loadingState}>
                                <ActivityIndicator size="large" color="#0B3D2E" />
                                <Text style={styles.loadingText}>Connecting to Gateway...</Text>
                                <Text style={styles.loadingSub}>Please wait while we verify your transaction</Text>
                            </View>
                        )}

                        {simulationStep === 3 && (
                            <View style={styles.successState}>
                                <View style={styles.successIcon}>
                                    <Ionicons name="checkmark-circle" size={80} color="#10B981" />
                                </View>
                                <Text style={styles.successTitle}>Transaction Success!</Text>
                                <Text style={styles.successDesc}>
                                    Funds for your investment in {poolName} have been received.
                                </Text>
                                <TouchableOpacity
                                    style={styles.successBtn}
                                    onPress={() => {
                                        setShowSimulation(false);
                                        router.push("/(tabs)/Home");
                                    }}
                                >
                                    <Text style={styles.successBtnText}>Return to Home</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F8FAFC" },
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
    backButton: { padding: 5 },
    headerTitle: { fontSize: 18, fontWeight: "bold", color: "#0F172A" },
    content: { padding: 20 },
    amountBanner: {
        backgroundColor: "#0B3D2E",
        padding: 24,
        borderRadius: 24,
        alignItems: "center",
        marginBottom: 20,
    },
    amountLabel: { color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: "600", marginBottom: 4 },
    amountValue: { color: "white", fontSize: 32, fontWeight: "800" },
    demoCard: {
        backgroundColor: "#F0FDF4",
        padding: 20,
        borderRadius: 24,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#DCFCE7",
        marginBottom: 20,
    },
    demoIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: "white",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 15,
        shadowColor: "#0B3D2E",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    demoTitle: { fontSize: 15, fontWeight: "800", color: "#064E3B", marginBottom: 2 },
    demoText: { fontSize: 11, color: "#065F46", lineHeight: 16, fontWeight: "500" },
    dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
    line: { flex: 1, height: 1, backgroundColor: "#E2E8F0" },
    dividerText: { fontSize: 10, fontWeight: "800", color: "#94A3B8", letterSpacing: 1 },
    instructionCard: {
        backgroundColor: "white",
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        marginBottom: 20,
    },
    sectionTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A", marginBottom: 12 },
    instructionsText: { fontSize: 13, color: "#64748B", lineHeight: 22, fontWeight: "500" },
    detailsGrid: { flexDirection: "row", gap: 15, marginBottom: 20 },
    detailItem: {
        flex: 1,
        backgroundColor: "#F1F5F9",
        padding: 15,
        borderRadius: 16,
    },
    detailLabel: { fontSize: 10, color: "#64748B", fontWeight: "700", textTransform: "uppercase", marginBottom: 4 },
    detailValue: { fontSize: 16, fontWeight: "800", color: "#0B3D2E" },
    copyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    bankCard: {
        backgroundColor: "white",
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        marginBottom: 20,
    },
    bankDetailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    bankLabel: { fontSize: 13, color: "#64748B", fontWeight: "600" },
    bankValue: { fontSize: 14, color: "#0F172A", fontWeight: "800" },
    referenceSection: {
        backgroundColor: "white",
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        marginBottom: 30,
    },
    inputLabel: { fontSize: 12, color: "#64748B", fontWeight: "600", marginBottom: 10 },
    input: {
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 16,
        padding: 15,
        fontSize: 16,
        fontWeight: "bold",
        color: "#0B3D2E",
    },
    payButton: {
        backgroundColor: "#0B3D2E",
        paddingVertical: 18,
        borderRadius: 20,
        alignItems: "center",
    },
    disabledButton: { opacity: 0.6 },
    payButtonText: { color: "white", fontSize: 16, fontWeight: "800" },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.8)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    stkCard: {
        backgroundColor: "white",
        width: "100%",
        padding: 30,
        borderRadius: 32,
        alignItems: "center",
    },
    stkHeader: { alignItems: "center", marginBottom: 20 },
    stkTitle: { fontSize: 22, fontWeight: "900", color: "#0F172A", marginTop: 15 },
    stkDesc: { fontSize: 15, color: "#64748B", textAlign: "center", lineHeight: 22, marginBottom: 30 },
    stkActions: { flexDirection: "row", gap: 15 },
    stkCancel: { flex: 1, paddingVertical: 16, alignItems: "center" },
    stkCancelText: { fontSize: 14, fontWeight: "800", color: "#64748B" },
    stkSuccess: {
        flex: 2,
        backgroundColor: "#0B3D2E",
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: "center",
        shadowColor: "#0B3D2E",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
    },
    stkSuccessText: { fontSize: 14, fontWeight: "800", color: "white" },
    loadingState: { paddingVertical: 40, alignItems: "center" },
    loadingText: { fontSize: 18, fontWeight: "800", color: "#0F172A", marginTop: 20 },
    loadingSub: { fontSize: 12, color: "#64748B", marginTop: 5 },
    successState: { alignItems: "center", width: "100%" },
    successIcon: { marginBottom: 20 },
    successTitle: { fontSize: 24, fontWeight: "900", color: "#0F172A", marginBottom: 10 },
    successDesc: { fontSize: 14, color: "#64748B", textAlign: "center", lineHeight: 20, marginBottom: 30 },
    successBtn: {
        backgroundColor: "#0B3D2E",
        width: "100%",
        paddingVertical: 18,
        borderRadius: 20,
        alignItems: "center"
    },
    successBtnText: { color: "white", fontSize: 15, fontWeight: "800" },
});

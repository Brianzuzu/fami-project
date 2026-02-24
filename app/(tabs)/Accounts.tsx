import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import { db } from "../firebaseConfig";
import { collection, doc, addDoc, Timestamp, query, where, onSnapshot } from "firebase/firestore";
import { MaterialCommunityIcons, FontAwesome5, Ionicons } from "@expo/vector-icons";

const PAYMENT_METHODS = [
  { id: "M-Pesa", icon: "cellphone-check", provider: "MaterialCommunityIcons", color: "#248906" },
  { id: "Credit Card", icon: "credit-card", provider: "FontAwesome5", color: "#0A1F44" },
  { id: "Bank Transfer", icon: "university", provider: "FontAwesome5", color: "#64748B" },
];

export default function Accounts() {
  const router = useRouter();
  const auth = getAuth();

  const [enterAmount, setEnterAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("M-Pesa");
  const [balance, setBalance] = useState(0);
  const [investedBalance, setInvestedBalance] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Listen to user document for wallet balance
    const userUnsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      const data = docSnap.data() || {};
      setBalance(data.balance || 0);
    });

    // Calculate invested balance from investments collection
    const invQ = query(collection(db, "investments"), where("uid", "==", user.uid));
    const invUnsub = onSnapshot(invQ, (snapshot) => {
      let total = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status === 'active') {
          total += (data.amount || 0);
        }
      });
      setInvestedBalance(total);
    });

    return () => {
      userUnsub();
      invUnsub();
    };
  }, []);

  const handleTransaction = async (type: "Deposit" | "Withdrawal") => {
    if (!enterAmount) {
      Alert.alert("Error", "Please enter weight/amount.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "User not authenticated.");
      return;
    }

    const amount = parseFloat(enterAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }

    try {
      const txRef = collection(db, "transactions");
      const userRef = doc(db, "users", user.uid);

      if (type === "Deposit") {
        // For Deposits, we complete them immediately and update balance
        await addDoc(txRef, {
          uid: user.uid,
          type,
          category: 'Funding',
          amount: enterAmount,
          paymentMethod: selectedMethod,
          status: 'completed',
          date: Timestamp.now(),
        });

        // Update user balance field
        const { runTransaction, increment } = await import("firebase/firestore");
        await runTransaction(db, async (transaction) => {
          transaction.update(userRef, {
            balance: increment(amount),
            updatedAt: Timestamp.now()
          });
        });

        Alert.alert("Success", "Funds added to your Fami Wallet.");
      } else {
        // For Withdrawals, they stay pending until admin approves
        if (balance < amount) {
          Alert.alert("Error", "Insufficient balance for withdrawal.");
          return;
        }

        await addDoc(txRef, {
          uid: user.uid,
          type,
          category: 'Disbursement',
          amount: enterAmount,
          paymentMethod: selectedMethod,
          status: 'pending',
          date: Timestamp.now(),
        });

        Alert.alert("Request Sent", "Withdrawal request submitted for approval. Funds will be deducted once verified.");
      }

      setEnterAmount("");
      router.push("/transaction");
    } catch (error) {
      console.error("Transaction Error:", error);
      Alert.alert("Error", "Failed to process transaction.");
    }
  };

  const renderIcon = (method: typeof PAYMENT_METHODS[0]) => {
    if (method.provider === "MaterialCommunityIcons") {
      return <MaterialCommunityIcons name={method.icon as any} size={24} color={method.color} />;
    }
    return <FontAwesome5 name={method.icon as any} size={20} color={method.color} />;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Account Portfolio</Text>
          <View style={styles.balanceCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.balanceLabel}>Total Equity</Text>
              <Text style={styles.balanceAmount}>KES {(balance + investedBalance).toLocaleString()}</Text>

              <View style={styles.equityDetailsRow}>
                <View>
                  <Text style={styles.miniLabel}>Cash Balance</Text>
                  <Text style={styles.miniValue}>KES {balance.toLocaleString()}</Text>
                </View>
                <View style={styles.miniDivider} />
                <View>
                  <Text style={styles.miniLabel}>Invested</Text>
                  <Text style={styles.miniValue}>KES {investedBalance.toLocaleString()}</Text>
                </View>
              </View>
            </View>
            <View style={styles.performanceBadge}>
              <Ionicons name="trending-up" size={16} color="#248906" />
              <Text style={styles.performanceText}>+4.5%</Text>
            </View>
          </View>
        </View>

        {/* Action Section */}
        <View style={styles.actionSection}>
          <Text style={styles.sectionTitle}>Manage Funds</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Amount (KES)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#94A3B8"
              value={enterAmount}
              onChangeText={setEnterAmount}
              keyboardType="numeric"
            />
          </View>

          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.methodsGrid}>
            {PAYMENT_METHODS.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.methodCard,
                  selectedMethod === method.id && styles.selectedMethodCard,
                ]}
                onPress={() => setSelectedMethod(method.id)}
              >
                <View style={[styles.iconContainer, { backgroundColor: method.color + "15" }]}>
                  {renderIcon(method)}
                </View>
                <Text style={[
                  styles.methodText,
                  selectedMethod === method.id && styles.selectedMethodText
                ]}>
                  {method.id}
                </Text>
                {selectedMethod === method.id && (
                  <Ionicons name="checkmark-circle" size={20} color={method.color} style={styles.checkIcon} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={() => handleTransaction("Deposit")}
              style={[styles.mainButton, { backgroundColor: "#0B3D2E" }]}
            >
              <MaterialCommunityIcons name="arrow-up-bold-circle" size={20} color="white" />
              <Text style={styles.buttonText}>Invest Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleTransaction("Withdrawal")}
              style={styles.secondaryButton}
            >
              <MaterialCommunityIcons name="arrow-down-bold-circle" size={20} color="#64748B" />
              <Text style={styles.secondaryButtonText}>Withdraw Funds</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Tips */}
        <View style={styles.tipsCard}>
          <Ionicons name="information-circle-outline" size={24} color="#0A1F44" />
          <View style={styles.tipsContent}>
            <Text style={styles.tipsTitle}>Investment Tip</Text>
            <Text style={styles.tipsText}>Consistency is key. Regular monthly investments can lead to significant long-term growth.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0B3D2E",
  },
  container: {
    flexGrow: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    backgroundColor: "#0B3D2E",
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 20,
  },
  balanceCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
  },
  performanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  equityDetailsRow: {
    flexDirection: 'row',
    marginTop: 12,
    alignItems: 'center',
    gap: 15,
  },
  miniLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  miniValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  miniDivider: {
    width: 1,
    height: 15,
    backgroundColor: '#E2E8F0',
  },
  performanceText: {
    marginLeft: 4,
    color: "#166534",
    fontWeight: "bold",
    fontSize: 14,
  },
  actionSection: {
    padding: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 16,
    marginTop: 10,
  },
  inputContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  input: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
    padding: 0,
  },
  methodsGrid: {
    gap: 12,
  },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  selectedMethodCard: {
    borderColor: "#0B3D2E",
    borderWidth: 2,
    backgroundColor: "#F0FDF4",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  methodText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#475569",
    flex: 1,
  },
  selectedMethodText: {
    color: "#0F172A",
  },
  checkIcon: {
    marginLeft: 8,
  },
  buttonContainer: {
    marginTop: 30,
    gap: 12,
  },
  mainButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 16,
    gap: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  secondaryButtonText: {
    color: "#64748B",
    fontSize: 16,
    fontWeight: "600",
  },
  tipsCard: {
    margin: 20,
    marginTop: 10,
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E3A8A",
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 13,
    color: "#1E40AF",
    lineHeight: 18,
  },
});

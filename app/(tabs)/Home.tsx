import {
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons, FontAwesome5, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Modal, TextInput } from "react-native";
import { auth, db } from "../firebaseConfig";
import {
  doc,
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
  limit,
  addDoc
} from "firebase/firestore";

const { width } = Dimensions.get("window");

export default function Home() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>({});
  const [balance, setBalance] = useState(0);
  const [activeInvestments, setActiveInvestments] = useState<any[]>([]);
  const [topPools, setTopPools] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWithdrawModalVisible, setIsWithdrawModalVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // 1. Fetch User Profile
    const userUnsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      const data = docSnap.data() || {};
      setUserData(data);
      setBalance(data.balance || 0);
    });

    // 2. Fetch User Investments
    const invQuery = query(collection(db, "investments"), where("uid", "==", user.uid));
    const invUnsub = onSnapshot(invQuery, (snapshot) => {
      const invs: any[] = [];
      snapshot.forEach((doc) => invs.push({ id: doc.id, ...doc.data() }));
      setActiveInvestments(invs);
    });

    // 3. Fetch Top Pools
    const poolsQuery = query(collection(db, "pools"), limit(5));
    const poolsUnsub = onSnapshot(poolsQuery, (snapshot) => {
      const pList: any[] = [];
      snapshot.forEach((doc) => pList.push({ id: doc.id, ...doc.data() }));
      setTopPools(pList);
    });

    // 4. Fetch Recent Transactions
    const txQuery = query(collection(db, "transactions"), where("uid", "==", user.uid), limit(5));
    const txUnsub = onSnapshot(txQuery, (snapshot) => {
      const txs: any[] = [];
      snapshot.forEach((doc) => txs.push({ id: doc.id, ...doc.data() }));
      setTransactions(txs.sort((a: any, b: any) => (b.date?.seconds || 0) - (a.date?.seconds || 0)));
      setLoading(false);
    });

    return () => {
      userUnsub();
      invUnsub();
      poolsUnsub();
      txUnsub();
    };
  }, []);

  const totalYield = "+4.8%";
  const profitEquity = activeInvestments.reduce((acc, inv) => {
    const expected = inv.expectedReturn || (inv.amount * 1.15); // Fallback to 15%
    return acc + (expected - inv.amount);
  }, 0);

  // Merge transactions and investments for activity feed
  const combinedActivities = [
    ...(transactions || []).map(t => ({ ...t, activityType: 'transaction' })),
    ...(activeInvestments || []).map(i => ({ ...i, activityType: 'investment' }))
  ].sort((a, b) => {
    const dateA = a.date?.seconds || (typeof a.date?.toDate === 'function' ? a.date.toDate().getTime() / 1000 : 0);
    const dateB = b.date?.seconds || (typeof b.date?.toDate === 'function' ? b.date.toDate().getTime() / 1000 : 0);
    return dateB - dateA;
  }).slice(0, 5);

  const formatActivityDate = (date: any) => {
    if (!date) return "Pending";
    if (typeof date.toDate === 'function') return date.toDate().toLocaleDateString();
    if (date.seconds) return new Date(date.seconds * 1000).toLocaleDateString();
    return "Recent";
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount to withdraw.");
      return;
    }
    if (amount > balance) {
      Alert.alert("Insufficient Balance", "You cannot withdraw more than your current balance.");
      return;
    }

    setIsWithdrawing(true);
    try {
      const { callBackend } = await import('../../services/api');
      await callBackend('requestWithdrawal', {
        amount: amount,
        method: "M-Pesa",
        details: { phoneNumber: userData.phoneNumber }
      });

      Alert.alert("Request Sent", "Your withdrawal request has been submitted for approval. Funds have been locked.");
      setIsWithdrawModalVisible(false);
      setWithdrawAmount("");
    } catch (error: any) {
      console.error("Error requesting withdrawal:", error);
      Alert.alert("Error", error.message || "Failed to submit withdrawal request.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const isMatured = (maturityDate: any) => {
    if (!maturityDate) return false;
    const date = maturityDate.toDate ? maturityDate.toDate() : new Date(maturityDate.seconds ? maturityDate.seconds * 1000 : maturityDate);
    return date <= new Date();
  };

  const handlePoolWithdraw = async (investment: any) => {
    if (!isMatured(investment.maturityDate)) {
      const date = investment.maturityDate.toDate ? investment.maturityDate.toDate() : new Date(investment.maturityDate.seconds ? investment.maturityDate.seconds * 1000 : investment.maturityDate);
      Alert.alert("Locked", `This investment matures on ${date.toLocaleDateString()}. You can only withdraw after maturity.`);
      return;
    }

    if (investment.status === 'pending_withdrawal') {
      Alert.alert("Pending Approval", "This withdrawal is already awaiting Fami(admin) approval.");
      return;
    }

    Alert.alert(
      "Confirm Withdrawal",
      `Withdraw KES ${investment.expectedReturn.toLocaleString()} from ${investment.poolName}? This will be sent for approval by Fami.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setIsWithdrawing(true);
            try {
              const { callBackend } = await import('../../services/api');
              await callBackend('requestWithdrawal', {
                investmentId: investment.id,
                method: "M-Pesa",
                details: { phoneNumber: userData.phoneNumber }
              });

              Alert.alert("Request Sent", "Your withdrawal request has been submitted. Please await approval by Fami(admin).");
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to submit request.");
            } finally {
              setIsWithdrawing(false);
            }
          }
        }
      ]
    );
  };

  const formatMaturity = (maturityDate: any) => {
    if (!maturityDate) return "N/A";
    const date = maturityDate.toDate ? maturityDate.toDate() : new Date(maturityDate.seconds ? maturityDate.seconds * 1000 : maturityDate);
    return date.toLocaleDateString();
  };

  if (loading && !userData.username) {
    return (
      <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="white" />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greetingText}>Welcome back,</Text>
              <Text style={styles.usernameText}>{userData.username || "Investor"}</Text>
            </View>
            <TouchableOpacity style={styles.notificationBtn}>
              <View style={styles.dot} />
              <Ionicons name="notifications-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Portfolio Main Card */}
          <View style={styles.portfolioCard}>
            <View style={styles.portfolioTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.portfolioLabel}>Portfolio Equity</Text>
                <Text style={styles.portfolioValue}>
                  {(() => {
                    const principal = activeInvestments.reduce((acc, inv) => acc + (inv.amount || 0), 0);
                    return `KES ${(balance + principal + profitEquity).toLocaleString()}`;
                  })()}
                </Text>
              </View>
              <View style={styles.yieldTag}>
                <Ionicons name="trending-up" size={14} color="#10B981" />
                <Text style={styles.yieldText}>{totalYield}</Text>
              </View>
            </View>

            <View style={styles.equityDetails}>
              <View style={styles.equityItem}>
                <Text style={styles.equityLabel}>Cash Balance</Text>
                <Text style={styles.equityValue}>KES {balance.toLocaleString()}</Text>
              </View>
              <View style={styles.equityDivider} />
              <View style={styles.equityItem}>
                <Text style={styles.equityLabel}>Invested</Text>
                <Text style={styles.equityValue}>KES {activeInvestments.reduce((acc, inv) => acc + (inv.amount || 0), 0).toLocaleString()}</Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/FarmerPools" as any)}>
                <MaterialCommunityIcons name="finance" size={20} color="#0B3D2E" />
                <Text style={styles.actionText}>Browse Pools</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setIsWithdrawModalVisible(true)}>
                <MaterialCommunityIcons name="cash-fast" size={20} color="#0B3D2E" />
                <Text style={styles.actionText}>Withdraw</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/transaction" as any)}>
                <MaterialCommunityIcons name="history" size={20} color="#0B3D2E" />
                <Text style={styles.actionText}>History</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/ImpactReport" as any)}>
                <MaterialCommunityIcons name="leaf" size={20} color="#0B3D2E" />
                <Text style={styles.actionText}>My Impact</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* My Active Portfolios Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Active Portfolios</Text>
          </View>
          <View style={styles.investmentList}>
            {activeInvestments.length === 0 ? (
              <View style={styles.emptyInvestments}>
                <MaterialCommunityIcons name="seed-outline" size={40} color="#94A3B8" />
                <Text style={styles.emptyText}>No active investments yet</Text>
                <TouchableOpacity onPress={() => router.push("/FarmerPools" as any)}>
                  <Text style={styles.startInvesting}>Start Investing</Text>
                </TouchableOpacity>
              </View>
            ) : (
              activeInvestments.map((inv) => (
                <View key={inv.id} style={styles.investmentItem}>
                  <View style={styles.invHeader}>
                    <Text style={styles.invPoolName}>{inv.poolName}</Text>
                    <View style={[
                      styles.statusBadge,
                      {
                        backgroundColor: inv.status === 'pending_withdrawal' ? '#FEF3C7' :
                          inv.status === 'pending' ? '#DBEAFE' :
                            (isMatured(inv.maturityDate) ? '#DCFCE7' : '#F1F5F9')
                      }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        {
                          color: inv.status === 'pending_withdrawal' ? '#92400E' :
                            inv.status === 'pending' ? '#1E40AF' :
                              (isMatured(inv.maturityDate) ? '#166534' : '#64748B')
                        }
                      ]}>
                        {inv.status === 'pending_withdrawal' ? 'Pending Approval' :
                          inv.status === 'pending' ? 'Pending Payment' :
                            (isMatured(inv.maturityDate) ? 'Ready' : 'Growing')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.invStats}>
                    <View style={styles.invStat}>
                      <Text style={styles.invLabel}>Invested</Text>
                      <Text style={styles.invValue}>KES {inv.amount.toLocaleString()}</Text>
                    </View>
                    <View style={styles.invStat}>
                      <Text style={styles.invLabel}>Expected Payout</Text>
                      <Text style={[styles.invValue, { color: '#0B3D2E' }]}>KES {inv.expectedReturn?.toLocaleString()}</Text>
                    </View>
                    <View style={styles.invStat}>
                      <Text style={styles.invLabel}>Maturity</Text>
                      <Text style={styles.invValue}>{formatMaturity(inv.maturityDate)}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.withdrawalBtn,
                      (!isMatured(inv.maturityDate) || inv.status === 'pending_withdrawal') && styles.disabledBtn
                    ]}
                    onPress={() => handlePoolWithdraw(inv)}
                    disabled={inv.status === 'pending_withdrawal'}
                  >
                    <Text style={styles.withdrawalBtnText}>
                      {inv.status === 'pending_withdrawal' ? 'Awaiting Fami(admin) Approval' : 'Withdraw to Wallet'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </View>
        {/* Top Pools for You */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Pools for You</Text>
            <TouchableOpacity onPress={() => router.push("/FarmerPools" as any)}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            {topPools.map((pool) => (
              <TouchableOpacity
                key={pool.id}
                style={styles.poolCard}
                onPress={() => router.push({ pathname: "/PoolDetails", params: { id: pool.id } } as any)}
              >
                <View style={styles.poolTag}>
                  <Text style={styles.poolTagText}>{pool.roi} ROI</Text>
                </View>
                <Text style={styles.poolName} numberOfLines={1}>{pool.name}</Text>
                <View style={styles.poolMetrics}>
                  <View>
                    <Text style={styles.metricLabel}>Risk</Text>
                    <Text style={[styles.metricValue, { color: pool.risk === 'Low' ? '#10B981' : '#F59E0B' }]}>{pool.risk}</Text>
                  </View>
                  <View>
                    <Text style={styles.metricLabel}>Funded</Text>
                    <Text style={styles.metricValue}>{pool.funded}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => router.push("/transaction" as any)}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.activityCard}>
            {combinedActivities.map((item: any) => (
              <View key={item.id} style={styles.activityItem}>
                <View style={[
                  styles.activityIcon,
                  { backgroundColor: item.activityType === "investment" ? "#DBEAFE" : (item.type === "Deposit" ? "#DCFCE7" : "#FEE2E2") }
                ]}>
                  <MaterialCommunityIcons
                    name={item.activityType === "investment" ? "briefcase-outline" : (item.type === "Deposit" ? "plus" : "minus")}
                    size={20}
                    color={item.activityType === "investment" ? "#1E40AF" : (item.type === "Deposit" ? "#166534" : "#991B1B")}
                  />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>
                    {item.activityType === 'investment' ? `Invested in ${item.poolName}` : (item.category || item.type)}
                  </Text>
                  <Text style={styles.activityDate}>{formatActivityDate(item.date)}</Text>
                </View>
                <Text style={[
                  styles.activityAmount,
                  { color: item.activityType === "investment" ? "#1E293B" : (item.type === "Deposit" ? "#166534" : "#EF4444") }
                ]}>
                  {item.type === "Deposit" ? "+" : "-"} KES {parseFloat(item.amount || "0").toLocaleString()}
                </Text>
              </View>
            ))}
            {combinedActivities.length === 0 && (
              <Text style={{ padding: 20, textAlign: 'center', color: '#94A3B8' }}>No recent activity</Text>
            )}
          </View>
        </View>
        {/* Withdrawal Modal */}
        <Modal
          visible={isWithdrawModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsWithdrawModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Withdraw Funds</Text>
              <Text style={styles.modalSub}>Enter the amount you wish to withdraw to your linked M-Pesa account.</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Amount (KES)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setIsWithdrawModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={handleWithdraw}
                  disabled={isWithdrawing}
                >
                  {isWithdrawing ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={styles.confirmBtnText}>Withdraw</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
    paddingTop: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  greetingText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
  },
  usernameText: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  dot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F87171",
    zIndex: 1,
    borderWidth: 2,
    borderColor: "#0B3D2E",
  },
  portfolioCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  portfolioTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  portfolioLabel: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  portfolioValue: {
    color: "#0F172A",
    fontSize: 28,
    fontWeight: "bold",
  },
  yieldTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  yieldText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  actionBtn: {
    alignItems: "center",
  },
  actionText: {
    color: "#0B3D2E",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
  equityDetails: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
    alignItems: "center",
  },
  equityItem: {
    flex: 1,
    alignItems: "center",
  },
  equityLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  equityValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  equityDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#E2E8F0",
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 30,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E293B",
  },
  seeAllText: {
    color: "#0B3D2E",
    fontSize: 14,
    fontWeight: "600",
  },
  horizontalScroll: {
    paddingRight: 20,
  },
  poolCard: {
    width: 200,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 16,
    marginRight: 15,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  poolTag: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  poolTagText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#475569",
  },
  poolName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 12,
  },
  poolMetrics: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metricLabel: {
    fontSize: 10,
    color: "#94A3B8",
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0F172A",
  },
  activityCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  activityDate: {
    fontSize: 11,
    color: "#94A3B8",
  },
  activityAmount: {
    fontSize: 15,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelBtnText: {
    fontWeight: '700',
    color: '#64748B',
  },
  confirmBtn: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#0B3D2E',
    alignItems: 'center',
  },
  confirmBtnText: {
    fontWeight: '700',
    color: 'white',
  },
  investmentList: {
    gap: 15,
  },
  investmentItem: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  invHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  invPoolName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginLeft: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  invStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  invStat: {
    flex: 1,
  },
  invLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginBottom: 4,
    fontWeight: '600',
  },
  invValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#334155',
  },
  withdrawalBtn: {
    backgroundColor: '#0B3D2E',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  withdrawalBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
  disabledBtn: {
    backgroundColor: '#E2E8F0',
    opacity: 0.7,
  },
  emptyInvestments: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: 'white',
    borderRadius: 24,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  emptyText: {
    marginTop: 10,
    color: '#64748B',
    fontSize: 14,
  },
  startInvesting: {
    marginTop: 12,
    color: '#0B3D2E',
    fontWeight: 'bold',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

import { View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { auth, db } from "./firebaseConfig";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function Transaction() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, "transactions"),
      where("uid", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const trans = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      trans.sort((a: any, b: any) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
      setTransactions(trans);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatDate = (date: any) => {
    if (!date) return "Pending";
    try {
      if (typeof date.toDate === 'function') return date.toDate().toLocaleDateString();
      if (date.seconds) return new Date(date.seconds * 1000).toLocaleDateString();
      return "N/A";
    } catch (e) {
      return "N/A";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0B3D2E" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryCard}>
            <View>
              <Text style={styles.asOfText}>As of today</Text>
              <Text style={styles.dateText}>{new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
            </View>
            <MaterialCommunityIcons name="receipt" size={32} color="#0B3D2E" />
          </View>

          <View style={styles.listContainer}>
            {transactions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="tray" size={48} color="#94A3B8" />
                <Text style={styles.emptyText}>No transactions found</Text>
              </View>
            ) : (
              transactions.map((item: any) => (
                <View key={item.id} style={styles.transactionCard}>
                  <View style={[styles.iconContainer, { backgroundColor: item.type === "Deposit" ? "#DCFCE7" : "#FEE2E2" }]}>
                    <MaterialCommunityIcons
                      name={item.type === "Deposit" ? "arrow-down-left" : "arrow-up-right"}
                      size={20}
                      color={item.type === "Deposit" ? "#166534" : "#991B1B"}
                    />
                  </View>
                  <View style={styles.infoContainer}>
                    <Text style={styles.typeText}>{item.category || item.type}</Text>
                    <Text style={styles.dateLabel}>{formatDate(item.date)}</Text>
                  </View>
                  <Text style={[styles.amountText, { color: item.type === "Deposit" ? "#166534" : "#EF4444" }]}>
                    {item.type === "Deposit" ? "+" : "-"} KES {parseFloat(item.amount || "0").toLocaleString()}
                  </Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
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
    fontWeight: "bold",
    color: "#0F172A",
  },
  scrollContent: {
    padding: 20,
  },
  summaryCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  asOfText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  dateText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0F172A",
    marginTop: 4,
  },
  listContainer: {
    gap: 12,
  },
  transactionCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  infoContainer: {
    flex: 1,
  },
  typeText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  dateLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  amountText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
    gap: 15,
  },
  emptyText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "600",
  },
});

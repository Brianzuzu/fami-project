import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { getFirestore, collection, query, where, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { useRouter } from "expo-router";

// Define the shape of the transaction object
interface Transaction {
  id: string;
  userId: string;
  type: string;
  amount: number;
  date: any; // You can replace `any` with `Timestamp` if using Firebase Timestamp
}

const FarmersTransactions = () => {
  const db = getFirestore();
  const auth = getAuth();
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loanBalance, setLoanBalance] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, "transactions"), where("userId", "==", user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Transaction[] = [];
      let balance = 0;

      snapshot.forEach((doc) => {
        const t = doc.data();
        const amount = parseFloat(t.amount || "0");

        if (t.type === "Loan Request") balance += amount;
        else if (t.type === "Loan Repayment") balance -= amount;

        data.push({
          id: doc.id,
          userId: t.userId,
          type: t.type,
          amount,
          date: t.date,  // Store the timestamp directly
        });
      });

      // Sort transactions by date, latest first
      data.sort((a, b) => b.date.seconds - a.date.seconds);

      setTransactions(data);
      setLoanBalance(balance);
    });

    return () => unsubscribe();
  }, []);

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 10,
        backgroundColor: "white",
        marginTop: 7,
      }}
    >
      <Text style={{ fontWeight: "bold" }}>{item.type}</Text>
      <Text style={{ fontWeight: "bold" }}>
        {item.date?.toDate()?.toLocaleDateString() || ""}
      </Text>
      <Text style={{ fontWeight: "bold" }}>
        {item.amount > 0 ? `+${item.amount}` : item.amount}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: "#f2f2f2" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 10 }}>
        Loan Transactions
      </Text>

      <View
        style={{
          backgroundColor: "#fff",
          padding: 15,
          borderRadius: 10,
          marginBottom: 20,
          elevation: 3,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "bold" }}>Loan Balance</Text>
        <Text style={{ fontSize: 20, color: "#247754", marginTop: 5 }}>
          Ksh {loanBalance.toLocaleString()}
        </Text>
      </View>

      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text>No recent transactions.</Text>}
      />

      <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 20 }}>
        <TouchableOpacity
          onPress={() => router.push("/PaymentScreen")}
          style={{
            backgroundColor: "#247754",
            width: "45%",
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 10,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontSize: 14 }}>Make Payment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/Farmer'sProfile")}
          style={{
            backgroundColor: "#247754",
            width: "45%",
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 10,
            marginLeft: 10,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontSize: 14 }}>View Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default FarmersTransactions;

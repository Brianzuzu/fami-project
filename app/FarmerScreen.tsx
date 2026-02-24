import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "./firebaseConfig"; // Make sure your firebase config is correct

interface Transaction {
  id: string;
  type: string;
  amount: number;
  date: any;
}

export default function FarmerScreen() {
  const router = useRouter();
  const auth = getAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loanBalance, setLoanBalance] = useState(0);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Fetch user name from Firestore
    const fetchUserData = async () => {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserName(data.username || "Farmer");
        }
      } catch (error) {
        console.error("Error fetching user name:", error);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, "transactions"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let balance = 0;
      const txns: Transaction[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const amount = Number(data.amount || 0);

        if (data.type === "Loan Request") balance += amount;
        else if (data.type === "Loan Repayment") balance -= amount;

        txns.push({
          id: doc.id,
          type: data.type,
          amount,
          date: data.date,
        });
      });

      txns.sort((a, b) => b.date.seconds - a.date.seconds);
      setTransactions(txns.slice(0, 5));
      setLoanBalance(balance);
    });

    return () => unsubscribe();
  }, []);

  return (
    <View>
      <View style={{ height: 250, backgroundColor: "#247754", padding: 20 }}>
        <Text style={{ color: "white", fontSize: 25 }}>FAMI FARMERS</Text>
        <Text style={{ color: "white", fontSize: 20 }}>Farmer Account</Text>
        <View style={{ marginTop: 30 }}>
          <Text style={{ color: "white", fontSize: 20, fontWeight: "bold" }}>
            {userName}
          </Text>
          <Text style={{ color: "#f8f9f9" }}>{auth.currentUser?.email}</Text>
        </View>
      </View>

      <View>
        <View
          style={{
            backgroundColor: "#d5dbdb",
            width: "90%",
            padding: 20,
            marginTop: -35,
            borderRadius: 20,
            marginHorizontal: "auto",
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text style={{ fontSize: 20 }}>Loan Balance</Text>
            <Text style={{ fontSize: 20, fontWeight: "bold" }}>BAL</Text>
          </View>
          <View>
            <Text style={{ fontSize: 20 }}>KES</Text>
            <Text style={{ fontSize: 20, fontWeight: "bold" }}>
              {loanBalance.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 25, width: "90%", marginHorizontal: "auto" }}>
          <Text style={{ fontSize: 20, fontWeight: "bold" }}>Recent Transactions</Text>
        </View>
      </View>

      <View
        style={{
          backgroundColor: "#d5dbdb",
          marginTop: 25,
          width: "95%",
          marginHorizontal: "auto",
          padding: 10,
          borderRadius: 15,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            padding: 10,
            backgroundColor: "#247754",
            borderTopRightRadius: 7,
            borderTopLeftRadius: 7,
          }}
        >
          <Text style={{ fontWeight: "bold", color: "white" }}>TYPE</Text>
          <Text style={{ fontWeight: "bold", color: "white" }}>DATE</Text>
          <Text style={{ fontWeight: "bold", color: "white" }}>AMOUNT</Text>
        </View>

        {transactions.length === 0 ? (
          <Text style={{ padding: 10 }}>No recent transactions.</Text>
        ) : (
          transactions.map((item) => (
            <View
              key={item.id}
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
              <Text style={{ fontWeight: "bold" }}>{item.amount}</Text>
            </View>
          ))
        )}

        <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
          <TouchableOpacity
            onPress={() => router.push("./FarmersTransactions")}
            style={{
              backgroundColor: "#247754",
              width: "30%",
              paddingVertical: 8,
              paddingHorizontal: 10,
              borderRadius: 10,
              marginTop: 25,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Text style={{ color: "white", fontSize: 14 }}>View All</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 30,
          paddingHorizontal: 20,
        }}
      >
        <TouchableOpacity
          onPress={() => router.push("/PaymentScreen")}
          style={{
            backgroundColor: "#247754",
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 10,
            width: "45%",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontSize: 14 }}>Make Payment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/Farmer'sProfile")}
          style={{
            backgroundColor: "#247754",
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 10,
            width: "45%",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontSize: 14 }}>View Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

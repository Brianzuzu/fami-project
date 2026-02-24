import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  StyleSheet,
} from "react-native";
import React, { useState } from "react";
import { useRouter } from "expo-router";
import { auth, db } from "./firebaseConfig";
import { collection, addDoc, Timestamp } from "firebase/firestore";

export default function PaymentScreen() {
  const router = useRouter();
  const [enterAmount, setEnterAmount] = useState("");

  const handleTransaction = async (type: "Loan Request" | "Loan Repayment") => {
    if (!enterAmount) {
      Alert.alert("Error", "Please enter amount.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "User not authenticated.");
      return;
    }

    try {
      await addDoc(collection(db, "transactions"), {
        userId: user.uid,
        type,
        amount: parseFloat(enterAmount),
        date: Timestamp.now(),
      });

      Alert.alert("Success", `${type} recorded successfully.`);
      setEnterAmount("");
      router.push("/FarmersTransactions");
    } catch (error) {
      console.error("Transaction Error:", error);
      Alert.alert("Error", "Failed to record transaction.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Request or Pay Loan</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter Amount"
        placeholderTextColor="black"
        value={enterAmount}
        onChangeText={setEnterAmount}
        keyboardType="numeric"
      />

      <View style={styles.buttonRow}>
        <TouchableOpacity
          onPress={() => handleTransaction("Loan Request")}
          style={styles.buttonWhite}
        >
          <Text style={styles.greenText}>Request Loan</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleTransaction("Loan Repayment")}
          style={styles.buttonWhite}
        >
          <Text style={styles.redText}>Pay Loan</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#248906",
    padding: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginTop: 40,
  },
  input: {
    backgroundColor: "white",
    color: "black",
    fontSize: 18,
    marginTop: 30,
    borderRadius: 10,
    padding: 15,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  buttonWhite: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 10,
    width: "45%",
    alignItems: "center",
  },
  greenText: {
    color: "green",
    fontWeight: "700",
    fontSize: 18,
  },
  redText: {
    color: "red",
    fontWeight: "700",
    fontSize: 18,
  },
});

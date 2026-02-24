import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { getAuth, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebaseConfig"; // Adjust path if needed
import { useRouter } from "expo-router";

export default function FarmerProfile() {
  const [userData, setUserData] = useState<any>(null);
  const auth = getAuth();
  const router = useRouter();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/SignUpScreen"); // Redirect to signup screen
    } catch (error: any) {
      Alert.alert("Logout Failed", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>FAMI PROFILE</Text>
      </View>

      <View style={styles.profileCard}>
        <Text style={styles.name}>{userData?.username || "Loading..."}</Text>
        <Text style={styles.email}>{userData?.email || user?.email}</Text>
        <Text style={styles.type}>Account Type: {userData?.userType}</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoLabel}>Phone Number</Text>
        <Text style={styles.infoValue}>{userData?.phone || "N/A"}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={() => Alert.alert("Edit Profile", "Edit functionality coming soon!")}
          style={styles.editButton}
        >
          <Text style={styles.buttonText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f4f4",
    paddingTop: 50,
    alignItems: "center",
  },
  header: {
    backgroundColor: "#247754",
    width: "100%",
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  headerText: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
  },
  profileCard: {
    backgroundColor: "white",
    width: "90%",
    borderRadius: 15,
    alignItems: "center",
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 5,
    elevation: 5,
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#247754",
  },
  email: {
    fontSize: 16,
    color: "#7f8c8d",
    marginTop: 5,
  },
  type: {
    fontSize: 16,
    color: "#1c2833",
    marginTop: 10,
    fontStyle: "italic",
  },
  infoBox: {
    backgroundColor: "white",
    width: "90%",
    marginTop: 20,
    borderRadius: 10,
    padding: 15,
  },
  infoLabel: {
    fontSize: 16,
    color: "#34495e",
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#247754",
  },
  buttonContainer: {
    marginTop: 30,
    width: "90%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  editButton: {
    backgroundColor: "#247754",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: "45%",
    alignItems: "center",
  },
  logoutButton: {
    backgroundColor: "#c0392b",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: "45%",
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
});

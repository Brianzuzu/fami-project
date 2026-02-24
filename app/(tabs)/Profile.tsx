import React, { useEffect, useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Image,
} from "react-native";
import { getAuth, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useRouter } from "expo-router";
import {
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome5,
} from "@expo/vector-icons";

export default function InvestorProfile() {
  const [userData, setUserData] = useState<{ username: string | null; email: string | null }>({
    username: null,
    email: null,
  });
  const [balance, setBalance] = useState(0);
  const [transactionCount, setTransactionCount] = useState(0);

  const router = useRouter();
  const auth = getAuth();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Fetch User Profile
    const fetchUserData = async () => {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData({
            username: docSnap.data().username,
            email: docSnap.data().email,
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    fetchUserData();

    // Fetch Investment Stats
    const q = query(collection(db, "transactions"), where("uid", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let total = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        const amount = parseFloat(data.amount || "0");
        if (data.type === "Deposit") total += amount;
        else if (data.type === "Withdrawal") total -= amount;
      });
      setBalance(total);
      setTransactionCount(snapshot.size);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/SignUpScreen");
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const ProfileItem = ({ icon, label, onPress, color = "#475569" }: {
    icon: string, label: string, onPress: () => void, color?: string
  }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIconContainer, { backgroundColor: color + "10" }]}>
        <MaterialCommunityIcons name={icon as any} size={22} color={color} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {userData.username ? userData.username.charAt(0).toUpperCase() : "I"}
                </Text>
              </View>
              <View style={styles.onlineBadge} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.username}>{userData.username || "Investor"}</Text>
              <Text style={styles.emailText}>{userData.email || "Verification Pending"}</Text>
              <View style={styles.tierBadge}>
                <FontAwesome5 name="medal" size={12} color="#D4AF37" />
                <Text style={styles.tierText}>Silver Investor</Text>
              </View>
            </View>
          </View>

          {/* Portfolio Snapshot */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>KES {balance.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Net Equity</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{transactionCount}</Text>
              <Text style={styles.statLabel}>Investments</Text>
            </View>
          </View>
        </View>

        {/* Menu Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          <View style={styles.menuCard}>
            <ProfileItem
              icon="account-edit"
              label="Edit Profile"
              onPress={() => router.push("/EditProfile")}
              color="#0B3D2E"
            />
            <ProfileItem
              icon="shield-lock"
              label="Security & PIN"
              onPress={() => router.push("/SecurityPin")}
              color="#0A1F44"
            />
            <ProfileItem
              icon="bell-ring"
              label="Notifications"
              onPress={() => router.push("/Notifications")}
              color="#F59E0B"
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Fami</Text>
          <View style={styles.aboutCard}>
            <View style={styles.aboutHeader}>
              <MaterialCommunityIcons name="leaf" size={24} color="#248906" />
              <Text style={styles.aboutTitle}>Empowering Farmers</Text>
            </View>
            <Text style={styles.aboutText}>
              Fami Investment connects forward-thinking investors with agricultural opportunities,
              providing vital capital to farmers while delivering sustainable returns.
            </Text>
            <TouchableOpacity style={styles.learnMoreBtn}>
              <Text style={styles.learnMoreText}>View Impact Report</Text>
              <Ionicons name="arrow-forward" size={16} color="#0B3D2E" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Section */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out Account</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Version 2.4.0 (Heritage)</Text>
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
    paddingTop: 30,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 3,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "800",
    color: "white",
  },
  onlineBadge: {
    position: "absolute",
    bottom: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#22C55E",
    borderWidth: 3,
    borderColor: "#0B3D2E",
  },
  profileInfo: {
    marginLeft: 20,
    flex: 1,
  },
  username: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 8,
  },
  tierBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  tierText: {
    color: "#D4AF37",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 6,
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 24,
    padding: 20,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E2E8F0",
    height: "100%",
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 12,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#334155",
  },
  aboutCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  aboutHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0B3D2E",
    marginLeft: 10,
  },
  aboutText: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 22,
    marginBottom: 16,
  },
  learnMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  learnMoreText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0B3D2E",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginTop: 40,
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#FEE2E2",
    gap: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#EF4444",
  },
  versionText: {
    textAlign: "center",
    marginTop: 20,
    marginBottom: 40,
    color: "#94A3B8",
    fontSize: 12,
  },
});

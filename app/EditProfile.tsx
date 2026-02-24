import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Alert,
    ActivityIndicator,
} from "react-native";
import { getAuth } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

export default function EditProfile() {
    const router = useRouter();
    const auth = getAuth();
    const user = auth.currentUser;

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user) {
            const fetchUserData = async () => {
                try {
                    const docRef = doc(db, "users", user.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setUsername(docSnap.data().username || "");
                        setEmail(docSnap.data().email || user.email || "");
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    Alert.alert("Error", "Could not load user data.");
                } finally {
                    setLoading(false);
                }
            };
            fetchUserData();
        }
    }, [user]);

    const handleSave = async () => {
        if (!username.trim()) {
            Alert.alert("Error", "Username cannot be empty.");
            return;
        }

        if (!user) return;

        setSaving(true);
        try {
            const docRef = doc(db, "users", user.uid);
            await updateDoc(docRef, {
                username: username.trim(),
            });
            Alert.alert("Success", "Profile updated successfully!");
            router.back();
        } catch (error) {
            console.error("Error updating profile:", error);
            Alert.alert("Error", "Failed to update profile.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0B3D2E" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.avatarSection}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {username ? username.charAt(0).toUpperCase() : "I"}
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.changePicBtn}>
                        <Text style={styles.changePicText}>Change Profile Picture</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Username</Text>
                        <View style={styles.inputContainer}>
                            <MaterialCommunityIcons name="account-outline" size={20} color="#64748B" />
                            <TextInput
                                style={styles.input}
                                value={username}
                                onChangeText={setUsername}
                                placeholder="Enter username"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email Address</Text>
                        <View style={[styles.inputContainer, styles.disabledInput]}>
                            <MaterialCommunityIcons name="email-outline" size={20} color="#94A3B8" />
                            <TextInput
                                style={[styles.input, { color: "#94A3B8" }]}
                                value={email}
                                editable={false}
                            />
                        </View>
                        <Text style={styles.helperText}>Email cannot be changed.</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
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
        fontWeight: "700",
        color: "#0F172A",
    },
    content: {
        padding: 20,
    },
    avatarSection: {
        alignItems: "center",
        marginBottom: 30,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "#0B3D2E",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 10,
    },
    avatarText: {
        fontSize: 40,
        fontWeight: "bold",
        color: "white",
    },
    changePicBtn: {
        padding: 5,
    },
    changePicText: {
        color: "#0B3D2E",
        fontWeight: "600",
    },
    form: {
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#475569",
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 50,
    },
    disabledInput: {
        backgroundColor: "#F1F5F9",
    },
    input: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: "#0F172A",
    },
    helperText: {
        fontSize: 12,
        color: "#94A3B8",
    },
    saveButton: {
        backgroundColor: "#0B3D2E",
        height: 55,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 10,
    },
    saveButtonText: {
        color: "white",
        fontSize: 18,
        fontWeight: "700",
    },
});

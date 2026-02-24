import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

export default function SecurityPin() {
    const router = useRouter();
    const [pin, setPin] = useState("");

    const handlePinPress = (num: string) => {
        if (pin.length < 4) {
            setPin(pin + num);
        }
    };

    const handleBackspace = () => {
        setPin(pin.slice(0, -1));
    };

    const handleSavePin = () => {
        if (pin.length === 4) {
            Alert.alert("Success", "Security PIN has been updated!");
            router.back();
        } else {
            Alert.alert("Error", "Please enter a 4-digit PIN.");
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Security & PIN</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.lockInfo}>
                    <View style={styles.lockCircle}>
                        <MaterialCommunityIcons name="shield-lock" size={40} color="#0B3D2E" />
                    </View>
                    <Text style={styles.title}>Secure Your Account</Text>
                    <Text style={styles.subtitle}>
                        Enter a 4-digit PIN to secure your investments and transactions.
                    </Text>
                </View>

                <View style={styles.pinDisplay}>
                    {[1, 2, 3, 4].map((i) => (
                        <View
                            key={i}
                            style={[
                                styles.pinDot,
                                pin.length >= i && styles.pinDotActive,
                            ]}
                        />
                    ))}
                </View>

                <View style={styles.keypad}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <TouchableOpacity
                            key={num}
                            style={styles.key}
                            onPress={() => handlePinPress(num.toString())}
                        >
                            <Text style={styles.keyText}>{num}</Text>
                        </TouchableOpacity>
                    ))}
                    <View style={styles.key} />
                    <TouchableOpacity
                        style={styles.key}
                        onPress={() => handlePinPress("0")}
                    >
                        <Text style={styles.keyText}>0</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.key}
                        onPress={handleBackspace}
                    >
                        <MaterialCommunityIcons name="backspace-outline" size={24} color="#0F172A" />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.saveBtn} onPress={handleSavePin}>
                    <Text style={styles.saveBtnText}>Update PIN</Text>
                </TouchableOpacity>
            </View>
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
        fontWeight: "700",
        color: "#0F172A",
    },
    content: {
        flex: 1,
        padding: 20,
        alignItems: "center",
        justifyContent: "space-between",
    },
    lockInfo: {
        alignItems: "center",
        marginTop: 20,
    },
    lockCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#DCFCE7",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#0F172A",
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 14,
        color: "#64748B",
        textAlign: "center",
        paddingHorizontal: 40,
        lineHeight: 20,
    },
    pinDisplay: {
        flexDirection: "row",
        gap: 20,
        marginVertical: 40,
    },
    pinDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: "#E2E8F0",
    },
    pinDotActive: {
        backgroundColor: "#0B3D2E",
    },
    keypad: {
        flexDirection: "row",
        flexWrap: "wrap",
        width: "100%",
        justifyContent: "center",
    },
    key: {
        width: "30%",
        aspectRatio: 1.5,
        justifyContent: "center",
        alignItems: "center",
    },
    keyText: {
        fontSize: 24,
        fontWeight: "600",
        color: "#0F172A",
    },
    saveBtn: {
        width: "100%",
        backgroundColor: "#0B3D2E",
        padding: 18,
        borderRadius: 16,
        alignItems: "center",
        marginTop: 20,
    },
    saveBtnText: {
        color: "white",
        fontSize: 18,
        fontWeight: "700",
    },
});

import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Switch,
    ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

export default function Notifications() {
    const router = useRouter();
    const [settings, setSettings] = useState({
        investments: true,
        security: true,
        marketing: false,
        news: true,
    });

    const toggleSetting = (key: keyof typeof settings) => {
        setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const NotificationItem = ({
        icon,
        title,
        description,
        value,
        onToggle
    }: {
        icon: string,
        title: string,
        description: string,
        value: boolean,
        onToggle: () => void
    }) => (
        <View style={styles.item}>
            <View style={styles.itemIcon}>
                <MaterialCommunityIcons name={icon as any} size={24} color="#0B3D2E" />
            </View>
            <View style={styles.itemContent}>
                <Text style={styles.itemTitle}>{title}</Text>
                <Text style={styles.itemDescription}>{description}</Text>
            </View>
            <Switch
                value={value}
                onValueChange={onToggle}
                trackColor={{ false: "#E2E8F0", true: "#0B3D2E" }}
                thumbColor="white"
            />
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Preferences</Text>
                    <View style={styles.card}>
                        <NotificationItem
                            icon="chart-line"
                            title="Investment Alerts"
                            description="Get notified when your investments grow or need attention."
                            value={settings.investments}
                            onToggle={() => toggleSetting("investments")}
                        />
                        <View style={styles.divider} />
                        <NotificationItem
                            icon="shield-check"
                            title="Security Updates"
                            description="Critical alerts about your account security and PIN changes."
                            value={settings.security}
                            onToggle={() => toggleSetting("security")}
                        />
                        <View style={styles.divider} />
                        <NotificationItem
                            icon="bullhorn-outline"
                            title="Promotional Offers"
                            description="Be the first to know about new farming projects and bonus ROIs."
                            value={settings.marketing}
                            onToggle={() => toggleSetting("marketing")}
                        />
                        <View style={styles.divider} />
                        <NotificationItem
                            icon="newspaper-variant-outline"
                            title="Agri-News"
                            description="Weekly digest of agricultural trends and farmer success stories."
                            value={settings.news}
                            onToggle={() => toggleSetting("news")}
                        />
                    </View>
                </View>

                <TouchableOpacity style={styles.saveBtn} onPress={() => router.back()}>
                    <Text style={styles.saveBtnText}>Done</Text>
                </TouchableOpacity>
            </ScrollView>
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
        padding: 20,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#64748B",
        marginBottom: 12,
        marginLeft: 4,
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    card: {
        backgroundColor: "white",
        borderRadius: 24,
        padding: 8,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    item: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
    },
    itemIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: "#DCFCE7",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    itemContent: {
        flex: 1,
        marginRight: 10,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0F172A",
        marginBottom: 4,
    },
    itemDescription: {
        fontSize: 12,
        color: "#64748B",
        lineHeight: 18,
    },
    divider: {
        height: 1,
        backgroundColor: "#F1F5F9",
        marginHorizontal: 16,
    },
    saveBtn: {
        backgroundColor: "#0B3D2E",
        padding: 18,
        borderRadius: 16,
        alignItems: "center",
        marginTop: 10,
    },
    saveBtnText: {
        color: "white",
        fontSize: 18,
        fontWeight: "700",
    },
});

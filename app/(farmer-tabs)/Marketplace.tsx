import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
    Dimensions,
    FlatList,
    Modal,
    ActivityIndicator,
    Alert,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { auth, db, storage } from "../firebaseConfig";
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";

const CATEGORIES = ["All", "Crops", "Livestock", "Dairy", "Poultry"];


export default function Marketplace() {
    const [activeCategory, setActiveCategory] = useState("All");
    const [viewMode, setViewMode] = useState<"Listings" | "Prices">("Listings");
    const [listings, setListings] = useState<any[]>([]);
    const [marketPrices, setMarketPrices] = useState<any[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [image, setImage] = useState<string | null>(null);
    const [newProduce, setNewProduce] = useState({
        name: "",
        category: "Crops",
        quantity: "",
        price: "",
        location: "",
        description: "",
        paymentMethod: "M-Pesa",
        paymentDetails: "",
        isForAdminSale: false,
    });

    useEffect(() => {
        const q = query(collection(db, "marketplace"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data: any[] = [];
            snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
            setListings(data);
        });

        const pQuery = query(collection(db, "market_prices"));
        const pUnsub = onSnapshot(pQuery, (snapshot) => {
            const data: any[] = [];
            snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
            setMarketPrices(data);
        });

        return () => {
            unsubscribe();
            pUnsub();
        };
    }, []);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const uploadImage = async (uri: string) => {
        const response = await fetch(uri);
        const blob = await response.blob();
        const filename = `marketplace/${auth.currentUser?.uid}_${Date.now()}.jpg`;
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, blob);
        return await getDownloadURL(storageRef);
    };

    const handleCreateListing = async (forAdmin: boolean = false) => {
        if (!newProduce.name || !newProduce.price) {
            Alert.alert("Error", "Please fill name and price.");
            return;
        }
        setUploading(true);
        try {
            let imageUrl = image;

            if (image && (image.startsWith("file") || image.startsWith("content"))) {
                imageUrl = await uploadImage(image);
            }

            const farmerFamiId = `FM-${auth.currentUser?.uid?.substring(0, 6).toUpperCase()}`;

            if (editingId) {
                const docRef = doc(db, "marketplace", editingId);
                await updateDoc(docRef, {
                    ...newProduce,
                    isForAdminSale: forAdmin,
                    imageUrl,
                    updatedAt: Timestamp.now(),
                });
                Alert.alert("Success", "Listing updated!");
            } else {
                await addDoc(collection(db, "marketplace"), {
                    ...newProduce,
                    isForAdminSale: forAdmin,
                    imageUrl,
                    farmerId: auth.currentUser?.uid,
                    farmerFamiId,
                    farmerName: auth.currentUser?.displayName || "Farmer",
                    createdAt: Timestamp.now(),
                    status: forAdmin ? "Awaiting Admin Sale" : "Available",
                    paymentStatus: "Pending",
                });
                Alert.alert("Success", forAdmin ? "Produce handed to Fami for sale!" : "Listing posted!");
            }

            closeModal();
        } catch (error) {
            console.error("Error saving listing:", error);
            Alert.alert("Error", "Failed to save listing.");
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteListing = async (id: string) => {
        Alert.alert(
            "Delete Listing",
            "Are you sure?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, "marketplace", id));
                        } catch (error) {
                            console.error("Error deleting listing:", error);
                        }
                    }
                }
            ]
        );
    };

    const handleEditPress = (item: any) => {
        setEditingId(item.id);
        setNewProduce({
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            price: item.price,
            location: item.location,
            description: item.description || "",
            paymentMethod: item.paymentMethod || "M-Pesa",
            paymentDetails: item.paymentDetails || "",
            isForAdminSale: item.isForAdminSale || false,
        });
        setImage(item.imageUrl);
        setIsModalVisible(true);
    };

    const handleMarkAsSold = async (item: any) => {
        Alert.alert(
            "Mark as Sold",
            `Confirm sale of ${item.name}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Yes, Sold",
                    onPress: async () => {
                        try {
                            const docRef = doc(db, "marketplace", item.id);
                            await updateDoc(docRef, {
                                status: "Sold",
                                updatedAt: Timestamp.now(),
                            });

                            await addDoc(collection(db, "farm_records"), {
                                uid: auth.currentUser?.uid,
                                type: "Income",
                                amount: parseFloat(item.price),
                                category: "Sales",
                                description: `Sold ${item.name}`,
                                date: Timestamp.now(),
                            });

                            Alert.alert("Success", "Income recorded!");
                        } catch (error) {
                            Alert.alert("Error", "Failed to update.");
                        }
                    }
                }
            ]
        );
    };

    const closeModal = () => {
        setIsModalVisible(false);
        setEditingId(null);
        setNewProduce({
            name: "",
            category: "Crops",
            quantity: "",
            price: "",
            location: "",
            description: "",
            paymentMethod: "M-Pesa",
            paymentDetails: "",
            isForAdminSale: false
        });
        setImage(null);
    };

    const renderListing = ({ item }: { item: any }) => (
        <View style={styles.listingCard}>
            <View style={styles.listingInfo}>
                <View style={styles.listingHeader}>
                    <Text style={styles.listingName} numberOfLines={1}>{item.name}</Text>
                    <View style={[
                        styles.statusBadge,
                        { backgroundColor: item.status === "Sold" ? "#FEE2E2" : (item.isForAdminSale ? "#E0F2FE" : "#F1F5F9") }
                    ]}>
                        <Text style={[
                            styles.statusBadgeText,
                            { color: item.status === "Sold" ? "#991B1B" : (item.isForAdminSale ? "#0369A1" : "#64748B") }
                        ]}>
                            {item.status.toUpperCase()}
                        </Text>
                    </View>
                </View>
                <Text style={styles.listingCategory}>{item.category} • {item.location}</Text>

                {item.isForAdminSale && (
                    <View style={styles.famiHint}>
                        <MaterialCommunityIcons name="security" size={12} color="#0B3D2E" />
                        <Text style={styles.famiHintText}>Selling via Fami</Text>
                    </View>
                )}

                <View style={styles.priceRow}>
                    <Text style={styles.listingPrice}>KES {parseFloat(item.price).toLocaleString()}</Text>
                </View>

                {item.farmerId === auth.currentUser?.uid && (
                    <View style={styles.adminActions}>
                        {item.status !== "Sold" && !item.isForAdminSale && (
                            <TouchableOpacity style={styles.soldBtn} onPress={() => handleMarkAsSold(item)}>
                                <Text style={styles.soldBtnText}>Mark Sold</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.editBtn} onPress={() => handleEditPress(item)}>
                            <Ionicons name="pencil" size={14} color="#0B3D2E" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteListing(item.id)}>
                            <Ionicons name="trash" size={14} color="#991B1B" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );

    const renderMarketInsight = ({ item }: { item: any }) => (
        <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
                <View style={styles.insightProduceInfo}>
                    <Text style={styles.insightProduceName}>{item.produce}</Text>
                    <Text style={styles.insightMarketName}>{item.location}</Text>
                </View>
                <View style={styles.trendBadge}>
                    <Ionicons
                        name={item.trend === "up" ? "trending-up" : item.trend === "down" ? "trending-down" : "remove"}
                        size={16}
                        color={item.trend === "up" ? "#166534" : item.trend === "down" ? "#991B1B" : "#64748B"}
                    />
                </View>
            </View>
            <View style={styles.insightDetails}>
                <View style={styles.detailItem}>
                    <Ionicons name="location-outline" size={14} color="#64748B" />
                    <Text style={styles.detailText}>{item.location}</Text>
                </View>
                <View style={styles.priceContainer}>
                    <Text style={styles.insightPrice}>KES {item.price.toLocaleString()}</Text>
                    <Text style={styles.insightUnit}>/ {item.unit}</Text>
                </View>
            </View>
        </View>
    );

    const myAdminListings = listings.filter(l => l.farmerId === auth.currentUser?.uid && l.isForAdminSale);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Produce Market</Text>
                    <Text style={styles.famiId}>Your ID: FM-{auth.currentUser?.uid?.substring(0, 6).toUpperCase()}</Text>
                </View>
                <TouchableOpacity style={styles.searchBtn} onPress={() => setViewMode(viewMode === "Listings" ? "Prices" : "Listings")}>
                    <Ionicons name={viewMode === "Listings" ? "stats-chart" : "list"} size={24} color="#0B3D2E" />
                </TouchableOpacity>
            </View>

            {myAdminListings.length > 0 && viewMode === "Listings" && (
                <View style={styles.myTracker}>
                    <Text style={styles.trackerTitle}>Active Sales via Fami ({myAdminListings.length})</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trackerScroll}>
                        {myAdminListings.map((item) => (
                            <View key={item.id} style={styles.trackerItem}>
                                <Text style={styles.trackerName}>{item.name}</Text>
                                <Text style={[styles.trackerStatus, { color: item.status === 'Sold' ? '#166534' : '#0369A1' }]}>
                                    {item.status}
                                </Text>
                                <Text style={styles.trackerPayment}>Pay: {item.paymentStatus}</Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            <View style={styles.modeSwitcher}>
                <TouchableOpacity
                    style={[styles.modeBtn, viewMode === "Listings" && styles.modeBtnActive]}
                    onPress={() => setViewMode("Listings")}
                >
                    <Text style={[styles.modeText, viewMode === "Listings" && styles.modeTextActive]}>Marketplace</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.modeBtn, viewMode === "Prices" && styles.modeBtnActive]}
                    onPress={() => setViewMode("Prices")}
                >
                    <Text style={[styles.modeText, viewMode === "Prices" && styles.modeTextActive]}>Market Prices</Text>
                </TouchableOpacity>
            </View>

            {viewMode === "Listings" ? (
                <>
                    <View style={styles.categoryScroll}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    onPress={() => setActiveCategory(cat)}
                                    style={[
                                        styles.categoryTab,
                                        activeCategory === cat && styles.categoryTabActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.categoryText,
                                            activeCategory === cat && styles.categoryTextActive,
                                        ]}
                                    >
                                        {cat}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <FlatList
                        data={listings.filter(l => activeCategory === "All" || l.category === activeCategory)}
                        renderItem={renderListing}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        numColumns={2}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <MaterialCommunityIcons name="basket-outline" size={64} color="#CBD5E1" />
                                <Text style={styles.emptyText}>No produce listed yet.</Text>
                            </View>
                        }
                    />
                </>
            ) : (
                <FlatList
                    data={marketPrices}
                    renderItem={renderMarketInsight}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialCommunityIcons name="chart-line" size={64} color="#CBD5E1" />
                            <Text style={styles.emptyText}>No insight data.</Text>
                        </View>
                    }
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={() => setIsModalVisible(true)}>
                <Ionicons name="add" size={32} color="white" />
            </TouchableOpacity>

            <Modal visible={isModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingId ? "Edit" : "Market Your Produce"}</Text>
                            <TouchableOpacity onPress={closeModal}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.label}>Produce Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Boma Rhodes Hay"
                                value={newProduce.name}
                                onChangeText={(text) => setNewProduce({ ...newProduce, name: text })}
                            />

                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: 10 }}>
                                    <Text style={styles.label}>Price (KES)</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Amount"
                                        keyboardType="numeric"
                                        value={newProduce.price}
                                        onChangeText={(text) => setNewProduce({ ...newProduce, price: text })}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Quantity/Unit</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. 10 Bales"
                                        value={newProduce.quantity}
                                        onChangeText={(text) => setNewProduce({ ...newProduce, quantity: text })}
                                    />
                                </View>
                            </View>

                            <Text style={styles.label}>Location</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Rumuruti, Laikipia"
                                value={newProduce.location}
                                onChangeText={(text) => setNewProduce({ ...newProduce, location: text })}
                            />

                            <Text style={styles.label}>Detailed Description</Text>
                            <TextInput
                                style={[styles.input, { height: 80 }]}
                                placeholder="Describe quality, variety, etc."
                                multiline
                                value={newProduce.description}
                                onChangeText={(text) => setNewProduce({ ...newProduce, description: text })}
                            />

                            <Text style={styles.label}>Payment Method</Text>
                            <View style={styles.methodToggle}>
                                {["M-Pesa", "Bank"].map(m => (
                                    <TouchableOpacity
                                        key={m}
                                        style={[styles.methodBtn, newProduce.paymentMethod === m && styles.methodBtnActive]}
                                        onPress={() => setNewProduce({ ...newProduce, paymentMethod: m })}
                                    >
                                        <Text style={[styles.methodText, newProduce.paymentMethod === m && styles.methodTextActive]}>{m}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>{newProduce.paymentMethod === "Bank" ? "Bank Details" : "M-Pesa Number"}</Text>
                            <TextInput
                                style={styles.input}
                                placeholder={newProduce.paymentMethod === "Bank" ? "Acc Name, Bank, Branch, Acc No" : "07..."}
                                value={newProduce.paymentDetails}
                                onChangeText={(text) => setNewProduce({ ...newProduce, paymentDetails: text })}
                            />

                            <View style={styles.btnDouble}>
                                <TouchableOpacity
                                    style={[styles.submitBtn, { backgroundColor: '#F1F5F9', flex: 1, marginRight: 8 }]}
                                    onPress={() => handleCreateListing(false)}
                                    disabled={uploading}
                                >
                                    <Text style={[styles.submitText, { color: '#0B3D2E' }]}>Post Public</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.submitBtn, { flex: 1.5 }]}
                                    onPress={() => handleCreateListing(true)}
                                    disabled={uploading}
                                >
                                    <Text style={styles.submitText}>List for Admin Sale</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    header: {
        padding: 20,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#0B3D2E",
    },
    searchBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: "white",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#F1F5F9",
    },
    categoryScroll: {
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    categoryTab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "white",
        marginRight: 10,
        borderWidth: 1,
        borderColor: "#F1F5F9",
    },
    categoryTabActive: {
        backgroundColor: "#0B3D2E",
        borderColor: "#0B3D2E",
    },
    categoryText: {
        fontSize: 14,
        color: "#64748B",
        fontWeight: "600",
    },
    categoryTextActive: {
        color: "white",
    },
    listContent: {
        padding: 15,
        paddingBottom: 100,
    },
    listingCard: {
        flex: 1,
        backgroundColor: "white",
        borderRadius: 20,
        margin: 6,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#F1F5F9",
    },
    listingImage: {
        width: "100%",
        height: 120,
    },
    listingInfo: {
        padding: 12,
    },
    listingName: {
        fontSize: 15,
        fontWeight: "bold",
        color: "#1E293B",
        flex: 1,
    },
    listingHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 5,
    },
    soldBadge: {
        backgroundColor: "#FEE2E2",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    soldBadgeText: {
        fontSize: 10,
        fontWeight: "bold",
        color: "#991B1B",
    },
    soldBtn: {
        backgroundColor: "#0B3D2E",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        marginRight: "auto",
    },
    soldBtnText: {
        color: "white",
        fontSize: 11,
        fontWeight: "bold",
    },
    listingCategory: {
        fontSize: 11,
        color: "#64748B",
        marginTop: 2,
    },
    priceRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 8,
    },
    listingPrice: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#0B3D2E",
    },
    listingQuantity: {
        fontSize: 10,
        color: "#94A3B8",
    },
    fab: {
        position: "absolute",
        bottom: 25,
        right: 25,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#0B3D2E",
        justifyContent: "center",
        alignItems: "center",
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    emptyContainer: {
        alignItems: "center",
        marginTop: 100,
    },
    emptyText: {
        marginTop: 15,
        color: "#94A3B8",
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "white",
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 25,
        maxHeight: "80%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 25,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#0F172A",
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#64748B",
        marginBottom: 8,
    },
    input: {
        backgroundColor: "#F8FAFC",
        borderRadius: 12,
        padding: 15,
        fontSize: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "#F1F5F9",
    },
    submitBtn: {
        backgroundColor: "#0B3D2E",
        padding: 18,
        borderRadius: 15,
        alignItems: "center",
        marginTop: 10,
        marginBottom: 30,
    },
    submitText: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
    },
    modeSwitcher: {
        flexDirection: "row",
        backgroundColor: "#F1F5F9",
        borderRadius: 15,
        padding: 4,
        marginHorizontal: 20,
        marginBottom: 20,
    },
    modeBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: "center",
        borderRadius: 12,
    },
    modeBtnActive: {
        backgroundColor: "white",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    modeText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#64748B",
    },
    modeTextActive: {
        color: "#0B3D2E",
    },
    insightCard: {
        backgroundColor: "white",
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#F1F5F9",
    },
    insightHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    insightProduceInfo: {
        flex: 1,
    },
    insightProduceName: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#1E293B",
    },
    insightMarketName: {
        fontSize: 12,
        color: "#64748B",
        marginTop: 2,
    },
    trendBadge: {
        padding: 6,
        borderRadius: 10,
        backgroundColor: "#F8FAFC",
    },
    insightDetails: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    detailItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    detailText: {
        fontSize: 12,
        color: "#64748B",
    },
    priceContainer: {
        flexDirection: "row",
        alignItems: "baseline",
        gap: 4,
    },
    insightPrice: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#0B3D2E",
    },
    insightUnit: {
        fontSize: 12,
        color: "#94A3B8",
    },
    imagePicker: {
        width: "100%",
        height: 180,
        backgroundColor: "#F8FAFC",
        borderRadius: 15,
        borderWidth: 2,
        borderColor: "#F1F5F9",
        borderStyle: "dashed",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
        overflow: "hidden",
    },
    imagePreview: {
        width: "100%",
        height: "100%",
    },
    imagePlaceholder: {
        alignItems: "center",
    },
    placeholderText: {
        marginTop: 8,
        color: "#94A3B8",
        fontSize: 14,
    },
    adminActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 8,
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "#F1F5F9",
    },
    editBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: "#DCFCE7",
        justifyContent: "center",
        alignItems: "center",
    },
    deleteBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: "#FEE2E2",
        justifyContent: "center",
        alignItems: "center",
    },
    famiId: {
        fontSize: 12,
        color: "#64748B",
        marginTop: 2,
    },
    myTracker: {
        backgroundColor: "white",
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 20,
        padding: 15,
        borderWidth: 1,
        borderColor: "#E0F2FE",
    },
    trackerTitle: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#0369A1",
        marginBottom: 10,
    },
    trackerScroll: {
        gap: 10,
    },
    trackerItem: {
        backgroundColor: "#F8FAFC",
        borderRadius: 12,
        padding: 12,
        width: 150,
        borderWidth: 1,
        borderColor: "#F1F5F9",
    },
    trackerName: {
        fontSize: 13,
        fontWeight: "bold",
        color: "#1E293B",
    },
    trackerStatus: {
        fontSize: 11,
        fontWeight: "700",
        marginTop: 4,
    },
    trackerPayment: {
        fontSize: 10,
        color: "#64748B",
        marginTop: 2,
    },
    famiHint: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#DCFCE7",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: "flex-start",
        marginTop: 5,
        gap: 4,
    },
    famiHintText: {
        fontSize: 10,
        fontWeight: "bold",
        color: "#0B3D2E",
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    methodToggle: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 20,
    },
    methodBtn: {
        flex: 1,
        padding: 15,
        borderRadius: 12,
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#F1F5F9",
        alignItems: "center",
    },
    methodBtnActive: {
        backgroundColor: "#E0F2FE",
        borderColor: "#0369A1",
    },
    methodText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#64748B",
    },
    methodTextActive: {
        color: "#0369A1",
    },
    btnDouble: {
        flexDirection: "row",
        marginBottom: 30,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: "bold",
    },
});

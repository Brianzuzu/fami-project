import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Alert,
    TextInput,
    Modal,
    ActivityIndicator,
    FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { auth, db } from "../firebaseConfig";
import { collection, onSnapshot, query, addDoc, getDocs, Timestamp } from "firebase/firestore";

const INPUT_CATEGORIES = ["All", "Seeds", "Fertilizer", "Tools", "Feed"];

export default function InputShop() {
    const [activeCategory, setActiveCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [inputs, setInputs] = useState<any[]>([]);
    const [cart, setCart] = useState<any[]>([]);
    const [isCartVisible, setIsCartVisible] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    // Checkout States
    const [checkoutStep, setCheckoutStep] = useState(1); // 1: Cart, 2: Details, 3: Payment
    const [checkoutDetails, setCheckoutDetails] = useState({
        location: "",
        deliveryMethod: "Pickup", // Pickup or Delivery
        phone: "",
        paymentMethod: "M-Pesa",
        notes: ""
    });

    const PAYMENT_METHODS = [
        { id: 'M-Pesa', icon: 'smartphone', label: 'M-Pesa' },
        { id: 'Airtel', icon: 'smartphone', label: 'Airtel Money' },
        { id: 'Equity', icon: 'business', label: 'Equity Bank' },
        { id: 'Co-op', icon: 'business', label: 'Co-op Bank' },
        { id: 'Cash', icon: 'cash', label: 'Cash on Delivery' },
    ];

    useEffect(() => {
        const q = query(collection(db, "inputs"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data: any[] = [];
            snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
            setInputs(data);
        });
        return () => unsubscribe();
    }, []);

    const addToCart = (item: any) => {
        const existingItem = cart.find(i => i.id === item.id);
        if (existingItem) {
            setCart(cart.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setCart([...cart, { ...item, quantity: 1 }]);
        }
        Alert.alert("Added to Cart", `${item.name} added to your shoping cart.`);
    };

    const removeFromCart = (id: string) => {
        setCart(cart.filter(i => i.id !== id));
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart(cart.map(i => {
            if (i.id === id) {
                const newQty = i.quantity + delta;
                return newQty > 0 ? { ...i, quantity: newQty } : i;
            }
            return i;
        }));
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleCheckout = () => {
        if (cart.length === 0) return;

        const user = auth.currentUser;
        if (!user) {
            Alert.alert("Error", "You must be logged in to make a purchase.");
            return;
        }

        const recordPurchaseInFinance = async () => {
            try {
                await addDoc(collection(db, "farm_records"), {
                    uid: user.uid,
                    type: "Expense",
                    amount: cartTotal,
                    category: "Inputs",
                    description: `Bought ${cart.length} item(s) from Input Shop: ${cart.map(i => i.name).join(', ')}`,
                    produce: cart.map(i => i.name).join(', '),
                    quantity: `${cart.reduce((sum, item) => sum + (item.quantity || 1), 0)} units`,
                    source: "shop",
                    date: Timestamp.now(),
                });
            } catch (error) {
                console.error("Error syncing to finance:", error);
            }
        };

        if (checkoutDetails.paymentMethod === 'Cash') {
            setIsProcessingPayment(true);
            setTimeout(async () => {
                await recordPurchaseInFinance();
                setIsProcessingPayment(false);
                Alert.alert("Order Placed", "Your order has been received. Please pay KES " + cartTotal.toLocaleString() + " upon delivery/pickup.");
                setCart([]);
                setIsCartVisible(false);
                setCheckoutStep(1);
            }, 1500);
            return;
        }

        setIsProcessingPayment(true);
        // Simulate STK Push for various methods
        setTimeout(async () => {
            await recordPurchaseInFinance();
            setIsProcessingPayment(false);
            const methodLabel = PAYMENT_METHODS.find(m => m.id === checkoutDetails.paymentMethod)?.label || "Payment";
            Alert.alert(
                `${methodLabel} Prompt`,
                `A secure prompt for KES ${cartTotal.toLocaleString()} has been sent to your phone. Please authorize the transaction to complete your order.`,
                [{
                    text: "OK",
                    onPress: () => {
                        setCart([]);
                        setIsCartVisible(false);
                        setCheckoutStep(1);
                        setCheckoutDetails({ ...checkoutDetails, location: "", phone: "", notes: "" });
                    }
                }]
            );
        }, 2000);
    };

    const nextStep = () => {
        if (checkoutStep === 2) {
            if (!checkoutDetails.location || !checkoutDetails.phone) {
                Alert.alert("Missing Info", "Please provide both location and phone number.");
                return;
            }
        }
        setCheckoutStep(checkoutStep + 1);
    };

    const prevStep = () => setCheckoutStep(checkoutStep - 1);

    const renderInputCard = (item: any) => (
        <View key={item.id} style={styles.inputCard}>
            <View style={styles.cardHeader}>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.category}</Text>
                </View>
                {!!item.offerLabel && (
                    <View style={styles.offerBadge}>
                        <Text style={styles.offerBadgeText}>{item.offerLabel}</Text>
                    </View>
                )}
            </View>

            <Text style={styles.inputName}>{item.name}</Text>
            <View style={styles.priceContainer}>
                <Text style={styles.inputPrice}>KES {item.price.toLocaleString()}</Text>
                {!!item.originalPrice && (
                    <Text style={styles.originalPrice}>KES {item.originalPrice.toLocaleString()}</Text>
                )}
                <Text style={styles.unitText}>/ {item.unit}</Text>
            </View>

            <TouchableOpacity style={styles.buyBtn} onPress={() => addToCart(item)}>
                <Text style={styles.buyBtnText}>Add to Cart</Text>
                <Ionicons name="cart-outline" size={18} color="white" style={{ marginLeft: 10 }} />
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Input Shop</Text>
                    <Text style={styles.subtitle}>Secure tools and seeds easily</Text>
                </View>
                <TouchableOpacity style={styles.cartBtn} onPress={() => setIsCartVisible(true)}>
                    <Ionicons name="cart" size={24} color="#0B3D2E" />
                    {cart.length > 0 && <View style={styles.cartDot} />}
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#94A3B8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search for seeds, fertilizers..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            <View style={styles.categoryScroll}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {INPUT_CATEGORIES.map((cat) => (
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

            <ScrollView contentContainerStyle={styles.listContent}>
                {inputs
                    .filter((i) => (activeCategory === "All" || i.category === activeCategory) &&
                        (i.name.toLowerCase().includes(searchQuery.toLowerCase())))
                    .map(renderInputCard)}
            </ScrollView>

            <Modal visible={isCartVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, checkoutStep > 1 && { height: '80%' }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>
                                    {checkoutStep === 1 ? `Your Cart (${cart.length})` :
                                        checkoutStep === 2 ? "Delivery Details" : "Payment Method"}
                                </Text>
                                {checkoutStep > 1 && <Text style={styles.modalSub}>{cart.length} items • KES {cartTotal.toLocaleString()}</Text>}
                            </View>
                            <TouchableOpacity onPress={() => { setIsCartVisible(false); setCheckoutStep(1); }}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        {checkoutStep === 1 && (
                            <>
                                {cart.length === 0 ? (
                                    <View style={styles.emptyCart}>
                                        <MaterialCommunityIcons name="cart-off" size={64} color="#CBD5E1" />
                                        <Text style={styles.emptyText}>Your cart is empty.</Text>
                                    </View>
                                ) : (
                                    <>
                                        <FlatList
                                            data={cart}
                                            keyExtractor={(item) => item.id}
                                            renderItem={({ item }) => (
                                                <View style={styles.cartItem}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.cartItemName}>{item.name}</Text>
                                                        <Text style={styles.cartItemPrice}>KES {(item.price * item.quantity).toLocaleString()}</Text>
                                                    </View>
                                                    <View style={styles.quantityControls}>
                                                        <TouchableOpacity onPress={() => updateQuantity(item.id, -1)} style={styles.qtyBtn}>
                                                            <Ionicons name="remove" size={16} color="#0B3D2E" />
                                                        </TouchableOpacity>
                                                        <Text style={styles.qtyText}>{item.quantity}</Text>
                                                        <TouchableOpacity onPress={() => updateQuantity(item.id, 1)} style={styles.qtyBtn}>
                                                            <Ionicons name="add" size={16} color="#0B3D2E" />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.removeBtn}>
                                                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            )}
                                            style={{ maxHeight: 350 }}
                                        />
                                        <View style={styles.cartFooter}>
                                            <View style={styles.totalRow}>
                                                <Text style={styles.totalLabel}>Total Amount:</Text>
                                                <Text style={styles.totalValue}>KES {cartTotal.toLocaleString()}</Text>
                                            </View>
                                            <TouchableOpacity
                                                style={styles.checkoutBtn}
                                                onPress={() => setCheckoutStep(2)}
                                            >
                                                <Text style={styles.checkoutText}>Shipping Details</Text>
                                                <Ionicons name="arrow-forward" size={20} color="white" style={{ marginLeft: 10 }} />
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                )}
                            </>
                        )}

                        {checkoutStep === 2 && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <Text style={styles.formLabel}>How would you like to receive your items?</Text>
                                <View style={styles.deliveryToggle}>
                                    <TouchableOpacity
                                        style={[styles.toggleBtn, checkoutDetails.deliveryMethod === 'Pickup' && styles.toggleBtnActive]}
                                        onPress={() => setCheckoutDetails({ ...checkoutDetails, deliveryMethod: 'Pickup' })}
                                    >
                                        <Ionicons name="walk-outline" size={20} color={checkoutDetails.deliveryMethod === 'Pickup' ? 'white' : '#64748B'} />
                                        <Text style={[styles.toggleText, checkoutDetails.deliveryMethod === 'Pickup' && styles.toggleTextActive]}>Pickup</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.toggleBtn, checkoutDetails.deliveryMethod === 'Delivery' && styles.toggleBtnActive]}
                                        onPress={() => setCheckoutDetails({ ...checkoutDetails, deliveryMethod: 'Delivery' })}
                                    >
                                        <Ionicons name="bus-outline" size={20} color={checkoutDetails.deliveryMethod === 'Delivery' ? 'white' : '#64748B'} />
                                        <Text style={[styles.toggleText, checkoutDetails.deliveryMethod === 'Delivery' && styles.toggleTextActive]}>Delivery</Text>
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.formLabel}>{checkoutDetails.deliveryMethod === 'Pickup' ? 'Select Pickup Point' : 'Delivery Location'}</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder={checkoutDetails.deliveryMethod === 'Pickup' ? "e.g. Narok Input Depot" : "e.g. Oloibor Farm, Narok Road"}
                                    value={checkoutDetails.location}
                                    onChangeText={(text) => setCheckoutDetails({ ...checkoutDetails, location: text })}
                                />

                                <Text style={styles.formLabel}>WhatsApp / Contact Phone</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Enter phonenumber for updates"
                                    keyboardType="phone-pad"
                                    value={checkoutDetails.phone}
                                    onChangeText={(text) => setCheckoutDetails({ ...checkoutDetails, phone: text })}
                                />

                                <Text style={styles.formLabel}>Order Notes (Optional)</Text>
                                <TextInput
                                    style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]}
                                    placeholder="Any special instructions?"
                                    multiline
                                    value={checkoutDetails.notes}
                                    onChangeText={(text) => setCheckoutDetails({ ...checkoutDetails, notes: text })}
                                />

                                <View style={styles.stepFooter}>
                                    <TouchableOpacity style={styles.backBtn} onPress={prevStep}>
                                        <Text style={styles.backBtnText}>Back to Cart</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.nextBtn} onPress={nextStep}>
                                        <Text style={styles.nextBtnText}>Payment</Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        )}

                        {checkoutStep === 3 && (
                            <View style={{ flex: 1 }}>
                                <Text style={styles.formLabel}>Select Payment Method</Text>
                                <View style={styles.paymentList}>
                                    {PAYMENT_METHODS.map((method) => (
                                        <TouchableOpacity
                                            key={method.id}
                                            style={[styles.paymentItem, checkoutDetails.paymentMethod === method.id && styles.paymentItemActive]}
                                            onPress={() => setCheckoutDetails({ ...checkoutDetails, paymentMethod: method.id })}
                                        >
                                            <MaterialCommunityIcons
                                                name={method.icon as any}
                                                size={24}
                                                color={checkoutDetails.paymentMethod === method.id ? "#0B3D2E" : "#64748B"}
                                            />
                                            <Text style={[styles.paymentLabel, checkoutDetails.paymentMethod === method.id && styles.paymentLabelActive]}>
                                                {method.label}
                                            </Text>
                                            {checkoutDetails.paymentMethod === method.id && (
                                                <Ionicons name="checkmark-circle" size={20} color="#0B3D2E" />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <View style={[styles.cartFooter, { marginTop: 'auto' }]}>
                                    <View style={styles.totalRow}>
                                        <Text style={styles.totalLabel}>Total to Pay:</Text>
                                        <Text style={styles.totalValue}>KES {cartTotal.toLocaleString()}</Text>
                                    </View>
                                    <View style={styles.stepFooter}>
                                        <TouchableOpacity style={styles.backBtn} onPress={prevStep}>
                                            <Text style={styles.backBtnText}>Back</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.finalBtn, isProcessingPayment && { opacity: 0.7 }]}
                                            onPress={handleCheckout}
                                            disabled={isProcessingPayment}
                                        >
                                            {isProcessingPayment ? (
                                                <ActivityIndicator color="white" />
                                            ) : (
                                                <Text style={styles.finalBtnText}>Confirm & Pay</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        )}
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
    subtitle: {
        fontSize: 13,
        color: "#64748B",
        marginTop: 2,
    },
    cartBtn: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: "white",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#F1F5F9",
    },
    cartDot: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#EF4444',
        borderWidth: 2,
        borderColor: 'white',
    },
    categoryScroll: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    categoryTab: {
        paddingHorizontal: 16,
        paddingVertical: 10,
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
        padding: 20,
        paddingBottom: 40,
    },
    inputCard: {
        backgroundColor: "white",
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "#F1F5F9",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 15,
    },
    badge: {
        backgroundColor: "#F1F5F9",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: "bold",
        color: "#475569",
        textTransform: "uppercase",
    },
    offerBadge: {
        backgroundColor: "#FEE2E2",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    offerBadgeText: {
        fontSize: 11,
        fontWeight: "bold",
        color: "#991B1B",
    },
    inputName: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#1E293B",
        marginBottom: 8,
    },
    priceContainer: {
        flexDirection: "row",
        alignItems: "baseline",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 20,
    },
    inputPrice: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#0B3D2E",
    },
    originalPrice: {
        fontSize: 14,
        color: "#94A3B8",
        textDecorationLine: "line-through",
    },
    unitText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#94A3B8",
    },
    buyBtn: {
        backgroundColor: "#0B3D2E",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
        borderRadius: 15,
    },
    buyBtnText: {
        color: "white",
        fontSize: 15,
        fontWeight: "bold",
    },
    searchContainer: {
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "white",
        borderRadius: 15,
        paddingHorizontal: 15,
        height: 50,
        borderWidth: 1,
        borderColor: "#F1F5F9",
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
        color: "#1E293B",
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
        maxHeight: "85%",
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
    modalSub: {
        fontSize: 12,
        color: "#64748B",
        marginTop: 2,
    },
    emptyCart: {
        alignItems: "center",
        paddingVertical: 40,
    },
    emptyText: {
        marginTop: 15,
        color: "#94A3B8",
        fontSize: 16,
    },
    cartItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },
    cartItemName: {
        fontSize: 15,
        fontWeight: "700",
        color: "#1E293B",
    },
    cartItemPrice: {
        fontSize: 14,
        color: "#0B3D2E",
        fontWeight: "bold",
        marginTop: 4,
    },
    quantityControls: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    qtyBtn: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: "#F1F5F9",
        justifyContent: "center",
        alignItems: "center",
    },
    qtyText: {
        fontSize: 15,
        fontWeight: "bold",
        color: "#1E293B",
    },
    removeBtn: {
        marginLeft: 8,
    },
    cartFooter: {
        marginTop: 20,
        borderTopWidth: 1,
        borderTopColor: "#F1F5F9",
        paddingTop: 20,
    },
    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    totalLabel: {
        fontSize: 16,
        color: "#64748B",
        fontWeight: "600",
    },
    totalValue: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#0B3D2E",
    },
    checkoutBtn: {
        backgroundColor: "#0B3D2E",
        padding: 18,
        borderRadius: 15,
        alignItems: "center",
        flexDirection: 'row',
        justifyContent: 'center',
    },
    checkoutText: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
    },
    formLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 10,
        marginTop: 5,
    },
    deliveryToggle: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
    },
    toggleBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 8,
    },
    toggleBtnActive: {
        backgroundColor: '#0B3D2E',
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    toggleTextActive: {
        color: 'white',
    },
    formInput: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        marginBottom: 15,
        color: '#1E293B',
    },
    stepFooter: {
        flexDirection: 'row',
        gap: 15,
        marginTop: 10,
        marginBottom: 20,
    },
    backBtn: {
        flex: 1,
        padding: 16,
        borderRadius: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#0B3D2E',
    },
    backBtnText: {
        color: '#0B3D2E',
        fontSize: 15,
        fontWeight: 'bold',
    },
    nextBtn: {
        flex: 1,
        backgroundColor: '#0B3D2E',
        padding: 16,
        borderRadius: 15,
        alignItems: 'center',
    },
    nextBtnText: {
        color: 'white',
        fontSize: 15,
        fontWeight: 'bold',
    },
    paymentList: {
        gap: 12,
        marginBottom: 20,
    },
    paymentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F8FAFC',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        gap: 15,
    },
    paymentItemActive: {
        borderColor: '#0B3D2E',
        backgroundColor: '#F0FDF4',
    },
    paymentLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: '#64748B',
    },
    paymentLabelActive: {
        color: '#0B3D2E',
    },
    finalBtn: {
        flex: 2,
        backgroundColor: '#0B3D2E',
        padding: 16,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    finalBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

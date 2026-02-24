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
    Modal,
    ActivityIndicator,
    Alert,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { auth, db } from "../firebaseConfig";
import { collection, onSnapshot, query, addDoc, updateDoc, doc, orderBy, Timestamp, increment } from "firebase/firestore";

export default function Community() {
    const [posts, setPosts] = useState<any[]>([]);
    const [markets, setMarkets] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isPosting, setIsPosting] = useState(false);
    const [newPost, setNewPost] = useState({
        title: "",
        category: "Advice",
        content: "",
    });

    useEffect(() => {
        // Posts
        const postsQ = query(collection(db, "community_posts"), orderBy("createdAt", "desc"));
        const unsubPosts = onSnapshot(postsQ, (snapshot) => {
            setPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, () => setLoading(false));

        // Local markets (added by admin)
        const unsubMarkets = onSnapshot(collection(db, "local_markets"), snap => {
            setMarkets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Community groups (for the stats banner)
        const unsubGroups = onSnapshot(collection(db, "community_groups"), snap => {
            setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { unsubPosts(); unsubMarkets(); unsubGroups(); };
    }, []);

    const handleCreatePost = async () => {
        if (!newPost.title || !newPost.content) return;
        setIsPosting(true);
        try {
            await addDoc(collection(db, "community_posts"), {
                ...newPost,
                authorId: auth.currentUser?.uid,
                authorName: auth.currentUser?.displayName || "Farmer",
                likes: 0,
                likedBy: [],
                replies: 0,
                createdAt: Timestamp.now(),
            });
            setIsModalVisible(false);
            setNewPost({ title: "", category: "Advice", content: "" });
        } catch (error) {
            console.error("Error creating post:", error);
            Alert.alert("Error", "Failed to create post.");
        } finally {
            setIsPosting(false);
        }
    };

    const handleLikePost = async (postId: string, likedBy: string[] = []) => {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        const postRef = doc(db, "community_posts", postId);
        const isLiked = likedBy.includes(userId);

        try {
            await updateDoc(postRef, {
                likes: increment(isLiked ? -1 : 1),
                likedBy: isLiked
                    ? likedBy.filter(id => id !== userId)
                    : [...likedBy, userId]
            });
        } catch (error) {
            console.error("Error liking post:", error);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Farmer Community</Text>
                <TouchableOpacity style={styles.searchBtn}>
                    <Ionicons name="search" size={24} color="#0B3D2E" />
                </TouchableOpacity>
            </View>

            <View style={styles.topStats}>
                <View style={styles.statItem}>
                    <Text style={styles.statVal}>{posts.length}</Text>
                    <Text style={styles.statLab}>Discussions</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statVal}>{groups.length}</Text>
                    <Text style={styles.statLab}>Groups</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statVal}>{markets.length}</Text>
                    <Text style={styles.statLab}>Markets</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                <Text style={styles.sectionTitle}>Trending Discussions</Text>

                {loading ? (
                    <ActivityIndicator size="large" color="#0B3D2E" style={{ marginTop: 20 }} />
                ) : posts.map((post) => (
                    <TouchableOpacity key={post.id} style={styles.topicCard}>
                        <View style={styles.topicHeader}>
                            <View style={[styles.catBadge, { backgroundColor: post.category === 'Advice' ? '#E0F2FE' : '#F1F5F9' }]}>
                                <Text style={styles.catText}>{post.category}</Text>
                            </View>
                            <TouchableOpacity onPress={() => handleLikePost(post.id, post.likedBy)}>
                                <Ionicons
                                    name={post.likedBy?.includes(auth.currentUser?.uid) ? "heart" : "heart-outline"}
                                    size={22}
                                    color={post.likedBy?.includes(auth.currentUser?.uid) ? "#EF4444" : "#94A3B8"}
                                />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.topicTitle}>{post.title}</Text>
                        <Text style={styles.postContent} numberOfLines={2}>{post.content}</Text>
                        <View style={styles.topicFooter}>
                            <Text style={styles.author}>By {post.authorName}</Text>
                            <View style={styles.repliesRow}>
                                <MaterialCommunityIcons name="heart-outline" size={16} color="#64748B" style={{ marginRight: 4 }} />
                                <Text style={styles.replyText}>{post.likes || 0} likes</Text>
                                <MaterialCommunityIcons name="comment-text-multiple-outline" size={16} color="#64748B" style={{ marginLeft: 12, marginRight: 6 }} />
                                <Text style={styles.replyText}>{post.replies || 0} replies</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Local Markets</Text>
                    <Text style={styles.sectionSubtitle}>Markets in your region</Text>
                </View>

                {markets.length === 0 ? (
                    <View style={styles.emptyMarkets}>
                        <MaterialCommunityIcons name="store-outline" size={36} color="#CBD5E1" />
                        <Text style={styles.emptyMarketsText}>No local markets listed yet.</Text>
                        <Text style={styles.emptyMarketsSubtext}>Check back soon — your admin is setting them up.</Text>
                    </View>
                ) : markets.map(market => (
                    <View key={market.id} style={styles.marketCard}>
                        <View style={styles.marketIconBox}>
                            <MaterialCommunityIcons name="store" size={24} color="#0B3D2E" />
                        </View>
                        <View style={styles.groupInfo}>
                            <Text style={styles.groupName}>{market.name}</Text>
                            <Text style={styles.groupSub}>{market.location}</Text>
                            <View style={styles.marketMeta}>
                                {market.type ? (
                                    <View style={styles.metaChip}>
                                        <Text style={styles.metaChipText}>{market.type}</Text>
                                    </View>
                                ) : null}
                                {market.operatingDays ? (
                                    <View style={[styles.metaChip, { backgroundColor: '#F0FDF4' }]}>
                                        <Ionicons name="calendar-outline" size={10} color="#166534" />
                                        <Text style={[styles.metaChipText, { color: '#166534' }]}> {market.operatingDays}</Text>
                                    </View>
                                ) : null}
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                    </View>
                ))}

            </ScrollView>

            {/* Post FAB */}
            <TouchableOpacity style={styles.fab} onPress={() => setIsModalVisible(true)}>
                <Ionicons name="create-outline" size={28} color="white" />
            </TouchableOpacity>

            {/* Create Post Modal */}
            <Modal visible={isModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>New Discussion</Text>
                            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            <Text style={styles.label}>Title</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="What's on your mind?"
                                value={newPost.title}
                                onChangeText={(text) => setNewPost({ ...newPost, title: text })}
                            />

                            <Text style={styles.label}>Category</Text>
                            <View style={styles.categoryGrid}>
                                {['Advice', 'Trends', 'Reviews', 'News'].map(cat => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[styles.catChip, newPost.category === cat && styles.catChipActive]}
                                        onPress={() => setNewPost({ ...newPost, category: cat })}
                                    >
                                        <Text style={[styles.catChipText, newPost.category === cat && styles.catChipTextActive]}>{cat}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Content</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Detailed description..."
                                multiline
                                numberOfLines={4}
                                value={newPost.content}
                                onChangeText={(text) => setNewPost({ ...newPost, content: text })}
                            />

                            <TouchableOpacity
                                style={[styles.submitBtn, isPosting && { opacity: 0.7 }]}
                                onPress={handleCreatePost}
                                disabled={isPosting}
                            >
                                {isPosting ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.submitText}>Post Discussion</Text>
                                )}
                            </TouchableOpacity>
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
    topStats: {
        flexDirection: 'row',
        backgroundColor: '#0B3D2E',
        marginHorizontal: 20,
        borderRadius: 20,
        padding: 15,
        marginBottom: 20,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statVal: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    statLab: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 11,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignSelf: 'center',
    },
    scroll: {
        padding: 20,
        paddingBottom: 100,
    },
    sectionHeader: {
        marginTop: 30,
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#1E293B",
        marginBottom: 15,
    },
    topicCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 18,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    topicHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    catBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    catText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#0369A1',
    },
    topicTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        lineHeight: 22,
    },
    topicFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#F8FAFC',
    },
    author: {
        fontSize: 12,
        color: '#64748B',
    },
    repliesRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    replyText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
    },
    groupCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    groupImg: {
        width: 50,
        height: 50,
        borderRadius: 12,
    },
    groupInfo: {
        flex: 1,
        marginLeft: 15,
    },
    groupName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    groupSub: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 2,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: '#64748B',
        marginTop: -10,
        marginBottom: 20,
    },
    emptyMarkets: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        backgroundColor: 'white',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        borderStyle: 'dashed',
    },
    emptyMarketsText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#64748B',
        marginTop: 10,
    },
    emptyMarketsSubtext: {
        fontSize: 12,
        color: '#94A3B8',
        textAlign: 'center',
        marginTop: 5,
    },
    marketCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        marginBottom: 12,
    },
    marketIconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#F0FDF4',
        alignItems: 'center',
        justifyContent: 'center',
    },
    marketMeta: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    metaChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: '#F1F5F9',
    },
    metaChipText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#475569',
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
    },
    postContent: {
        fontSize: 14,
        color: "#64748B",
        marginTop: 8,
        lineHeight: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 25,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 10,
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20,
    },
    catChip: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
    },
    catChipActive: {
        backgroundColor: '#0B3D2E',
    },
    catChipText: {
        fontSize: 13,
        color: '#475569',
        fontWeight: '600',
    },
    catChipTextActive: {
        color: 'white',
    },
    submitBtn: {
        backgroundColor: '#0B3D2E',
        padding: 18,
        borderRadius: 15,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    submitText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

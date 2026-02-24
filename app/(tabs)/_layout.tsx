import { Tabs } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome"
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
    const insets = useSafeAreaInsets();

    return (
        <Tabs screenOptions={{
            tabBarActiveTintColor: '#247754',
            headerShown: false,
            tabBarStyle: {
                height: 60 + (insets.bottom > 0 ? insets.bottom - 10 : 0),
                paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
                paddingTop: 5,
            }
        }}>
            <Tabs.Screen
                name="Home"
                options={{
                    tabBarIcon: ({ color }) => <FontAwesome size={28} name="home" color={color} />
                }}
            />
            <Tabs.Screen
                name="Accounts"
                options={{
                    tabBarIcon: ({ color }) => <FontAwesome size={28} name="university" color={color} />
                }}
            />
            <Tabs.Screen
                name="Profile"
                options={{
                    tabBarIcon: ({ color }) => <FontAwesome size={28} name="user" color={color} />
                }}
            />
        </Tabs>
    )
}
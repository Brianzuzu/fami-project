import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FarmerLayout() {
    const insets = useSafeAreaInsets();

    return (
        <Tabs screenOptions={{
            tabBarActiveTintColor: '#0B3D2E',
            tabBarInactiveTintColor: '#94A3B8',
            tabBarStyle: {
                borderTopWidth: 1,
                borderTopColor: '#F1F5F9',
                height: 60 + (insets.bottom > 0 ? insets.bottom - 10 : 0),
                paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
                paddingTop: 5,
                backgroundColor: 'white',
            },
            headerShown: false,
        }}>
            <Tabs.Screen
                name="Home"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="view-dashboard-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="Marketplace"
                options={{
                    title: 'Market',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="storefront-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="InputShop"
                options={{
                    title: 'Inputs',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="seed-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="Finances"
                options={{
                    title: 'Finances',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="finance" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="Loans"
                options={{
                    title: 'Loans',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="bank-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="Community"
                options={{
                    title: 'Community',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="account-group-outline" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}

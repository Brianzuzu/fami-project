import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ title: "Login" }} />
        <Stack.Screen name="FarmerScreen" />
        <Stack.Screen name="transaction" />
        <Stack.Screen name="FarmersTransactions" />
        <Stack.Screen name="PaymentScreen" />
        <Stack.Screen name="Farmer'sProfile" />
        <Stack.Screen name="ConfirmPay" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SafeAreaProvider>
  );
}

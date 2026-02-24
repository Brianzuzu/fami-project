import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { BlurView } from "expo-blur";
import { StatusBar } from "expo-status-bar";

const { width } = Dimensions.get("window");

// CustomInput Component
interface CustomInputProps {
  label: string;
  iconUrl: string;
  secureTextEntry?: boolean;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
}

// CustomInput Component - Memoized to prevent unnecessary re-renders during typing
const CustomInput: React.FC<CustomInputProps> = React.memo(({
  label,
  iconUrl,
  secureTextEntry = false,
  value,
  onChangeText,
  keyboardType = "default",
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.inputOuterContainer}>
      <Text style={styles.inputLabelField}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused
        ]}
      >
        <Image source={{ uri: iconUrl }} style={styles.inputIcon} resizeMode="contain" />
        <TextInput
          style={styles.input}
          secureTextEntry={secureTextEntry}
          placeholder={`Enter your ${label.toLowerCase()}`}
          placeholderTextColor="#999"
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          keyboardType={keyboardType}
          // Added important props for stability
          underlineColorAndroid="transparent"
        />
      </View>
    </View>
  );
});

const LoginForm: React.FC<{
  email: string;
  setEmail: (t: string) => void;
  password: string;
  setPassword: (t: string) => void;
  loading: boolean;
  handleLogin: () => void;
  onSignUp: () => void;
}> = React.memo(({ email, setEmail, password, setPassword, loading, handleLogin, onSignUp }) => {
  return (
    <BlurView intensity={80} tint="light" style={styles.glassCard}>
      <View style={styles.formContent}>
        <Text style={styles.cardTitle}>Login</Text>

        <CustomInput
          label="Email"
          iconUrl="https://cdn.builder.io/api/v1/image/assets/TEMP/27d2d9751e5f60aa8db167ec2c654455bdeb11bc"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />

        <CustomInput
          label="Password"
          iconUrl="https://cdn.builder.io/api/v1/image/assets/TEMP/943ec9c0f9153d131b36be139fec1e78b31f50a0"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.loginButtonText}>CONTINUE</Text>
          )}
        </TouchableOpacity>
      </View>
    </BlurView>
  );
});

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please fill in both email and password.");
      return;
    }

    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;

      const userDoc = await getDoc(doc(db, "users", userId));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userType = userData.userType;

        if (userType === "farmer") {
          router.push("/(farmer-tabs)/Home");
        } else if (userType === "investor") {
          router.push("/(tabs)/Home");
        } else {
          Alert.alert("Error", "User type is not recognized.");
        }
      } else {
        Alert.alert("Error", "User data not found in Firestore.");
      }
    } catch (error: any) {
      console.error("Login Error:", error.message);
      Alert.alert("Login Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar style="light" />

      <View style={styles.backgroundImageContainer} pointerEvents="none">
        <Image
          source={{
            uri: "https://cdn.builder.io/api/v1/image/assets/TEMP/6d4fed6e0dc29cfb836bf1177883193d2030eec4",
          }}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
        >
          {/* Logo (Retained) */}
          <View style={styles.logoContainer}>
            <Image
              source={{
                uri: "https://cdn.builder.io/api/v1/image/assets/TEMP/3d09c40daec5a0516d170e4e6e1bc35b02c53b7d",
              }}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.brandingText}>Fami</Text>
          </View>

          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeTitle}>Welcome Back</Text>
            <Text style={styles.welcomeSubtitle}>Sign in to continue your harvest</Text>
          </View>

          <LoginForm
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            loading={loading}
            handleLogin={handleLogin}
            onSignUp={() => router.push("/SignUpScreen")}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/SignUpScreen")}>
              <Text style={styles.signUpLink}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};


const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#79BF4E",
  },
  backgroundImageContainer: {
    position: "absolute",
    width: "100%",
    height: "100%",
    zIndex: 0,
  },
  backgroundImage: {
    width: "100%",
    height: "100%",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  logoContainer: {
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  logo: {
    width: 150,
    height: 150,
  },
  brandingText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: -10,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  welcomeTextContainer: {
    alignItems: 'center',
    marginBottom: 30,
    zIndex: 1,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 5,
    textAlign: 'center',
  },
  glassCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 30,
    overflow: 'hidden',
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    zIndex: 1,
  },
  formContent: {
    width: '100%',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0B3D2E',
    marginBottom: 24,
  },
  inputOuterContainer: {
    marginBottom: 16,
    width: '100%',
  },
  inputLabelField: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0B3D2E',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 56,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  inputWrapperFocused: {
    borderColor: '#79BF4E',
    backgroundColor: '#FFF',
    // Removed elevation and shadows from focus state as they can cause focus loss on some platforms
  },
  inputIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
    tintColor: '#79BF4E',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#0B3D2E",
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    alignItems: 'flex-end',
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#79BF4E',
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#0B3D2E',
    height: 56,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  loginButtonDisabled: {
    opacity: 0.8,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 1,
  },
  footer: {
    flexDirection: 'row',
    marginTop: 30,
    zIndex: 1,
  },
  footerText: {
    fontSize: 15,
    color: '#FFF',
  },
  signUpLink: {
    fontSize: 15,
    fontWeight: '700',
    color: '#48EF32',
  },
});

export default LoginScreen;

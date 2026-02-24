import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  ImageBackground,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { StatusBar } from "expo-status-bar";
import { Picker } from "@react-native-picker/picker";
import { auth, db } from "./firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

const { width } = Dimensions.get("window");

// CustomInput Component for consistency with Login
interface CustomInputProps {
  label: string;
  placeholder: string;
  secureTextEntry?: boolean;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
}

// CustomInput Component - Memoized for stability
const CustomInput: React.FC<CustomInputProps> = React.memo(({
  label,
  placeholder,
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
        <TextInput
          style={styles.input}
          secureTextEntry={secureTextEntry}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          keyboardType={keyboardType}
          underlineColorAndroid="transparent"
        />
      </View>
    </View>
  );
});

const SignUpForm: React.FC<{
  username: string;
  setUserName: (t: string) => void;
  email: string;
  setEmail: (t: string) => void;
  password: string;
  setPassword: (t: string) => void;
  userType: string;
  setUserType: (t: string) => void;
  loading: boolean;
  handleSignup: () => void;
}> = React.memo(({
  username,
  setUserName,
  email,
  setEmail,
  password,
  setPassword,
  userType,
  setUserType,
  loading,
  handleSignup
}) => {
  return (
    <BlurView intensity={80} tint="light" style={styles.glassCard}>
      <View style={styles.formContent}>
        <CustomInput
          label="Username"
          placeholder="Enter your name"
          value={username}
          onChangeText={setUserName}
        />

        <CustomInput
          label="Email"
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />

        <CustomInput
          label="Password"
          placeholder="Create a password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <View style={styles.inputOuterContainer}>
          <Text style={styles.inputLabelField}>Role</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={userType}
              onValueChange={(itemValue) => setUserType(itemValue)}
              style={styles.picker}
              dropdownIconColor="#79BF4E"
            >
              <Picker.Item label="Select your role..." value="Select..." color="#999" />
              <Picker.Item label="Farmer" value="farmer" color="#0B3D2E" />
              <Picker.Item label="Investor" value="investor" color="#0B3D2E" />
            </Picker>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSignup}
          style={[styles.signupButton, loading && styles.buttonDisabled]}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.signupButtonText}>GET STARTED</Text>
          )}
        </TouchableOpacity>
      </View>
    </BlurView>
  );
});

export default function SignUpScreen() {
  const [username, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState("Select...");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async () => {
    if (!username || !email || !password || userType === "Select...") {
      Alert.alert("Missing fields", "Please fill all the fields.");
      return;
    }

    try {
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;

      await setDoc(doc(db, "users", userId), {
        username,
        email,
        userType: userType,
      });

      Alert.alert("Success", "Account created successfully! Please log in.");
      router.push("/");

    } catch (error: any) {
      console.error("Signup Error:", error.message);
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar style="light" />

      {/* Background Image Container */}
      <View style={styles.backgroundImageContainer} pointerEvents="none">
        <Image
          source={require("../assets/images/background.png")}
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
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.welcomeTitle}>Create Account</Text>
            <Text style={styles.welcomeSubtitle}>Join the Fami agricultural community</Text>
          </View>

          <SignUpForm
            username={username}
            setUserName={setUserName}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            userType={userType}
            setUserType={setUserType}
            loading={loading}
            handleSignup={handleSignup}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/")}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}


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
    paddingHorizontal: 24,
  },
  header: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
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
    maxWidth: 420,
    borderRadius: 30,
    overflow: 'hidden',
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  formContent: {
    width: '100%',
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
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#0B3D2E",
  },
  pickerWrapper: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 15,
    height: 56,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  picker: {
    width: '100%',
    color: "#0B3D2E",
  },
  signupButton: {
    backgroundColor: '#0B3D2E',
    height: 56,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.8,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 1,
  },
  footer: {
    flexDirection: 'row',
    marginTop: 30,
  },
  footerText: {
    fontSize: 15,
    color: '#FFF',
  },
  loginLink: {
    fontSize: 15,
    fontWeight: '700',
    color: '#48EF32',
  },
});

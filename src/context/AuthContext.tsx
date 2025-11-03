import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import {
  requestNotificationPermission,
  saveFCMToken,
} from "../services/notificationService";

interface AuthContextType {
  user: FirebaseAuthTypes.User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  prompt: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState<string>("");

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) {
      // Fetch user-specific prompt from Firestore
      const fetchPrompt = async () => {
        try {
          const snap = await firestore().collection("prompt").limit(1).get();
          if (!snap.empty) {
            const doc = snap.docs[0];
            const data = doc.data() || {};
            setPrompt(data?.prompt || "");
          } else {
            console.log(
              "No documents found in prompt collection; using default template."
            );
          }
        } catch (err) {
          console.error("Error fetching prompt collection:", err);
        }
      };
      fetchPrompt();
    } else {
      setPrompt("");
    }
  }, [user]);

  const signIn = async (email: string, password: string) => {
    try {
      const userCredential = await auth().signInWithEmailAndPassword(
        email,
        password
      );

      // Request notification permission and save FCM token
      const permissionGranted = await requestNotificationPermission();
      if (permissionGranted && userCredential.user) {
        await saveFCMToken(userCredential.user.uid);
      }
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(
        email,
        password
      );
      const user = userCredential.user;

      // Update user profile with name
      await user.updateProfile({
        displayName: name,
      });

      // Create user record in Firestore
      await firestore().collection("users").doc(user.uid).set({
        uid: user.uid,
        email: email,
        name: name,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      // Request notification permission and save FCM token
      const permissionGranted = await requestNotificationPermission();
      if (permissionGranted) {
        await saveFCMToken(user.uid);
      }
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const signOut = async () => {
    try {
      // Clear FCM token from user record before signing out
      if (user) {
        await firestore().collection("users").doc(user.uid).update({
          fcmToken: firestore.FieldValue.delete(),
          fcmTokenUpdatedAt: firestore.FieldValue.serverTimestamp(),
        });
      }
      await auth().signOut();
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await auth().sendPasswordResetEmail(email);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signUp, signOut, resetPassword, prompt }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

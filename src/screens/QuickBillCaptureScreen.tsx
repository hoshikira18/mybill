import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import firestore from "@react-native-firebase/firestore";
import storage from "@react-native-firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import CameraIcon from "../components/icons/CameraIcon";
import {
  ImageIcon,
  MessengeIcon,
  MicIcon,
  PenIcon,
  UserIcon,
} from "../components/icons";

const { width } = Dimensions.get("window");

type CaptureMode = "camera" | "audio" | "text";

export default function QuickBillCaptureScreen({ navigation }: any) {
  const { user } = useAuth();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<CaptureMode>("camera");
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const uploadImageToStorage = async (uri: string): Promise<string> => {
    const filename = `bills/${user?.uid}/${Date.now()}.jpg`;
    const reference = storage().ref(filename);
    await reference.putFile(uri);
    return await reference.getDownloadURL();
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });
        if (photo) {
          setSelectedImage(photo.uri);
        }
      } catch (error) {
        Alert.alert("Lỗi", "Không thể chụp ảnh");
        console.error("Take picture error:", error);
      }
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể mở thư viện ảnh");
      console.error("Pick image error:", error);
    }
  };

  const handleStartRecording = () => {
    Alert.alert("Thông báo", "Chức năng ghi âm đang được phát triển");
  };

  const handleAIChat = () => {
    Alert.alert("AI Chat", "Chức năng AI chat đang được phát triển");
  };

  const handleUserButtonPress = () => {
    navigation.navigate("Home");
  };

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Lỗi", "Vui lòng nhập số tiền hợp lệ");
      return;
    }

    if (!description.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập mô tả");
      return;
    }

    setLoading(true);
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      let imageUrl = null;

      if (selectedImage && mode === "camera") {
        imageUrl = await uploadImageToStorage(selectedImage);
      }

      const expenseData = {
        userId: user?.uid,
        amount: parseFloat(amount),
        description: description.trim(),
        type: mode,
        imageUrl: imageUrl,
        month: currentMonth,
        createdAt: firestore.FieldValue.serverTimestamp(),
      };

      await firestore().collection("expenses").add(expenseData);

      Alert.alert("Thành công", "Chi tiêu đã được lưu!", [
        {
          text: "OK",
          onPress: () => {
            setSelectedImage(null);
            setAmount("");
            setDescription("");
            navigation.navigate("Home");
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert("Lỗi", error.message || "Lưu chi tiêu thất bại");
    } finally {
      setLoading(false);
    }
  };

  if (mode === "camera" && !permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (mode === "camera" && !permission?.granted) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Cần quyền truy cập camera</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={requestPermission}
          >
            <Text style={styles.primaryButtonText}>Cấp quyền</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: "#333333", marginTop: 12 },
            ]}
            onPress={() => setMode("text")}
          >
            <Text style={styles.primaryButtonText}>Dùng chế độ văn bản</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.aiChatButton}
            onPress={handleUserButtonPress}
          >
            <UserIcon color="white" size={32} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trang chủ</Text>
          <TouchableOpacity style={styles.aiChatButton} onPress={handleAIChat}>
            <MessengeIcon color="white" size={32} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Camera/Content Area */}
          <View style={styles.captureArea}>
            {mode === "camera" && (
              <CameraView ref={cameraRef} style={styles.camera} facing="back" />
            )}
            {mode === "audio" && (
              <View style={styles.audioContainer}>
                <Text style={styles.audioIcon}></Text>
                <Text style={styles.audioText}>Coming Soon</Text>
              </View>
            )}
            {mode === "text" && (
              <View style={styles.textContainer}>
                <Text style={styles.textIcon}></Text>
                <Text style={styles.textHelp}>Coming Soon</Text>
              </View>
            )}
          </View>

          {/* Mode Switcher */}
          <View style={styles.modeSwitcher}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                mode === "camera" && styles.modeButtonActive,
              ]}
              onPress={() => setMode("camera")}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  mode === "camera" && styles.modeButtonTextActive,
                ]}
              >
                <CameraIcon color="white" />
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeButton,
                mode === "audio" && styles.modeButtonActive,
              ]}
              onPress={() => setMode("audio")}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  mode === "audio" && styles.modeButtonTextActive,
                ]}
              >
                <MicIcon color="white" />
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeButton,
                mode === "text" && styles.modeButtonActive,
              ]}
              onPress={() => setMode("text")}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  mode === "text" && styles.modeButtonTextActive,
                ]}
              >
                <PenIcon color="white" />
              </Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
              <ImageIcon color="white" size={40} />
            </TouchableOpacity>

            {mode === "camera" && (
              <TouchableOpacity
                style={styles.captureButton}
                onPress={takePicture}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            )}
            {mode === "audio" && (
              <TouchableOpacity
                style={styles.recordButton}
                onPress={handleStartRecording}
              >
                <Text style={styles.recordButtonText}>⏺</Text>
              </TouchableOpacity>
            )}
            {mode === "text" && (
              <View style={styles.captureButtonPlaceholder} />
            )}

            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
              <ImageIcon color="white" size={40} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  permissionText: {
    fontSize: 18,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "700",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 24,
    color: "#FFFFFF",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  aiChatButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    gap: 20,
  },
  captureArea: {
    width: "100%",
    height: width,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#333333",
    backgroundColor: "#1A1A1A",
    overflow: "hidden",
  },
  camera: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  audioContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  audioIcon: {
    fontSize: 64,
  },
  audioText: {
    fontSize: 18,
    color: "#B0B0B0",
    fontWeight: "600",
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  textIcon: {
    fontSize: 64,
  },
  textHelp: {
    fontSize: 18,
    color: "#B0B0B0",
    fontWeight: "600",
  },
  modeSwitcher: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 8,
  },
  modeButton: {
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#1A1A1A",
    minWidth: 60,
    alignItems: "center",
  },
  modeButtonActive: {
    backgroundColor: "#FF6B3580",
    borderColor: "#FF6B35",
  },
  modeButtonText: {
    fontSize: 16,
  },
  modeButtonTextActive: {
    transform: [{ scale: 1.1 }],
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  uploadButton: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadIcon: {
    fontSize: 60,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#FF6B35",
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FF6B35",
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FF6B35",
    justifyContent: "center",
    alignItems: "center",
  },
  recordButtonText: {
    fontSize: 40,
    color: "#000000",
  },
  captureButtonPlaceholder: {
    width: 80,
    height: 80,
  },
  form: {
    gap: 20,
    paddingBottom: 40,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  amountInput: {
    backgroundColor: "#1A1A1A",
    borderWidth: 2,
    borderColor: "#FF6B35",
    borderRadius: 12,
    padding: 16,
    fontSize: 28,
    fontWeight: "700",
    color: "#FF6B35",
  },
  descriptionInput: {
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#FFFFFF",
    minHeight: 100,
    textAlignVertical: "top",
  },
  saveButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#000000",
    fontSize: 18,
    fontWeight: "700",
  },
});

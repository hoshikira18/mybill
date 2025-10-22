import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import firestore from "@react-native-firebase/firestore";
import storage from "@react-native-firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";

export default function QuickBillCaptureScreen({ navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [billText, setBillText] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const handleSkip = () => {
    navigation.replace("Home");
  };

  const uploadImageToStorage = async (uri: string): Promise<string> => {
    const filename = `bills/${user?.uid}/${Date.now()}.jpg`;
    const reference = storage().ref(filename);
    await reference.putFile(uri);
    return await reference.getDownloadURL();
  };

  const uploadAudioToStorage = async (uri: string): Promise<string> => {
    const filename = `audio/${user?.uid}/${Date.now()}.m4a`;
    const reference = storage().ref(filename);
    await reference.putFile(uri);
    return await reference.getDownloadURL();
  };

  const handleCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== "granted") {
        Alert.alert(
          "Yêu cầu quyền",
          "Ứng dụng cần quyền truy cập camera để chụp ảnh hóa đơn."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images",
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setShowImageModal(true);
      }
    } catch (error: any) {
      Alert.alert("Lỗi", "Không thể mở camera");
      console.error("Camera error:", error);
    }
  };

  const handleSaveImageBill = async () => {
    if (!selectedImage) return;

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
      
      // Upload image to Firebase Storage
      const imageUrl = await uploadImageToStorage(selectedImage);

      const expenseData = {
        userId: user?.uid,
        amount: parseFloat(amount),
        description: description.trim(),
        type: "camera",
        imageUrl: imageUrl,
        month: currentMonth,
        createdAt: firestore.FieldValue.serverTimestamp(),
      };

      await firestore().collection("expenses").add(expenseData);

      Alert.alert("Thành công", "Hóa đơn đã được lưu!", [
        {
          text: "OK",
          onPress: () => {
            setShowImageModal(false);
            setSelectedImage(null);
            setAmount("");
            setDescription("");
            navigation.replace("Home");
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert("Lỗi", error.message || "Lưu hóa đơn thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleAudio = async () => {
    if (isRecording) {
      // Stop recording
      try {
        if (recording) {
          await recording.stopAndUnloadAsync();
          const uri = recording.getURI();
          setIsRecording(false);
          setRecording(null);

          if (uri) {
            // Show input dialog for amount and description
            Alert.prompt(
              "Nhập số tiền",
              "Nhập số tiền cho hóa đơn này:",
              [
                {
                  text: "Hủy",
                  style: "cancel",
                  onPress: () => {
                    // Delete the recording
                  },
                },
                {
                  text: "Tiếp tục",
                  onPress: async (amountText?: string) => {
                    if (!amountText || parseFloat(amountText) <= 0) {
                      Alert.alert("Lỗi", "Số tiền không hợp lệ");
                      return;
                    }

                    Alert.prompt(
                      "Nhập mô tả",
                      "Nhập mô tả cho hóa đơn:",
                      [
                        {
                          text: "Hủy",
                          style: "cancel",
                        },
                        {
                          text: "Lưu",
                          onPress: async (desc?: string) => {
                            if (!desc || !desc.trim()) {
                              Alert.alert("Lỗi", "Vui lòng nhập mô tả");
                              return;
                            }

                            setLoading(true);
                            try {
                              const currentMonth = new Date()
                                .toISOString()
                                .slice(0, 7);

                              // Upload audio to Firebase Storage
                              const audioUrl = await uploadAudioToStorage(uri);

                              const expenseData = {
                                userId: user?.uid,
                                amount: parseFloat(amountText),
                                description: desc.trim(),
                                type: "audio",
                                audioUrl: audioUrl,
                                month: currentMonth,
                                createdAt:
                                  firestore.FieldValue.serverTimestamp(),
                              };

                              await firestore()
                                .collection("expenses")
                                .add(expenseData);

                              Alert.alert(
                                "Thành công",
                                "Hóa đơn đã được lưu!",
                                [
                                  {
                                    text: "OK",
                                    onPress: () => {
                                      navigation.replace("Home");
                                    },
                                  },
                                ]
                              );
                            } catch (error: any) {
                              Alert.alert(
                                "Lỗi",
                                error.message || "Lưu hóa đơn thất bại"
                              );
                            } finally {
                              setLoading(false);
                            }
                          },
                        },
                      ],
                      "plain-text"
                    );
                  },
                },
              ],
              "plain-text"
            );
          }
        }
      } catch (error: any) {
        Alert.alert("Lỗi", "Không thể dừng ghi âm");
        console.error("Stop recording error:", error);
      }
    } else {
      // Start recording
      try {
        const { status } = await Audio.requestPermissionsAsync();
        
        if (status !== "granted") {
          Alert.alert(
            "Yêu cầu quyền",
            "Ứng dụng cần quyền truy cập microphone để ghi âm."
          );
          return;
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );

        setRecording(newRecording);
        setIsRecording(true);
        Alert.alert("Đang ghi âm", "Nhấn lại nút micro để dừng ghi âm");
      } catch (error: any) {
        Alert.alert("Lỗi", "Không thể bắt đầu ghi âm");
        console.error("Start recording error:", error);
      }
    }
  };

  const handleTextInput = () => {
    setShowTextInput(true);
  };

  const handleSaveTextBill = async () => {
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
      
      const expenseData = {
        userId: user?.uid,
        amount: parseFloat(amount),
        description: description.trim(),
        type: "text",
        month: currentMonth,
        createdAt: firestore.FieldValue.serverTimestamp(),
      };

      await firestore().collection("expenses").add(expenseData);

      Alert.alert("Thành công", "Hóa đơn đã được lưu!", [
        {
          text: "OK",
          onPress: () => {
            setShowTextInput(false);
            setBillText("");
            setAmount("");
            setDescription("");
            navigation.replace("Home");
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert("Lỗi", error.message || "Lưu hóa đơn thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Ghi nhận chi tiêu</Text>
          <Text style={styles.subtitle}>Chọn cách thức ghi nhận</Text>
        </View>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={handleCamera}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>📷</Text>
            </View>
            <Text style={styles.optionTitle}>Chụp ảnh</Text>
            <Text style={styles.optionDescription}>
              Chụp ảnh hóa đơn của bạn
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionCard,
              isRecording && styles.optionCardRecording,
            ]}
            onPress={handleAudio}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{isRecording ? "⏹️" : "🎤"}</Text>
            </View>
            <Text style={styles.optionTitle}>
              {isRecording ? "Dừng ghi âm" : "Ghi âm"}
            </Text>
            <Text style={styles.optionDescription}>
              {isRecording
                ? "Nhấn để dừng và lưu"
                : "Ghi lại thông tin hóa đơn"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={handleTextInput}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>✍️</Text>
            </View>
            <Text style={styles.optionTitle}>Nhập văn bản</Text>
            <Text style={styles.optionDescription}>
              Gõ thông tin chi tiêu
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.8}
        >
          <Text style={styles.skipButtonText}>Bỏ qua</Text>
        </TouchableOpacity>
      </View>

      {/* Text Input Modal */}
      <Modal
        visible={showTextInput}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowTextInput(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={["top", "bottom"]}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nhập thông tin chi tiêu</Text>
              <TouchableOpacity
                onPress={() => setShowTextInput(false)}
                disabled={loading}
              >
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Số tiền</Text>
              <View style={styles.amountInputContainer}>
                <TextInput
                  value={amount}
                  onChangeText={(text) =>
                    setAmount(text.replace(/[^0-9.]/g, ""))
                  }
                  style={styles.amountInput}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#666666"
                  editable={!loading}
                />
                <Text style={styles.currencySymbol}>₫</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mô tả</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                style={styles.descriptionInput}
                placeholder="Ví dụ: Ăn trưa, Cafe, Di chuyển..."
                placeholderTextColor="#666666"
                multiline
                numberOfLines={3}
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, loading && styles.buttonDisabled]}
              onPress={handleSaveTextBill}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.saveButtonText}>Lưu hóa đơn</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Image Input Modal */}
      <Modal
        visible={showImageModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowImageModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={["top", "bottom"]}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết hóa đơn</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowImageModal(false);
                  setSelectedImage(null);
                  setAmount("");
                  setDescription("");
                }}
                disabled={loading}
              >
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Số tiền</Text>
              <View style={styles.amountInputContainer}>
                <TextInput
                  value={amount}
                  onChangeText={(text) =>
                    setAmount(text.replace(/[^0-9.]/g, ""))
                  }
                  style={styles.amountInput}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#666666"
                  editable={!loading}
                />
                <Text style={styles.currencySymbol}>₫</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mô tả</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                style={styles.descriptionInput}
                placeholder="Ví dụ: Ăn trưa, Cafe, Di chuyển..."
                placeholderTextColor="#666666"
                multiline
                numberOfLines={3}
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, loading && styles.buttonDisabled]}
              onPress={handleSaveImageBill}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.saveButtonText}>Lưu hóa đơn</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "space-between",
  },
  header: {
    marginTop: 24,
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FF6B35",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#B0B0B0",
    letterSpacing: 0.2,
  },
  optionsContainer: {
    flex: 1,
    justifyContent: "center",
    gap: 16,
    paddingVertical: 32,
  },
  optionCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#333333",
    alignItems: "center",
    gap: 12,
  },
  optionCardRecording: {
    borderColor: "#FF6B35",
    borderWidth: 2,
    backgroundColor: "#2A1A0A",
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: "#0A0A0A",
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FF6B35",
  },
  icon: {
    fontSize: 40,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  optionDescription: {
    fontSize: 14,
    color: "#B0B0B0",
    textAlign: "center",
  },
  skipButton: {
    backgroundColor: "transparent",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333333",
    marginBottom: 24,
  },
  skipButtonText: {
    color: "#B0B0B0",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
    marginTop: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FF6B35",
    letterSpacing: -0.5,
  },
  closeButton: {
    fontSize: 32,
    color: "#B0B0B0",
    fontWeight: "300",
  },
  previewImage: {
    width: "100%",
    height: 250,
    borderRadius: 12,
    backgroundColor: "#1A1A1A",
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 24,
    gap: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderWidth: 2,
    borderColor: "#FF6B35",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: "700",
    padding: 16,
    color: "#FF6B35",
    letterSpacing: -1,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FF6B35",
    marginLeft: 8,
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
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});

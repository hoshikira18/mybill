import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
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
import {
  extractBillFromImage,
  ExtractedBillData,
} from "../services/geminiService";

const { width } = Dimensions.get("window");

type CaptureMode = "camera" | "audio" | "text";

export default function QuickBillCaptureScreen({ navigation }: any) {
  const { user } = useAuth();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<CaptureMode>("camera");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedBillData | null>(
    null
  );
  const [showExtractedData, setShowExtractedData] = useState(false);

  const uploadImageToStorage = async (uri: string): Promise<string> => {
    const filename = `bills/${user?.uid}/${Date.now()}.jpg`;
    const reference = storage().ref(filename);
    await reference.putFile(uri);
    return await reference.getDownloadURL();
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        // Fast capture with minimal processing
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.6,
          skipProcessing: true, // Skip additional processing for speed
        });
        if (photo) {
          await processImageWithLLM(photo.uri);
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
        quality: 0.5,
        // Compress image
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        await processImageWithLLM(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể mở thư viện ảnh");
      console.error("Pick image error:", error);
    }
  };

  const processImageWithLLM = async (imageUri: string) => {
    setLoading(true);
    setLoadingStep("Đang xử lý hình ảnh...");

    try {
      console.log("Processing bill image with Gemini AI:", imageUri);

      setLoadingStep("Đang phân tích với AI...");

      // Use Gemini service to extract bill data
      const data = await extractBillFromImage(imageUri);

      setLoadingStep("Hoàn tất!");

      setLoading(false);
      setLoadingStep("");

      // Set extracted data and populate form fields
      setExtractedData(data);
      setSelectedImage(imageUri);
      setAmount(data.amount?.toString() || "");
      setDescription(data.description || "");
      setMerchantName(data.merchantName || "");
      setShowExtractedData(true);
    } catch (error: any) {
      setLoading(false);
      setLoadingStep("");
      console.error("AI processing error:", error);
      Alert.alert(
        "Lỗi trích xuất",
        error.message ||
          "Không thể trích xuất thông tin. Vui lòng nhập thủ công.",
        [
          {
            text: "Nhập thủ công",
            onPress: () => {
              setSelectedImage(imageUri);
              setShowExtractedData(true);
              setExtractedData({
                amount: null,
                merchantName: "",
                description: "",
                date: null,
                items: null,
                confidence: "low" as const,
                rawText: "",
              });
            },
          },
          { text: "Hủy", style: "cancel" },
        ]
      );
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

      if (selectedImage) {
        // imageUrl = await uploadImageToStorage(selectedImage);
      }

      const expenseData = {
        userId: user?.uid,
        amount: parseFloat(amount),
        description: description.trim(),
        merchantName: merchantName.trim() || null,
        type: "camera",
        imageUrl: imageUrl,
        month: currentMonth,
        extractedDate: extractedData?.date || null,
        items: extractedData?.items || null,
        confidence: extractedData?.confidence || null,
        rawText: extractedData?.rawText || null,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      await firestore().collection("expenses").add(expenseData);

      setSelectedImage(null);
      setAmount("");
      setDescription("");
      setMerchantName("");
      setExtractedData(null);
      setShowExtractedData(false);
      navigation.navigate("Home");
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
          showsVerticalScrollIndicator={false}
        >
          {/* Camera/Content Area */}
          <View style={styles.captureArea}>
            {!selectedImage ? (
              <>
                {mode === "camera" && (
                  <CameraView
                    ref={cameraRef}
                    style={styles.camera}
                    facing="back"
                  />
                )}
                {mode === "audio" && (
                  <View style={styles.audioContainer}>
                    <Text style={styles.audioIcon}>🎤</Text>
                    <Text style={styles.audioText}>Coming Soon</Text>
                  </View>
                )}
                {mode === "text" && (
                  <View style={styles.textContainer}>
                    <Text style={styles.textIcon}>✍️</Text>
                    <Text style={styles.textHelp}>Coming Soon</Text>
                  </View>
                )}
              </>
            ) : (
              <>
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.capturedImage}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={() => {
                    setShowExtractedData(false);
                    setExtractedData(null);
                    setSelectedImage(null);
                    setAmount("");
                    setDescription("");
                    setMerchantName("");
                  }}
                >
                  <Text style={styles.retakeButtonText}>📷 Chụp lại</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Mode Switcher - Hidden when data is extracted */}
          {!showExtractedData && (
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
          )}

          {/* Action Buttons - Hidden when data is extracted */}
          {!showExtractedData && (
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
          )}

          {/* Extracted Bill Data Form */}
          {showExtractedData && (
            <View style={styles.extractedDataContainer}>
              {/* Header with confidence badge */}
              <View style={styles.extractedDataHeader}>
                <Text style={styles.extractedDataTitle}>Thông tin hóa đơn</Text>
                {extractedData && (
                  <View
                    style={[
                      styles.confidenceBadge,
                      {
                        backgroundColor:
                          extractedData.confidence === "high"
                            ? "#51CF6620"
                            : extractedData.confidence === "medium"
                            ? "#FFA47420"
                            : "#FF6B6B20",
                        borderColor:
                          extractedData.confidence === "high"
                            ? "#51CF66"
                            : extractedData.confidence === "medium"
                            ? "#FFA474"
                            : "#FF6B6B",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.confidenceText,
                        {
                          color:
                            extractedData.confidence === "high"
                              ? "#51CF66"
                              : extractedData.confidence === "medium"
                              ? "#FFA474"
                              : "#FF6B6B",
                        },
                      ]}
                    >
                      {extractedData.confidence === "high"
                        ? "✓ Cao"
                        : extractedData.confidence === "medium"
                        ? "~ TB"
                        : "! Thấp"}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.form}>
                {/* Date & Merchant in Row */}
                <View style={styles.rowContainer}>
                  {/* Date */}
                  {extractedData?.date && (
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>📅 Ngày</Text>
                      <View style={styles.dateBox}>
                        <Text style={styles.dateText}>
                          {extractedData.date}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Merchant Name */}
                  {merchantName ? (
                    <View
                      style={[
                        styles.inputGroup,
                        { flex: extractedData?.date ? 1.5 : 1 },
                      ]}
                    >
                      <Text style={styles.label}>🏪 Cửa hàng</Text>
                      <TextInput
                        style={styles.input}
                        value={merchantName}
                        onChangeText={setMerchantName}
                        placeholder="Tên cửa hàng"
                        placeholderTextColor="#fff"
                      />
                    </View>
                  ) : null}
                </View>

                {/* Amount - Prominent */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>💰 Tổng tiền *</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0"
                    placeholderTextColor="#FF6B3560"
                    keyboardType="decimal-pad"
                    editable={!loading}
                  />
                  <Text style={styles.amountHint}>VNĐ</Text>
                </View>

                {/* Items List - Enhanced */}
                {extractedData?.items && extractedData.items.length > 0 && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      🛒 Món hàng ({extractedData.items.length})
                    </Text>
                    <View style={styles.itemsContainer}>
                      {extractedData.items.map((item, index) => (
                        <View
                          key={index}
                          style={[
                            styles.itemRow,
                            index === extractedData.items!.length - 1 &&
                              styles.itemRowLast,
                          ]}
                        >
                          <View style={styles.itemInfo}>
                            <Text style={styles.itemQuantity}>
                              {item.quantity}x
                            </Text>
                            <Text style={styles.itemName}>{item.name}</Text>
                          </View>
                          <Text style={styles.itemPrice}>
                            {item.price.toLocaleString("vi-VN")}đ
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Description */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>📝 Mô tả *</Text>
                  <TextInput
                    style={styles.descriptionInput}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Mô tả chi tiêu của bạn..."
                    placeholderTextColor="#666666"
                    multiline
                    numberOfLines={3}
                    editable={!loading}
                  />
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={[styles.secondaryButton, { flex: 1 }]}
                    onPress={() => {
                      setShowExtractedData(false);
                      setExtractedData(null);
                      setSelectedImage(null);
                      setAmount("");
                      setDescription("");
                      setMerchantName("");
                    }}
                    disabled={loading}
                  >
                    <Text style={styles.secondaryButtonText}>✕ Hủy</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      { flex: 1.5 },
                      loading && styles.buttonDisabled,
                    ]}
                    onPress={handleSave}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#000000" />
                    ) : (
                      <Text style={styles.saveButtonText}>✓ Lưu chi tiêu</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {!showExtractedData && (
            <View style={styles.instructionContainer}>
              <CameraIcon />
              <Text style={styles.instructionText}>
                Chụp ảnh hóa đơn hoặc chọn từ thư viện
              </Text>
              <Text style={styles.instructionSubtext}>
                AI sẽ tự động trích xuất thông tin cho bạn
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={styles.loadingText}>{loadingStep}</Text>
            <Text style={styles.loadingSubtext}>
              {loadingStep.includes("Hoàn tất")
                ? "✓"
                : "Vui lòng đợi trong giây lát"}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
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
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  captureArea: {
    width: "100%",
    height: width * 0.9,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FF6B3540",
    backgroundColor: "#0D0D0D",
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
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#B0B0B0",
    marginBottom: 4,
  },
  amountInput: {
    backgroundColor: "#0D0D0D",
    borderWidth: 2,
    borderColor: "#FF6B35",
    borderRadius: 12,
    padding: 18,
    fontSize: 32,
    fontWeight: "700",
    color: "#FF6B35",
    textAlign: "left",
  },
  descriptionInput: {
    backgroundColor: "#0D0D0D",
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#FFFFFF",
    minHeight: 90,
    textAlignVertical: "top",
  },
  saveButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "700",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  loadingCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 16,
    minWidth: 280,
    borderWidth: 1,
    borderColor: "#333333",
  },
  loadingSubtext: {
    fontSize: 14,
    color: "#B0B0B0",
    textAlign: "center",
  },
  extractedDataContainer: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#FF6B3540",
  },
  extractedDataHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333333",
  },
  extractedDataTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: "700",
  },
  rowContainer: {
    flexDirection: "row",
    gap: 12,
  },
  dateBox: {
    backgroundColor: "#0D0D0D",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#333333",
  },
  dateText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  amountHint: {
    position: "absolute",
    right: 20,
    top: 48,
    fontSize: 18,
    color: "#FF6B35",
    fontWeight: "600",
  },
  itemsContainer: {
    backgroundColor: "#0D0D0D",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#333333",
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A2A",
  },
  itemRowLast: {
    borderBottomWidth: 0,
  },
  itemInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  itemQuantity: {
    fontSize: 14,
    color: "#FF6B35",
    fontWeight: "700",
    minWidth: 30,
  },
  itemName: {
    fontSize: 14,
    color: "#FFFFFF",
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    color: "#51CF66",
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#0D0D0D",
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#FFFFFF",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  secondaryButton: {
    backgroundColor: "#2A2A2A",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#3A3A3A",
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  capturedImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  retakeButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#FF6B35",
  },
  retakeButtonText: {
    color: "#FF6B35",
    fontSize: 13,
    fontWeight: "700",
  },
  instructionContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 12,
  },
  instructionIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  instructionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  instructionSubtext: {
    color: "#B0B0B0",
    fontSize: 13,
    textAlign: "center",
  },
});

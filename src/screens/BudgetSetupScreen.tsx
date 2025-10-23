import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import firestore from "@react-native-firebase/firestore";

export default function BudgetSetupScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const [totalBudget, setTotalBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const isFromSignup = route?.params?.fromSignup || false;

  const handleTotalBudgetChange = (value: string) => {
    const numericValue = value.replace(/[^0-9.]/g, "");
    setTotalBudget(numericValue);
  };

  const validateBudget = () => {
    if (!totalBudget || parseFloat(totalBudget) <= 0) {
      Alert.alert("Lỗi", "Vui lòng nhập số tiền hợp lệ");
      return false;
    }
    return true;
  };

  const handleSaveBudget = async () => {
    if (!validateBudget()) {
      return;
    }

    setLoading(true);
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const budget = parseFloat(totalBudget);

      const budgetData = {
        userId: user?.uid,
        month: currentMonth,
        totalBudget: budget,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      await firestore()
        .collection("budgets")
        .doc(`${user?.uid}_${currentMonth}`)
        .set(budgetData);

      Alert.alert("Thành công", "Ngân sách tháng của bạn đã được lưu!", [
        {
          text: "OK",
          onPress: () => {
            if (isFromSignup) {
              // After signup, go to QuickBillCapture screen
              navigation.reset({
                index: 0,
                routes: [{ name: "QuickBillCapture" }],
              });
            } else {
              navigation.goBack();
            }
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert("Lỗi", error.message || "Lưu ngân sách thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Đặt Ngân Sách</Text>
            <Text style={styles.subtitle}>
              {isFromSignup
                ? "Bước cuối cùng - Lập kế hoạch chi tiêu cho tháng này"
                : "Lập kế hoạch chi tiêu cho tháng này"}
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.sectionTitle}>Tổng ngân sách</Text>
              <Text style={styles.sectionSubtitle}>
                Nhập tổng ngân sách cho tháng này
              </Text>
            </View>

            <View style={styles.budgetInputContainer}>
              <TextInput
                value={totalBudget}
                onChangeText={handleTotalBudgetChange}
                style={styles.budgetInput}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#666666"
                editable={!loading}
              />
              <Text style={styles.currencySymbol}>₫</Text>
            </View>

            <View style={styles.hint}>
              <Text style={styles.hintText}>
                💡 Đặt ngân sách giúp bạn kiểm soát chi tiêu hiệu quả hơn
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.buttonDisabled]}
              onPress={handleSaveBudget}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.saveButtonText}>Lưu ngân sách</Text>
              )}
            </TouchableOpacity>

            {!isFromSignup && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => navigation.goBack()}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000000",
  },
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 48,
    marginTop: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: "700",
    color: "#FF6B35",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#B0B0B0",
    letterSpacing: 0.2,
  },
  card: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#333333",
    gap: 24,
    marginBottom: 32,
  },
  cardHeader: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#B0B0B0",
  },
  budgetInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000000",
    borderWidth: 2,
    borderColor: "#FF6B35",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  budgetInput: {
    flex: 1,
    fontSize: 48,
    fontWeight: "700",
    padding: 16,
    color: "#FF6B35",
    letterSpacing: -1,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FF6B35",
    marginLeft: 8,
  },
  hint: {
    backgroundColor: "#0A0A0A",
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#FF6B35",
  },
  hintText: {
    fontSize: 14,
    color: "#B0B0B0",
    lineHeight: 20,
  },
  actions: {
    gap: 12,
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
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333333",
  },
  cancelButtonText: {
    color: "#B0B0B0",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});

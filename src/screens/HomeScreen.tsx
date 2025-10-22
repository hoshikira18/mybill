import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import firestore from "@react-native-firebase/firestore";

interface BudgetData {
  userId: string;
  month: string;
  totalBudget: number;
  createdAt: any;
  updatedAt: any;
}

interface ExpenseData {
  userId: string;
  amount: number;
  description: string;
  type: string;
  month: string;
  createdAt: any;
}

export default function HomeScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
  const [budget, setBudget] = useState<BudgetData | null>(null);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBudgetAndExpenses();
  }, [user]);

  useEffect(() => {
    // Refresh when screen comes into focus
    const unsubscribe = navigation.addListener("focus", () => {
      fetchBudgetAndExpenses();
    });

    return unsubscribe;
  }, [navigation, user]);

  const fetchBudgetAndExpenses = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

      // Fetch budget
      const budgetDoc = await firestore()
        .collection("budgets")
        .doc(`${user.uid}_${currentMonth}`)
        .get();

      const budgetData = budgetDoc.data();
      if (budgetData) {
        setBudget(budgetData as BudgetData);
      } else {
        setBudget(null);
      }

      // Fetch expenses for current month
      const expensesSnapshot = await firestore()
        .collection("expenses")
        .where("userId", "==", user.uid)
        .where("month", "==", currentMonth)
        .get();

      let total = 0;
      expensesSnapshot.forEach((doc) => {
        const expense = doc.data() as ExpenseData;
        total += expense.amount;
      });

      setTotalExpenses(total);
    } catch (error: any) {
      console.error("Error fetching budget:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error: any) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Xin chào!</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>


        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B35" />
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Ngân sách tháng này</Text>
              <Text style={styles.cardAmount}>
                {budget ? formatCurrency(budget.totalBudget) : "0"} ₫
              </Text>
            </View>
            <View style={styles.cardStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Đã chi</Text>
                <Text style={styles.statValue}>
                  {formatCurrency(totalExpenses)} ₫
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Còn lại</Text>
                <Text style={styles.statValue}>
                  {budget
                    ? formatCurrency(budget.totalBudget - totalExpenses)
                    : "0"}{" "}
                  ₫
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate("QuickBillCapture")}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Thêm chi tiêu</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              navigation.navigate("BudgetSetup");
              // Refresh budget when returning from BudgetSetup
              const unsubscribe = navigation.addListener("focus", () => {
                fetchBudgetAndExpenses();
                unsubscribe();
              });
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>
              {budget ? "Cập nhật ngân sách" : "Đặt ngân sách"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSignOut}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  greeting: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  email: {
    fontSize: 16,
    color: "#FF6B35",
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#333333",
    gap: 24,
  },
  cardHeader: {
    gap: 12,
  },
  cardTitle: {
    fontSize: 14,
    color: "#B0B0B0",
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  cardAmount: {
    fontSize: 40,
    fontWeight: "700",
    color: "#FF6B35",
    letterSpacing: -1,
  },
  cardStats: {
    flexDirection: "row",
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#333333",
  },
  statItem: {
    flex: 1,
    gap: 8,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#333333",
    marginHorizontal: 16,
  },
  statLabel: {
    fontSize: 14,
    color: "#B0B0B0",
    fontWeight: "500",
  },
  statValue: {
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  actions: {
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333333",
  },
  secondaryButtonText: {
    color: "#B0B0B0",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});

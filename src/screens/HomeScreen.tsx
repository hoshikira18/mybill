import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import firestore from "@react-native-firebase/firestore";
import { CATEGORIES } from "../config/categories";
import Svg, { G, Path, Rect } from "react-native-svg";
import * as d3Shape from "d3-shape";

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
  category: string;
}

export default function HomeScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const [budget, setBudget] = useState<BudgetData | null>(null);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [categoryTotals, setCategoryTotals] = useState<Record<string, number>>(
    {}
  );
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
      const totalsByCategory: Record<string, number> = {};

      // initialize categories with 0
      CATEGORIES.forEach((c) => (totalsByCategory[c] = 0));

      expensesSnapshot.forEach((doc) => {
        const expense = doc.data() as ExpenseData;
        total += expense.amount;

        // Map using expense.type if it matches one of categories, otherwise 'Khác'
        const category = CATEGORIES.includes(expense.category)
          ? expense.category
          : "Khác";
        totalsByCategory[category] =
          (totalsByCategory[category] || 0) + expense.amount;
      });

      setTotalExpenses(total);
      setCategoryTotals(totalsByCategory);
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
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
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
              <Text style={styles.cardTitle}>Còn lại</Text>
              <Text style={styles.cardAmount}>
                {budget
                  ? formatCurrency(budget.totalBudget - totalExpenses)
                  : "0"}{" "}
                ₫
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
                <Text style={styles.statLabel}>Ngân sách tháng này</Text>
                <Text style={styles.statValue}>
                  {budget ? formatCurrency(budget.totalBudget) : "0"} ₫
                </Text>
              </View>
            </View>

            {/* Pie chart showing expenses by category */}
            <View style={styles.pieContainer}>
              <Svg
                width={screenWidth / 2.5}
                height={screenWidth / 2.5}
                viewBox="0 0 200 200"
              >
                <G x={100} y={100}>
                  {(() => {
                    const values = CATEGORIES.map(
                      (c) => categoryTotals[c] || 0
                    );
                    const totalForPie = values.reduce((s, v) => s + v, 0);
                    const pie = d3Shape.pie().value((d: any) => d)(
                      values as any
                    );
                    const arc = d3Shape.arc().outerRadius(90).innerRadius(40);

                    const COLORS = [
                      "#FF8C42",
                      "#008080",
                      "#003180ff",
                      "#FF4500",
                      "#FFDB58",
                      "#FFFDD0",
                      "#36454F",
                      "#6B8E23",
                      "#FF00FF",
                      "#ADD8E6",
                    ];

                    return pie.map((slice: any, i: any) => {
                      if (slice.endAngle - slice.startAngle === 0) return null;
                      const path = arc(slice) as string;
                      return (
                        <Path
                          key={`p-${i}`}
                          d={path}
                          fill={COLORS[i % COLORS.length]}
                        />
                      );
                    });
                  })()}
                </G>
              </Svg>

              <View style={styles.legend}>
                {CATEGORIES.map((cat, i) => {
                  const amount = categoryTotals[cat] || 0;
                  if (amount === 0) return null;
                  const COLORS = [
                    "#FF6B35",
                    "#FF8C42",
                    "#FFA474",
                    "#E55525",
                    "#FFB28A",
                    "#FF9A66",
                    "#FF7A2D",
                    "#D96A2A",
                    "#C85C20",
                    "#7A5A3C",
                  ];
                  return (
                    <View style={styles.legendItem} key={`l-${i}`}>
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <View
                          style={[
                            styles.legendColor,
                            { backgroundColor: COLORS[i % COLORS.length] },
                          ]}
                        />
                        <Text style={styles.legendLabel}>{cat}</Text>
                        {/* <Text style={styles.legendValue}>
                          {formatCurrency(amount)} ₫
                        </Text> */}
                      </View>
                    </View>
                  );
                })}
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
      </ScrollView>
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
    padding: 12,
    // justifyContent: "space-between",
  },
  contentContainer: {
    flexGrow: 1,
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
    marginVertical: 12,
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
  pieContainer: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 12,
  },
  legend: {
    marginLeft: 12,
    flexDirection: "column",
    gap: 8,
  },
  legendItem: {
    flexDirection: "column",
    width: "50%",
    marginBottom: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 3,
    marginRight: 8,
  },
  legendLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    width: "100%",
    // flex: 1,
  },
  legendValue: {
    color: "#B0B0B0",
    fontSize: 12,
    marginLeft: 8,
  },
});

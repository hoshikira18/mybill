import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { chatAboutExpenses } from "../services/geminiService";
import { saveChatMessage } from "../services/chatService";
import firestore from "@react-native-firebase/firestore";

type Message = {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
  expenseContext?: {
    amount?: number;
    description?: string;
    category?: string;
  };
};

export default function ChatWithAIScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const [userContext, setUserContext] = useState<{
    monthlyBudget?: number;
    currentSpending?: number;
    recentExpenses?: Array<{
      amount: number;
      description: string;
      category: string;
    }>;
  }>({});

  // Load user context (budget, spending) and chat history
  useEffect(() => {
    const loadUserData = async () => {
      if (!user?.uid) return;

      try {
        // Load budget and spending
        const currentMonth = new Date().toISOString().slice(0, 7);
        const budgetDoc = await firestore()
          .collection("budgets")
          .doc(`${user.uid}_${currentMonth}`)
          .get();

        const expensesSnapshot = await firestore()
          .collection("expenses")
          .where("userId", "==", user.uid)
          .where("month", "==", currentMonth)
          .get();

        const recentExpenses = expensesSnapshot.docs.slice(0, 5).map((doc) => ({
          amount: doc.data().amount,
          description: doc.data().description,
          category: doc.data().category,
        }));

        const totalSpending = expensesSnapshot.docs.reduce(
          (sum, doc) => sum + doc.data().amount,
          0
        );

        setUserContext({
          monthlyBudget: budgetDoc.data()?.totalBudget || undefined,
          currentSpending: totalSpending,
          recentExpenses,
        });

        // Load chat history - simple query without orderBy to avoid index requirement
        const chatSnapshot = await firestore()
          .collection("chatMessages")
          .where("userId", "==", user.uid)
          .limit(50)
          .get();

        if (!chatSnapshot.empty) {
          const chatHistory: Message[] = chatSnapshot.docs
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
              timestamp:
                doc.data().timestamp?.toDate() ||
                doc.data().createdAt?.toDate() ||
                new Date(),
            }))
            .sort(
              (a: any, b: any) => a.timestamp.getTime() - b.timestamp.getTime()
            ) as Message[];

          setMessages(chatHistory);
        } else {
          // Add welcome message if no history
          setMessages([
            {
              id: "welcome",
              text: "Xin chào! Tôi là trợ lý AI của bạn. Tôi có thể giúp bạn quản lý chi tiêu, phân tích thói quen tiêu dùng, hoặc trả lời các câu hỏi về tài chính. Bạn cần tôi giúp gì?",
              sender: "ai",
              timestamp: new Date(),
            },
          ]);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
        // Add welcome message on error
        setMessages([
          {
            id: "welcome",
            text: "Xin chào! Tôi là trợ lý AI của bạn. Tôi có thể giúp bạn quản lý chi tiêu, phân tích thói quen tiêu dùng, hoặc trả lời các câu hỏi về tài chính. Bạn cần tôi giúp gì?",
            sender: "ai",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setInitialLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  // Handle incoming expense from QuickBillCapture
  useEffect(() => {
    if (route.params?.expenseComment) {
      const { expenseComment, expenseData } = route.params;

      const aiMessage: Message = {
        id: Date.now().toString(),
        text: expenseComment,
        sender: "ai",
        timestamp: new Date(),
        expenseContext: expenseData,
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Save to Firestore
      if (user?.uid) {
        saveChatMessage(user.uid, {
          userId: user.uid,
          text: expenseComment,
          sender: "ai",
          timestamp: new Date(),
          expenseContext: expenseData,
        }).catch(console.error);
      }

      // Clear the params
      navigation.setParams({
        expenseComment: undefined,
        expenseData: undefined,
      });
    }
  }, [route.params, user, navigation]);

  useEffect(() => {
    // Auto scroll to bottom when new messages arrive
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Scroll to end when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (messages.length > 0 && !initialLoading) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 300);
      }
    }, [messages.length, initialLoading])
  );

  const handleSend = async () => {
    if (!inputText.trim() || loading || !user?.uid) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setLoading(true);

    // Save user message
    try {
      await saveChatMessage(user.uid, {
        userId: user.uid,
        text: userMessage.text,
        sender: "user",
        timestamp: userMessage.timestamp,
      });
    } catch (error) {
      console.error("Error saving user message:", error);
    }

    try {
      // Build conversation history for context
      const conversationHistory = messages.slice(-6).map((msg) => ({
        role: msg.sender === "user" ? ("user" as const) : ("model" as const),
        text: msg.text,
      }));

      let i = 0;
      if (conversationHistory.length > 0) {
        for (let j = 0; j < conversationHistory.length; j++) {
          if (conversationHistory[j].role === "model") {
            i++;
          } else {
            break;
          }
        }
      }

      let validHistory = conversationHistory;

      if (i > 0) {
        validHistory = conversationHistory.slice(i);
      }

      // Get AI response
      const aiResponse = await chatAboutExpenses(
        userMessage.text,
        validHistory,
        userContext
      );

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        sender: "ai",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Save AI message
      await saveChatMessage(user.uid, {
        userId: user.uid,
        text: aiMessage.text,
        sender: "ai",
        timestamp: aiMessage.timestamp,
      });
    } catch (error: any) {
      console.error("Error getting AI response:", error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi của bạn. Vui lòng thử lại sau.",
        sender: "ai",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === "user";

    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.aiMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.aiBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userMessageText : styles.aiMessageText,
            ]}
          >
            {item.text}
          </Text>
          <Text
            style={[
              styles.timestamp,
              isUser ? styles.userTimestamp : styles.aiTimestamp,
            ]}
          >
            {item.timestamp.toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>AI Wife</Text>
            {/* <Text style={styles.headerSubtitle}>Vợ của mọi nhà</Text> */}
          </View>
          <View style={styles.headerRight} />
        </View>

        {/* Initial Loading */}
        {initialLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={styles.loadingText}>Đang tải...</Text>
          </View>
        ) : (
          <>
            {/* Messages List */}
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }}
            />

            {/* Loading Indicator */}
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#FF6B35" />
                <Text style={styles.loadingText}>AI đang suy nghĩ...</Text>
              </View>
            )}

            {/* Input Area */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Nhập câu hỏi của bạn..."
                placeholderTextColor="#666666"
                multiline
                maxLength={500}
                editable={!loading}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!inputText.trim() || loading) && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={!inputText.trim() || loading}
              >
                <Text style={styles.sendButtonText}>➤</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 28,
    color: "#FFFFFF",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#FF6B35",
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: "80%",
  },
  userMessageContainer: {
    alignSelf: "flex-end",
  },
  aiMessageContainer: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    padding: 14,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: "#FF6B35",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: "#1A1A1A",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#333333",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  userMessageText: {
    color: "#000000",
  },
  aiMessageText: {
    color: "#FFFFFF",
  },
  timestamp: {
    fontSize: 11,
    marginTop: 6,
  },
  userTimestamp: {
    color: "#00000080",
    textAlign: "right",
  },
  aiTimestamp: {
    color: "#666666",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: "#B0B0B0",
    fontStyle: "italic",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 16,
    backgroundColor: "#0D0D0D",
    borderTopWidth: 1,
    borderTopColor: "#1A1A1A",
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#FFFFFF",
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "#333333",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FF6B35",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#333333",
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 20,
    color: "#000000",
    fontWeight: "700",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
});

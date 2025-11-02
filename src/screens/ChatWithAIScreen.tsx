import React, { useState, useRef, useEffect, useCallback } from "react";
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
} from "react-native";
import Markdown from "react-native-markdown-display";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { chatAboutExpenses } from "../services/geminiService";
import { saveChatMessage } from "../services/chatService";
import firestore from "@react-native-firebase/firestore";

// --- TYPE DEFINITIONS ---
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

// --- CHAT COMPONENT ---
export default function ChatWithAIScreen({ route, navigation }: any) {
  const { user, prompt: globalPrompt } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const flatListRef = useRef<FlatList<Message>>(null);
  const [userContext, setUserContext] = useState<{
    monthlyBudget?: number;
    currentSpending?: number;
    recentExpenses?: Array<{
      amount: number;
      description: string;
      category: string;
    }>;
  }>({});

  // --- DATA LOADING EFFECTS ---

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
          date: doc.data().extractedDate,
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

        // Load chat history
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
              text: "Xin chào! Tôi là **trợ lý AI tài chính** của bạn. Tôi có thể giúp bạn quản lý chi tiêu, phân tích thói quen tiêu dùng, hoặc trả lời các câu hỏi về tài chính. Bạn cần tôi giúp gì?",
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
            id: "welcome-error",
            text: "Xin chào! Tôi là **trợ lý AI tài chính** của bạn. Tôi có thể giúp bạn quản lý chi tiêu, phân tích thói quen tiêu dùng, hoặc trả lời các câu hỏi về tài chính. Bạn cần tôi giúp gì?",
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

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Scroll to end when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (messages.length > 0 && !initialLoading) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 300);
      }
    }, [messages.length, initialLoading])
  );

  // --- SEND MESSAGE HANDLER ---
  const handleSend = async () => {
    if (!inputText.trim() || loading || !user?.uid) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: "user",
      timestamp: new Date(),
    };

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setLoading(true);

    // Save user message (optimistic save)
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
      // Build conversation history for context (last 6 messages)
      const conversationHistory = [...messages, userMessage]
        .slice(-2)
        .map((msg) => ({
          role: msg.sender === "user" ? ("user" as const) : ("model" as const),
          text: msg.text,
        }));

      // Logic to ensure conversation starts with a user turn if possible
      let validHistory = conversationHistory;
      while (validHistory.length > 0 && validHistory[0].role === "model") {
        validHistory = validHistory.slice(1);
      }

      // Get AI response
      const aiResponse = await chatAboutExpenses(
        globalPrompt,
        userMessage.text,
        validHistory,
        userContext
      );

      console.log({ aiResponse });

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

  // --- RENDER MESSAGE FUNCTION (REDESIGNED) ---
  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isUser = item.sender === "user";
    const prevItem = messages[index - 1];
    const nextItem = messages[index + 1];

    // Logic to show avatar only on the first message of a sequence
    const isFirstInSequence = index === 0 || prevItem?.sender !== item.sender;
    const isLastInSequence =
      index === messages.length - 1 || nextItem?.sender !== item.sender;

    return (
      <View
        style={[
          styles.messageWrapper,
          isUser ? styles.messageWrapperUser : styles.messageWrapperAI,
          isLastInSequence
            ? styles.messageWrapperMargin
            : styles.messageWrapperNoMargin,
        ]}
      >
        {/* AI Avatar or User Spacer */}
        {!isUser && (
          <View style={styles.avatarContainer}>
            {isFirstInSequence && (
              <View style={styles.avatarAI}>
                <Text style={styles.avatarTextAI}>AI</Text>
              </View>
            )}
          </View>
        )}
        {/* Spacer for user messages to align with AI avatar spacing */}
        {isUser && <View style={styles.avatarContainerSpacer} />}

        {/* Message Bubble */}
        <View style={styles.bubbleContainer}>
          <View
            style={[
              styles.messageBubble,
              isUser ? styles.userBubble : styles.aiBubble,
              isLastInSequence &&
                (isUser ? styles.userBubbleTail : styles.aiBubbleTail),
            ]}
          >
            <View style={styles.messageContent}>
              {/* Markdown Content */}
              <Markdown
                style={{
                  // General Text
                  body: {
                    color: isUser ? "#000000" : "#E0E0E0",
                    fontSize: 15,
                    lineHeight: 22,
                  },
                  paragraph: {
                    color: isUser ? "#000000" : "#E0E0E0",
                    fontSize: 15,
                    lineHeight: 22,
                    marginVertical: 4,
                  },

                  // Headings (Use AI Accent color for contrast and hierarchy)
                  heading1: {
                    color: "#FF6B35",
                    fontSize: 24,
                    fontWeight: "700",
                    marginVertical: 8,
                  },
                  heading2: {
                    color: "#FFA474",
                    fontSize: 20,
                    fontWeight: "700",
                    marginVertical: 6,
                  },
                  heading3: {
                    color: isUser ? "#000000" : "#B0B0B0",
                    fontSize: 18,
                    fontWeight: "600",
                    marginVertical: 4,
                  },

                  // Emphasis
                  strong: {
                    color: isUser ? "#000000" : "#FFFFFF",
                    fontWeight: "800",
                  },
                  em: {
                    color: isUser ? "#000000" : "#E0E0E0",
                    fontStyle: "italic",
                  },
                  link: { color: "#FFC107", textDecorationLine: "underline" },

                  // Lists
                  bullet_list: { marginVertical: 8, paddingLeft: 10 },
                  ordered_list: { marginVertical: 8, paddingLeft: 10 },
                  list_item: {
                    color: isUser ? "#000000" : "#E0E0E0",
                    fontSize: 15,
                    lineHeight: 22,
                    marginVertical: 2,
                  },

                  // Code/Blocks
                  code_inline: {
                    backgroundColor: isUser ? "rgba(0,0,0,0.1)" : "#252525",
                    color: isUser ? "#C0392B" : "#FFC107",
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                    fontSize: 14,
                    fontFamily: Platform.select({
                      ios: "Menlo",
                      android: "monospace",
                    }),
                  },
                  code_block: {
                    backgroundColor: isUser ? "rgba(0,0,0,0.05)" : "#101010",
                    color: isUser ? "#000000" : "#B0B0B0",
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: isUser ? "rgba(0,0,0,0.1)" : "#2A2A2A",
                    fontSize: 13,
                    marginVertical: 8,
                  },
                  fence: {
                    backgroundColor: isUser ? "rgba(0,0,0,0.05)" : "#101010",
                    color: isUser ? "#000000" : "#B0B0B0",
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: isUser ? "rgba(0,0,0,0.1)" : "#2A2A2A",
                    fontSize: 13,
                    marginVertical: 8,
                  },

                  // Quote & Table
                  blockquote: {
                    backgroundColor: isUser ? "rgba(0,0,0,0.03)" : "#0D0D0D",
                    borderLeftWidth: 3,
                    borderLeftColor: "#FF6B35",
                    paddingLeft: 12,
                    paddingVertical: 8,
                    marginVertical: 8,
                  },
                  table: {
                    borderWidth: 1,
                    borderColor: isUser ? "rgba(0,0,0,0.1)" : "#333333",
                    borderRadius: 6,
                    marginVertical: 8,
                  },
                  tr: {
                    borderBottomWidth: 1,
                    borderColor: isUser ? "rgba(0,0,0,0.1)" : "#333333",
                  },
                  th: {
                    color: isUser ? "#000000" : "#FFFFFF",
                    fontWeight: "700",
                    padding: 8,
                  },
                  td: { color: isUser ? "#000000" : "#E0E0E0", padding: 8 },
                }}
              >
                {item.text.trim()}
              </Markdown>

              {/* Redesigned Expense Context Card */}
              {item.expenseContext && (
                <View style={styles.expenseContextCard}>
                  <View style={styles.expenseBadgeHeader}>
                    <Text style={styles.expenseBadgeIconText}>💰</Text>
                    <Text style={styles.expenseBadgeTitle}>
                      Chi tiêu được phân tích
                    </Text>
                  </View>
                  <View style={styles.expenseBadgeContent}>
                    {item.expenseContext.amount && (
                      <Text style={styles.expenseBadgeAmount}>
                        {new Intl.NumberFormat("vi-VN", {
                          style: "currency",
                          currency: "VND",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(item.expenseContext.amount)}
                      </Text>
                    )}
                    {item.expenseContext.description && (
                      <Text style={styles.expenseBadgeDesc}>
                        {item.expenseContext.description}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Timestamp */}
              <Text
                style={[
                  styles.timestamp,
                  isUser ? styles.timestampUser : styles.timestampAI,
                ]}
              >
                {item.timestamp.toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // --- MAIN RENDER ---
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
            <Text style={styles.headerTitle}>Trợ Lý AI</Text>
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
              renderItem={({ item, index }) => renderMessage({ item, index })} // Pass item and index
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
                <Text style={styles.loadingText}>AI đang trả lời...</Text>
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

// --- STYLESHEET (REDESIGNED) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#0A0A0A",
    borderBottomWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 3,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 22,
  },
  backButtonText: {
    fontSize: 28,
    color: "#FFFFFF",
    fontWeight: "300",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  headerRight: {
    width: 44,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
  },
  loadingText: {
    fontSize: 14,
    color: "#B0B0B0",
    marginTop: 12,
    fontStyle: "italic",
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 24,
  },
  // Message wrapper - for alignment and margins
  messageWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    maxWidth: "88%",
  },
  messageWrapperUser: {
    alignSelf: "flex-end",
    // flexDirection: "row-reverse",
  },
  messageWrapperAI: {
    alignSelf: "flex-start",
  },
  // Sequence Margins
  messageWrapperMargin: {
    marginBottom: 20,
  },
  messageWrapperNoMargin: {
    marginBottom: 4,
  },
  // Avatar styles
  avatarContainer: {
    width: 32,
    height: 32,
    marginHorizontal: 8,
    marginBottom: 0,
    alignSelf: "flex-start",
  },
  avatarContainerSpacer: {
    width: 32 + 8, // User side spacer (avatar width + margin)
  },
  avatarAI: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0D0D0D",
    borderWidth: 1.5,
    borderColor: "#FF6B35",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarTextAI: {
    color: "#FF6B35",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  // Message bubble
  bubbleContainer: {
    flexShrink: 1,
    minWidth: "auto",
  },
  messageBubble: {
    borderRadius: 18,
    overflow: "hidden",
    padding: 0,
    marginVertical: 1,
  },
  // User Bubble (Modern Orange)
  userBubble: {
    backgroundColor: "#FF8C00", // Brighter, more modern orange
    borderTopRightRadius: 18,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  userBubbleTail: {
    borderBottomRightRadius: 6, // Square the tail for the last bubble in the sequence
  },
  // AI Bubble (Dark/Contrast)
  aiBubble: {
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderTopRightRadius: 18,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  aiBubbleTail: {
    borderBottomLeftRadius: 6, // Square the tail for the last bubble in the sequence
  },

  messageContent: {
    padding: 14,
  },

  // Redesigned Expense Card
  expenseContextCard: {
    backgroundColor: "#0D0D0D",
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  expenseBadgeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A2A",
  },
  expenseBadgeIconText: {
    fontSize: 14,
    marginRight: 6,
  },
  expenseBadgeTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FF6B35",
    letterSpacing: 0.3,
  },
  expenseBadgeContent: {
    paddingTop: 4,
  },
  expenseBadgeAmount: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  expenseBadgeDesc: {
    fontSize: 13,
    color: "#B0B0B0",
    lineHeight: 18,
  },
  // Timestamp
  timestamp: {
    fontSize: 11,
    marginTop: 8,
  },
  timestampUser: {
    color: "rgba(0, 0, 0, 0.6)",
    textAlign: "right",
  },
  timestampAI: {
    color: "#666666",
    textAlign: "left",
  },
  // Loading indicator
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#0D0D0D",
  },
  // Input area
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: Platform.OS === "ios" ? 20 : 16,
    backgroundColor: "#0A0A0A",
    borderTopWidth: 1,
    borderTopColor: "#1A1A1A",
  },
  input: {
    flex: 1,
    backgroundColor: "#1A1A1A",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    color: "#FFFFFF",
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    lineHeight: 20,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FF6B35",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sendButtonDisabled: {
    backgroundColor: "#2A2A2A",
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonText: {
    fontSize: 20,
    color: "#000000",
    fontWeight: "700",
  },
});

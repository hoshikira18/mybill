import firestore from "@react-native-firebase/firestore";

export interface ChatMessage {
  id: string;
  userId: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
  expenseContext?: {
    amount?: number;
    description?: string;
    category?: string;
    merchantName?: string;
  };
}

export interface ExpenseAnalysis {
  comment: string;
  sentiment: "positive" | "neutral" | "warning" | "negative";
  suggestions?: string[];
  isOverBudget?: boolean;
}

/**
 * Save a chat message to Firestore
 */
export async function saveChatMessage(
  userId: string,
  message: Omit<ChatMessage, "id">
): Promise<string> {
  try {
    const docRef = await firestore()
      .collection("chatMessages")
      .add({
        ...message,
        userId,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

    return docRef.id;
  } catch (error) {
    console.error("Error saving chat message:", error);
    throw error;
  }
}

/**
 * Load chat messages for a user
 */
export async function loadChatMessages(
  userId: string,
  limit: number = 50
): Promise<ChatMessage[]> {
  try {
    const snapshot = await firestore()
      .collection("chatMessages")
      .where("userId", "==", userId)
      .orderBy("createdAt", "asc")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp:
        doc.data().timestamp?.toDate() ||
        doc.data().createdAt?.toDate() ||
        new Date(),
    })) as ChatMessage[];
  } catch (error) {
    console.error("Error loading chat messages:", error);
    return [];
  }
}

/**
 * Subscribe to real-time chat messages
 */
export function subscribeToChatMessages(
  userId: string,
  onMessage: (messages: ChatMessage[]) => void,
  limit: number = 50
) {
  return firestore()
    .collection("chatMessages")
    .where("userId", "==", userId)
    .orderBy("createdAt", "asc")
    .limit(limit)
    .onSnapshot(
      (snapshot) => {
        const messages = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp:
            doc.data().timestamp?.toDate() ||
            doc.data().createdAt?.toDate() ||
            new Date(),
        })) as ChatMessage[];
        onMessage(messages);
      },
      (error) => {
        console.error("Error subscribing to chat messages:", error);
      }
    );
}

/**
 * Delete chat history for a user
 */
export async function deleteChatHistory(userId: string): Promise<void> {
  try {
    const snapshot = await firestore()
      .collection("chatMessages")
      .where("userId", "==", userId)
      .get();

    const batch = firestore().batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log("Chat history deleted");
  } catch (error) {
    console.error("Error deleting chat history:", error);
    throw error;
  }
}

// The Cloud Functions for Firebase SDK to create Cloud Functions and triggers.
const { logger } = require("firebase-functions");
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// The Firebase Admin SDK to access Firestore.
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

const CHAT_PROMPT = (prompt, expense, tone) => `
${prompt}
${expense}
${tone}
`;

async function generateGeminiText(prompt) {
  const apiKey = "";
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const response = await model.generateContent({
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    });
    const text = response?.response.text();
    logger.log("Gemini response:", text);
    return text;
  } catch (error) {
    logger.error("Error calling Gemini API:", error);
    return null;
  }
}

exports.onNewMessageCreated = onDocumentCreated(
  "chatMessages/{messageId}",
  async (event) => {
    logger.log("New chat message created:", event.data.id);
    const messageData = event.data.data();
    const userId = messageData.userId;
    if (messageData.sender != "ai") return;

    const db = getFirestore();
    const user = db.collection("users").doc(userId);
    const userDoc = await user.get();
    if (!userDoc.exists) {
      logger.error("User not found for expense:", userId);
      return;
    }

    const userFCMToken = userDoc.data().fcmToken;
    if (userFCMToken) {
      const message = {
        notification: {
          title: "AI Wife",
          body: messageData.text,
        },
        token: userFCMToken,
        android: {
          priority: "high",
          notification: {
            channelId: "default",
          },
        },
        apns: {
          headers: {
            "apns-priority": "10",
          },
          payload: {
            aps: {
              "content-available": 1,
            },
          },
        },
      };

      const admin = require("firebase-admin");
      try {
        const response = await admin.messaging().send(message);
        logger.log("Successfully sent notification:", response);
      } catch (error) {
        logger.error("Error sending notification:", error);
      }
    } else {
      logger.log("No FCM token for user:", userId);
    }
  }
);

exports.onExpenseCreated = onDocumentCreated(
  "expenses/{expenseId}",
  async (event) => {
    logger.log("Expense created:", event.data.id);
    const expenseData = event.data.data();

    const db = getFirestore();

    try {
      const userId = expenseData.userId;
      if (!userId) {
        logger.error("No userId associated with expense:", event.data.id);
        return;
      }
      const userMessage = `
      Vợ iu ơi, anh vừa tiêu ít tiền nhớ!!!  
Bill này:

* **Số tiền:** ${expenseData.amount} VND  
* **Cửa hàng:** ${expenseData.merchantName || "-"}  
* **Mô tả:** ${expenseData.description || "-"}  
* **Ngày:** ${expenseData.createdAt || "-"}
      `;
      await db.collection("chatMessages").add({
        sender: "user",
        text: userMessage,
        timestamp: new Date(),
        userId,
      });
      logger.log("Added user message to chatMessages.");

      let promptTemplate = null;
      try {
        const snap = await db.collection("prompt").limit(1).get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          const data = doc.data() || {};
          promptTemplate = data?.prompt || null;
          logger.log("Loaded prompt template from prompt collection:", doc.id);
        } else {
          logger.log(
            "No documents found in prompt collection; using default template."
          );
        }
      } catch (err) {
        logger.error("Error fetching prompt collection:", err);
      }

      const defaultTemplate = `Bạn là 'Vợ' — một persona: ghê gớm nhưng rất tâm lý. Trả lời bằng tiếng Việt và đưa ra phản ứng ngắn (3-6 câu) gồm: 1) Câu phản ứng persona thể hiện mức ghê gớm, 2) Phân tích ngắn về ảnh hưởng ngân sách, 3) 1-2 hành động gợi ý cụ thể.`;
      const templateToUse = promptTemplate || defaultTemplate;

      const p = CHAT_PROMPT(
        templateToUse,
        JSON.stringify(expenseData, null, 2),
        "extreme"
      );

      let aiText = await generateGeminiText(p);
      logger.log("Generated AI text:", aiText);

      if (!aiText) {
        logger.log("No AI text generated, using fallback message.");
        aiText = "Tôi đã nhận được chi tiêu của bạn!";
      }

      await db.collection("chatMessages").add({
        sender: "ai",
        text: aiText,
        timestamp: new Date(),
        userId,
      });
    } catch (error) {
      logger.error("Error while handling expense-created trigger:", error);
    }
  }
);

//  // Build persona prompt for Gemini: vợ ghê gớm nhưng tâm lý
//   const prompt =
//     `Bạn là 'Vợ' — một persona: ghê gớm nhưng rất tâm lý. Trả lời bằng tiếng Việt. Bắt đầu bằng một câu mang tính cá nhân thể hiện mức 'độ ghê gớm' (mức ${fierceness}/5). Sau đó đưa ra 1-2 câu phân tích tác động tới ngân sách và 1-2 gợi ý hành động cụ thể. Tổng 3–6 câu. Không dùng lời lẽ xúc phạm cá nhân hoặc cổ vũ bạo lực, mà chỉ châm biếm cực mạnh.\n\n` +
//     `Dữ liệu chi tiêu:\n- Số tiền: ${amount} VND\n- Nhà bán / hạng mục: ${merchant}\n- Mô tả: ${
//       expenseData.description || "-"
//     }\n- Ngày: ${date || "-"}\n` +
//     (monthlyBudget ? `- Ngân sách tháng: ${monthlyBudget} VND\n` : "") +
//     `\nNgưỡng khẩn cấp: ${emergencyThreshold} VND. Nếu số tiền >= ngưỡng này, hãy nâng mức cảnh báo và đề xuất biện pháp khẩn cấp (ví dụ: chuyển tiền vào quỹ, tạm dừng mua sắm, hoàn trả).` +
//     (toneModifier ? `\nĐiều chỉnh giọng: ${toneModifier}.` : "") +
//     `\n\nYêu cầu: Trả về một đoạn tiếng Việt duy nhất (3–6 câu) gồm: 1) Câu phản ứng persona (thể hiện mức ghê gớm), 2) Phân tích ngắn về ảnh hưởng ngân sách, 3) 1-2 hành động gợi ý. Ngắn gọn, trực tiếp.`;

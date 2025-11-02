// The Cloud Functions for Firebase SDK to create Cloud Functions and triggers.
const { logger } = require("firebase-functions");
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");

// The Firebase Admin SDK to access Firestore.
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

exports.onExpenseCreated = onDocumentCreated(
  "expenses/{expenseId}",
  async (event) => {
    logger.log("Expense created:", event.data.id);
    const expenseData = event.data.data();
    const userId = expenseData.userId;

    // Example: Add a timestamp field to the newly created expense
    const db = getFirestore();
    const user = db.collection("users").doc(userId);
    const userDoc = await user.get();
    if (!userDoc.exists) {
      logger.error("User not found for expense:", userId);
      return;
    }

    await db.collection("chatMessages").add({
      sender: "ai",
      text: "Tôi đã nhận được chi tiêu của bạn!",
      timestamp: new Date(),
      userId: "6U225QlGn2Ykqjr0elCwTvVXKOy1",
    });

    const userFCMToken = userDoc.data().fcmToken;
    if (userFCMToken) {
      // Send notification via FCM (Firebase Cloud Messaging)
      const message = {
        notification: {
          title: "Chi tiêu mới được thêm",
          body: `Chi tiêu của bạn: ${expenseData.description} - ${expenseData.amount} VND`,
        },
        token: userFCMToken,
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

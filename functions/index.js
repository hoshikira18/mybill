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

    // Example: Add a timestamp field to the newly created expense
    const db = getFirestore();
    await db.collection("chatMessages").add({
      sender: "ai",
      text: "Tôi đã nhận được chi tiêu của bạn!",
      timestamp: new Date(),
      userId: "6U225QlGn2Ykqjr0elCwTvVXKOy1",
    });
  }
);

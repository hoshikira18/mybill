import { genAI, BILL_EXTRACTION_PROMPT } from "../config/gemini";

export interface ExtractedBillData {
  amount: number | null;
  description: string;
  merchantName?: string;
  date?: string | null;
  items?: Array<{ name: string; price: number; quantity: number }> | null;
  rawText: string;
  confidence: "high" | "medium" | "low";
  category: string | null;
}

export interface ExpenseAnalysis {
  comment: string;
  sentiment: "positive" | "neutral" | "warning" | "negative";
  suggestions?: string[];
  financialTip?: string;
}

/**
 * Convert image URI to base64 string
 */
async function imageUriToBase64(imageUri: string): Promise<string> {
  const response = await fetch(imageUri);
  const blob = await response.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      resolve(base64data.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Extract bill information from image using Gemini AI
 */
export async function extractBillFromImage(
  imageUri: string
): Promise<ExtractedBillData> {
  try {
    // Convert image to base64
    console.time("imageUriToBase64");
    const base64Image = await imageUriToBase64(imageUri);
    console.timeEnd("imageUriToBase64");

    // Use Gemini to analyze the image
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    console.time("geminiGenerateContent");

    const result = await model.generateContent([
      BILL_EXTRACTION_PROMPT,
      {
        inlineData: {
          data: base64Image,
          mimeType: "image/jpeg",
        },
      },
    ]);

    const responseText = result.response.text();

    // Parse JSON response - remove markdown code blocks if present
    const cleanedResponse = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Không tìm thấy dữ liệu JSON trong phản hồi");
    }

    const extractedData = JSON.parse(jsonMatch[0]);
    console.timeEnd("geminiGenerateContent");

    // Ensure the response has the correct structure
    return {
      amount: extractedData.amount || null,
      description: extractedData.description || "Chi tiêu",
      merchantName: extractedData.merchantName || undefined,
      date: extractedData.date || undefined,
      items: extractedData.items || null,
      rawText: responseText,
      confidence: extractedData.confidence || "low",
      category: extractedData.category || null,
    };
  } catch (error) {
    console.error("Error extracting bill data:", error);
    throw error;
  }
}

/**
 * Generate expense analysis and comment using Gemini AI
 */
export async function analyzeExpense(
  amount: number,
  description: string,
  category: string,
  merchantName?: string,
  monthlyBudget?: number,
  currentMonthSpending?: number
): Promise<ExpenseAnalysis> {
  try {
    const budgetContext = monthlyBudget
      ? `Ngân sách tháng này: ${monthlyBudget.toLocaleString(
          "vi-VN"
        )} VNĐ. Đã chi: ${(currentMonthSpending || 0).toLocaleString(
          "vi-VN"
        )} VNĐ.`
      : "";

    const prompt = `Bạn là trợ lý tài chính thông minh, hãy phân tích khoản chi tiêu sau và đưa ra nhận xét ngắn gọn bằng tiếng Việt:

Chi tiêu: ${amount.toLocaleString("vi-VN")} VNĐ
Mô tả: ${description}
Danh mục: ${category}
${merchantName ? `Nơi mua: ${merchantName}` : ""}
${budgetContext}

Trả về JSON với format:
{
  "comment": "Nhận xét ngắn gọn, thân thiện về khoản chi (1-2 câu)",
  "sentiment": "positive|neutral|warning|negative",
  "suggestions": ["Gợi ý 1", "Gợi ý 2"] hoặc [],
  "financialTip": "Lời khuyên tài chính ngắn gọn (tùy chọn)" hoặc null
}

Quy tắc:
- comment: Ngắn gọn, thân thiện, khuyến khích tiết kiệm một cách nhẹ nhàng (comment trả về không dùng markdown)
- sentiment: positive (chi tiêu hợp lý), neutral (bình thường), warning (hơi cao), negative (quá cao/vượt ngân sách)
- suggestions: Tối đa 2 gợi ý thực tế
- Không dùng markdown, chỉ JSON`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse JSON response
    const cleanedResponse = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Không tìm thấy dữ liệu JSON trong phản hồi");
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return {
      comment: analysis.comment || "Đã ghi nhận khoản chi tiêu của bạn.",
      sentiment: analysis.sentiment || "neutral",
      suggestions: analysis.suggestions || [],
      financialTip: analysis.financialTip || undefined,
    };
  } catch (error) {
    console.error("Error analyzing expense:", error);
    // Return default analysis on error
    return {
      comment: "Đã ghi nhận khoản chi tiêu của bạn.",
      sentiment: "neutral",
      suggestions: [],
    };
  }
}

/**
 * Chat with AI about expenses
 */
export async function chatAboutExpenses(
  prompt: string,
  userMessage: string,
  conversationHistory?: Array<{ role: "user" | "model"; text: string }>,
  userContext?: {
    monthlyBudget?: number;
    currentSpending?: number;
    recentExpenses?: Array<{
      amount: number;
      description: string;
      category: string;
    }>;
  }
): Promise<string> {
  try {
    const contextInfo = userContext
      ? `
Thông tin ngữ cảnh người dùng:
${
  userContext.monthlyBudget
    ? `- Ngân sách tháng: ${userContext.monthlyBudget.toLocaleString(
        "vi-VN"
      )} VNĐ`
    : ""
}
${
  userContext.currentSpending
    ? `- Đã chi tiêu: ${userContext.currentSpending.toLocaleString(
        "vi-VN"
      )} VNĐ`
    : ""
}
${
  userContext.recentExpenses && userContext.recentExpenses.length > 0
    ? `- Chi tiêu gần đây:\n${userContext.recentExpenses
        .map(
          (e) =>
            `  + ${e.amount.toLocaleString("vi-VN")} VNĐ - ${e.description} (${
              e.category
            })`
        )
        .join("\n")}`
    : ""
}
`
      : "";

    const systemPrompt = `
    ${prompt}
    Dữ liệu ngữ cảnh người dùng:
${contextInfo}`


    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Build conversation history
    const history =
      conversationHistory?.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.text }],
      })) || [];

    const chat = model.startChat({
      history,
    });

    const result = await chat.sendMessage(
      `${systemPrompt}\n\nUser: ${userMessage}`
    );
    const response = result.response.text();

    return response;
  } catch (error) {
    console.error("Error in chat:", error);
    throw error;
  }
}

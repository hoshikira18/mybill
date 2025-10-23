import { genAI, BILL_EXTRACTION_PROMPT } from "../config/gemini";
import { optimizeImageForAI } from "../utils/imageOptimizer";

export interface ExtractedBillData {
  amount: number | null;
  description: string;
  merchantName?: string;
  date?: string | null;
  items?: Array<{ name: string; price: number; quantity: number }> | null;
  rawText: string;
  confidence: "high" | "medium" | "low";
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
    };
  } catch (error) {
    console.error("Error extracting bill data:", error);
    throw error;
  }
}

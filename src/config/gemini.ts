import { GoogleGenerativeAI } from "@google/generative-ai";
import { CATEGORIES } from "./categories";

// TODO: Move this to environment variables for production
export const GEMINI_API_KEY = "AIzaSyB3RXSZdl2LNyVEweYZKo1_5olrW3UgWro";

export const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export const BILL_EXTRACTION_PROMPT = `Extract bill info as JSON only. No markdown, no explanation.
The JSON format is as follows:
Categories list: ${JSON.stringify(CATEGORIES)}
{
  "amount": number (total only),
  "merchantName": string,
  "description": string (brief summary),
  "date": "YYYY-MM-DD" | null,
  "items": [{name, price, quantity}] | null,
  "confidence": "high"|"medium"|"low"
  "category": string | null
}

high = clear bill, medium = some uncertain, low = unclear/missing info`;

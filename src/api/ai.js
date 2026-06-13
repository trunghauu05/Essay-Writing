import { GoogleGenerativeAI } from "@google/generative-ai";
import AI_CONSTRAINTS from "../../AI_RULES.md?raw";
const fallback_b64 = "QVEuQWI4Uk42Szc4aE5iTGotd2Z1LU10eFNlTkNfMXVRc2d3Rk5acV9kdGJaRG16VnAzMncsQVEuQWI4Uk42SUYwR0RreEl3Y3Q5STVCUk4wNGRicXlDNVhWYTg4b1FhRkdxeEFCeXJMa2csQVEuQWI4Uk42SkhQekh1TEVEdTZLeHhpUDU1ZEh4U0J2d2RIMzRCclVseHg5SzNldlY1VEEsQVEuQWI4Uk42SjQ4dlFOLTRPY3ZNTmZyVkpHVVg2UjlVUnJnLUV2U0dyTU1nOV9ZNlJsT1EsQVEuQWI4Uk42SU9aR1JrNHNYczNyMXlNQlFldmZFYjcwOGJUTTRrUTRqY2Zaa2Q0Wl9zTHcsQVEuQWI4Uk42TER0bFZZT1BKS3lQRHktSFJkRGhJaldhODA4UEJqV2tVaEtJeUU4dE82NWc=";
const keysString = import.meta.env.VITE_GEMINI_API_KEY || atob(fallback_b64);
const API_KEYS = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0);
let currentKeyIndex = 0;

export const getGenAI = () => {
  if (API_KEYS.length === 0) return null;
  try {
    const key = API_KEYS[currentKeyIndex];
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
    return new GoogleGenerativeAI(key);
  } catch (e) {
    console.error("Lỗi khởi tạo AI:", e);
    return null;
  }
};

export const MODELS_TO_TRY = ["gemini-2.5-flash-lite", "gemini-2.0-flash-lite", "gemini-2.5-flash", "gemini-flash-latest"];

export const gradeEssaySection = async (topic, sectionType, content) => {
  if (!content || !content.trim()) return null;
  const genAI = getGenAI();
  if (!genAI) return { error: "Lỗi cấu hình AI." };

  // Try fallback models loop with API Key rotation
  let attempts = 0;
  const maxAttempts = MODELS_TO_TRY.length * Math.max(1, API_KEYS.length);
  
  let currentModelIndex = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    const modelName = MODELS_TO_TRY[currentModelIndex];
    let genAI_instance = getGenAI();
    if (!genAI_instance) return { error: "Lỗi cấu hình AI (0 key)." };

    try {
      const model = genAI_instance.getGenerativeModel({ model: modelName });

  const prompt = `
You are an expert English teacher. The user is writing an essay on the topic: "${topic}".
They have written the following ${sectionType} section:
"${content}"

Grade this section ONLY based on the ENW493c Rubric criteria (0 to 5 points for each, can use 0.5 increments like 3.5 or 4.5):
1. Organization (Bố cục): Structured correctly, logical flow, good use of linking words.
2. Content (Nội dung): Answers the prompt, provides clear arguments/examples, relevant.
3. Vocabulary (Từ vựng): Appropriate academic words, no repetition, accurate context.
4. Grammar (Ngữ pháp): Correct grammar, varied sentence structures.

Return ONLY a valid JSON object (do not include markdown code blocks like \`\`\`json) with this exact structure:
{
  "scores": {
    "organization": 0,
    "content": 0,
    "vocabulary": 0,
    "grammar": 0
  },
  "feedback": "<Nhận xét ngắn gọn bằng TIẾNG VIỆT, chỉ ra điểm mạnh và cách cải thiện đoạn này.>"
}
`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonStr = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error(`AI Grading Error with ${modelName}:`, error);
      const errMsg = error.message.toLowerCase();
      
      if (errMsg.includes("429") || errMsg.includes("quota")) {
        if (attempts % Math.max(1, API_KEYS.length) === 0) {
           currentModelIndex = (currentModelIndex + 1) % MODELS_TO_TRY.length;
        }
        continue;
      }
      
      if (!errMsg.includes("503") && !errMsg.includes("high demand") && !errMsg.includes("overloaded")) {
        return { error: "Lỗi AI: " + error.message };
      }
      currentModelIndex = (currentModelIndex + 1) % MODELS_TO_TRY.length;
    }
  }
  return { error: `Hệ thống AI hiện đang quá tải hoặc hết lượt dùng (Đã thử ${API_KEYS.length} keys). Vui lòng đợi 30 giây rồi thử lại.` };
};

export const suggestVocabulary = async (topic, currentText, userQuery, history = []) => {
  const genAI = getGenAI();
  if (!genAI) return "Hệ thống AI bị lỗi cấu hình.";
  
  const contextInstruction = `
[SYSTEM INSTRUCTION - DO NOT SHOW TO USER]
Bạn là một trợ lý ảo hỗ trợ viết tiếng Anh chuyên nghiệp. 
Chủ đề bài viết: "${topic}".
Nội dung người dùng đang viết dở: "${currentText}".

${AI_CONSTRAINTS}
[END SYSTEM INSTRUCTION]
`;

  let formattedHistory = history.map(msg => ({
    role: msg.role === 'ai' ? 'model' : 'user',
    parts: [{ text: msg.text }]
  }));

  // Filter out any previous AI Error messages from history to avoid corrupting the context
  formattedHistory = formattedHistory.filter(msg => !msg.parts[0].text.startsWith("Lỗi AI") && !msg.parts[0].text.startsWith("Xin lỗi bạn"));

  // Remove leading model messages
  while (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
    formattedHistory.shift();
  }

  // Inject System Instruction into the very first user message of the session
  let finalQuery = userQuery;
  if (formattedHistory.length > 0) {
    formattedHistory[0].parts[0].text = contextInstruction + "\n\n" + formattedHistory[0].parts[0].text;
  } else {
    finalQuery = contextInstruction + "\n\n" + userQuery;
  }

  // Try fallback models loop with API Key rotation
  let attempts = 0;
  const maxAttempts = MODELS_TO_TRY.length * Math.max(1, API_KEYS.length);
  
  let currentModelIndex = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    const modelName = MODELS_TO_TRY[currentModelIndex];
    let genAI_instance = getGenAI();
    if (!genAI_instance) return `Hệ thống AI bị lỗi cấu hình (0 key).`;

    try {
      const model = genAI_instance.getGenerativeModel({ model: modelName });
      const chat = model.startChat({ history: formattedHistory });
      const result = await chat.sendMessage(finalQuery);
      return result.response.text();
    } catch (error) {
      console.error(`AI Chat Error with ${modelName}:`, error);
      const errMsg = error.message.toLowerCase();
      
      if (errMsg.includes("429") || errMsg.includes("quota")) {
        // If 429, it will loop again and `getGenAI()` will give the NEXT key!
        // We only switch model if we have exhausted all keys for this model.
        if (attempts % Math.max(1, API_KEYS.length) === 0) {
           currentModelIndex = (currentModelIndex + 1) % MODELS_TO_TRY.length;
        }
        continue; // Try next key
      }
      
      if (!errMsg.includes("503") && !errMsg.includes("high demand") && !errMsg.includes("overloaded")) {
        return "Lỗi AI: " + error.message;
      }
      // If 503, switch model immediately
      currentModelIndex = (currentModelIndex + 1) % MODELS_TO_TRY.length;
    }
  }

  return `Hệ thống đang quá tải hoặc hết lượt dùng! (Đã thử ${API_KEYS.length} keys). Vui lòng đợi 30 giây.`;
};

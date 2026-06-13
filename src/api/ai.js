import { GoogleGenerativeAI } from "@google/generative-ai";
import AI_CONSTRAINTS from "../../AI_RULES.md?raw";
const keysString = import.meta.env.VITE_GEMINI_API_KEY || "";
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

  // Try fallback models loop
  for (const modelName of MODELS_TO_TRY) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });

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
        return { error: "Bạn đang thao tác quá nhanh! Vui lòng đợi khoảng 30 giây rồi chấm điểm lại nhé." };
      }
      if (!errMsg.includes("503") && !errMsg.includes("high demand") && !errMsg.includes("overloaded")) {
        return { error: "Lỗi AI: " + error.message };
      }
    }
  }
  return { error: "Hệ thống AI hiện đang quá tải. Vui lòng đợi 15-30 giây rồi thử lại." };
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

  // Try fallback models loop
  for (const modelName of MODELS_TO_TRY) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const chat = model.startChat({
        history: formattedHistory
      });

      const result = await chat.sendMessage(finalQuery);
      return result.response.text();
    } catch (error) {
      console.error(`AI Chat Error with ${modelName}:`, error);
      const errMsg = error.message.toLowerCase();
      if (errMsg.includes("429") || errMsg.includes("quota")) {
        return "Bạn đang thao tác quá nhanh! Vui lòng đợi khoảng 30 giây rồi nhắn tin lại nhé.";
      }
      if (!errMsg.includes("503") && !errMsg.includes("high demand") && !errMsg.includes("overloaded")) {
        return "Lỗi AI: " + error.message;
      }
    }
  }

  return "Xin lỗi bạn, hệ thống Google AI hiện đang quá tải. Vui lòng đợi 15-30 giây và gửi lại câu hỏi nhé!";
};


import { GoogleGenAI } from "@google/genai";
import { Shift } from "../types";

export const analyzeLogs = async (shifts: Shift[]): Promise<string> => {
  try {
    // Используем API_KEY строго из окружения, как того требует SDK
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    
    const history = shifts.slice(0, 12).map(s => (
      `- ${s.date}: руль ${s.driveHours}ч ${s.driveMinutes}м (${s.startTime}-${s.endTime})`
    )).join('\n');

    const promptText = `
      Анализ логов тахографа (Регламент ЕС 561/2006).
      История:
      ${history}

      Дай краткое резюме на русском: есть ли нарушения режима вождения или отдыха? Что исправить? (макс 3 предложения).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: promptText,
      config: {
        systemInstruction: "Ты — эксперт по европейским правилам труда и отдыха водителей (EC 561/2006). Отвечай четко, профессионально и только на русском.",
        temperature: 0.4,
      }
    });
    
    return response.text || "Анализ завершен, но ИИ не прислал текст.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    
    const errorStr = (error.message || "").toLowerCase();
    if (errorStr.includes('location is not supported')) {
      return "⚠️ Регион не поддерживается Google AI. Используйте VPN (США, Турция).";
    }
    
    return `Ошибка ИИ: ${error.message || "проверьте ключ в настройках Vercel"}`;
  }
};

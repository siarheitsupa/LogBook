
import { GoogleGenAI } from "@google/genai";
import { Shift } from "../types";

export const analyzeLogs = async (shifts: Shift[]): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return "⚠️ API_KEY не найден. Убедитесь, что переменная окружения задана в Vercel.";
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const history = shifts.slice(0, 12).map(s => (
      `- ${s.date}: вождение ${s.driveHours}ч ${s.driveMinutes}м (смена ${s.startTime}-${s.endTime})`
    )).join('\n');

    const promptText = `
      Проанализируй логи тахографа водителя (Регламент ЕС 561/2006).
      История последних смен:
      ${history}

      Дай краткое резюме на русском языке:
      1. Есть ли явные нарушения?
      2. Нужна ли компенсация отдыха?
      Ответь максимально кратко (до 3 предложений).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: promptText,
      config: {
        systemInstruction: "Ты — ассистент водителя-международника. Твоя задача — анализировать соблюдение режима труда и отдыха (561/2006) и давать краткие советы на русском.",
        temperature: 0.3,
      }
    });
    
    return response.text || "Анализ завершен успешно.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    
    if (error.message?.toLowerCase().includes('location is not supported')) {
      return "⚠️ Сервис недоступен в вашем регионе. Попробуйте сменить IP.";
    }
    
    return `Ошибка анализа: ${error.message || "проверьте конфигурацию"}`;
  }
};

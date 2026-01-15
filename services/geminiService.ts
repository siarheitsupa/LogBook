import { GoogleGenAI } from "@google/genai";
import { Shift } from "../types";

export const analyzeLogs = async (shifts: Shift[]): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
      return "⚠️ API_KEY не найден. Убедитесь, что переменная задана в настройках Vercel и проект пересобран.";
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
      1. Есть ли явные нарушения (превышение вождения, недостаток отдыха)?
      2. Нужна ли компенсация сокращенного еженедельного отдыха?
      Ответь максимально кратко (до 3 предложений).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: promptText,
      config: {
        systemInstruction: "Ты — эксперт по европейскому законодательству о времени труда и отдыха водителей (561/2006). Твои ответы должны быть точными, профессиональными и на русском языке.",
      }
    });
    
    return response.text || "Анализ завершен, но текст пуст.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    
    if (error.message?.toLowerCase().includes('api key not valid')) {
      return "⚠️ Ошибка: API ключ Gemini недействителен.";
    }
    
    if (error.message?.toLowerCase().includes('location is not supported')) {
      return "⚠️ Сервис Gemini недоступен в вашем регионе. Попробуйте использовать VPN.";
    }
    
    return `Ошибка AI: ${error.message || "проверьте конфигурацию"}`;
  }
};
import { GoogleGenAI } from "@google/genai";
import { Shift } from "../types";

export const analyzeLogs = async (shifts: Shift[]): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    
    if (!apiKey || apiKey === "undefined" || apiKey === "") {
      console.error("AI Error: API_KEY is missing");
      return "⚠️ API_KEY не найден. Проверьте настройки окружения (Environment Variables).";
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const history = shifts.slice(0, 15).map(s => (
      `- ${s.date}: вождение ${s.driveHours}ч ${s.driveMinutes}м, смена ${s.startTime}-${s.endTime}`
    )).join('\n');

    const promptText = `
      Как эксперт по Регламенту ЕС 561/2006, проанализируй последние смены водителя:
      ${history}

      Дай очень краткое резюме (до 300 символов):
      1. Нарушения времени вождения или отдыха.
      2. Рекомендация по следующему отдыху.
      Пиши по-русски, профессионально.
    `;

    // Переключаемся на flash-модель, так как у нее обычно выше лимиты запросов (квоты)
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: promptText,
      config: {
        systemInstruction: "Ты — ассистент водителя-дальнобойщика в Европе. Твоя задача — анализировать логи тахографа на соответствие правилам 561/2006. Будь краток и точен.",
        temperature: 0.7,
      }
    });
    
    return response.text || "Анализ завершен, но модель не вернула текст.";
  } catch (error: any) {
    console.error("Gemini Critical Error:", error);
    
    // Обработка ошибки квоты (429)
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      return "⚠️ Лимит запросов исчерпан (Quota Exceeded). Пожалуйста, попробуйте позже или используйте платный API ключ.";
    }
    
    if (error.message?.includes('API key not valid')) {
      return "⚠️ Ошибка: API ключ Gemini недействителен.";
    }
    
    return `Ошибка AI: ${error.message || "неизвестная ошибка сети"}`;
  }
};
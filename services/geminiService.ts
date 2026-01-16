
import { GoogleGenAI } from "@google/genai";
import { Shift } from "../types";

export const analyzeLogs = async (shifts: Shift[]): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    
    // Проверка ключа
    if (!apiKey || apiKey === "undefined" || apiKey === "") {
      console.error("AI Error: API_KEY is missing in process.env");
      return "⚠️ API_KEY не найден в сборке. Пожалуйста:\n1. Добавьте API_KEY в Environment Variables на Vercel.\n2. Нажмите 'Redeploy' (сборка не обновится сама при изменении переменных).";
    }

    // Always use the named parameter and process.env.API_KEY directly as per SDK guidelines
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

    // Upgraded to 'gemini-3-pro-preview' for complex reasoning tasks like regulatory analysis and rule checking
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: promptText,
      config: {
        systemInstruction: "Ты — ассистент водителя-дальнобойщика в Европе. Твоя задача — анализировать логи тахографа на соответствие правилам 561/2006. Будь краток и точен.",
      }
    });
    
    // Use .text property directly as per the latest SDK spec
    return response.text || "Анализ завершен, но модель не вернула текст.";
  } catch (error: any) {
    console.error("Gemini Critical Error:", error);
    
    if (error.message?.includes('API key not valid')) {
      return "⚠️ Ошибка: API ключ Gemini недействителен или отозван.";
    }
    
    return `Ошибка AI: ${error.message || "неизвестная ошибка сети"}`;
  }
};

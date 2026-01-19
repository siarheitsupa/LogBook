
import { GoogleGenAI } from "@google/genai";
import { Shift } from "../types";

export const analyzeLogs = async (shifts: Shift[]): Promise<string> => {
  try {
    // API key must be obtained exclusively from the environment variable process.env.API_KEY.
    // Initialization must use a named parameter: new GoogleGenAI({ apiKey: ... }).
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const history = shifts.slice(0, 15).map(s => (
      `- ${s.date}: вождение ${s.driveHours}ч ${s.driveMinutes}м, смена ${s.startTime}-${s.endTime}`
    )).join('\n');

    const promptText = `
      Как эксперт по Регламенту ЕС 561/2006, проанализируй последние смены водителя:
      ${history}

      Дай очень краткое резюме (до 300 символов):
      1. Нарушения времени вождения (9/10ч), смен (13/15ч) или отдыха (9/11ч ежедневный, 24/45ч еженедельный).
      2. Предупреждение о необходимости компенсации сокращенного еженедельного отдыха, если он был.
      3. Рекомендация по следующему отдыху.
      Пиши по-русски, профессионально.
    `;

    // Complex reasoning tasks require gemini-3-pro-preview.
    // Always use ai.models.generateContent to query GenAI.
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: promptText,
      config: {
        systemInstruction: "Ты — ассистент водителя-дальнобойщика в Европе. Твоя задача — анализировать логи тахографа на соответствие правилам 561/2006. Особое внимание уделяй правилам 24/45ч еженедельного отдыха и необходимости компенсации сокращенного отдыха. Будь краток и точен.",
        temperature: 0.7,
      }
    });
    
    // The response features a .text property (not a method).
    return response.text || "Анализ завершен, но модель не вернула текст.";
  } catch (error: any) {
    console.error("Gemini Critical Error:", error);
    
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      return "⚠️ Лимит запросов исчерпан. Пожалуйста, попробуйте позже.";
    }
    
    return `Ошибка AI: не удалось проанализировать логи.`;
  }
};

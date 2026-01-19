import { GoogleGenAI } from "@google/genai";
import { Shift } from "../types";

export const analyzeLogs = async (shifts: Shift[]): Promise<string> => {
  try {
    // Используем API ключ из переменной окружения
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

    // Переключаемся на gemini-3-flash-preview, так как у нее выше лимиты запросов
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: promptText,
      config: {
        systemInstruction: "Ты — ассистент водителя-дальнобойщика в Европе. Твоя задача — анализировать логи тахографа на соответствие правилам 561/2006. Будь краток, точен и профессионален.",
        temperature: 0.5,
      }
    });
    
    return response.text || "Анализ завершен, но модель не вернула текст.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    
    if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('limit')) {
      return "⚠️ Лимит запросов к AI временно исчерпан. Пожалуйста, подождите минуту и попробуйте снова.";
    }
    
    return `Ошибка AI: не удалось проанализировать логи. Проверьте подключение.`;
  }
};
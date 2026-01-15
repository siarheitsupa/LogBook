
import { GoogleGenAI } from "@google/genai";
import { Shift } from "../types";

export const analyzeLogs = async (shifts: Shift[]): Promise<string> => {
  // Получаем ключ напрямую из process.env, как того требует SDK
  const apiKey = (window as any).process?.env?.API_KEY || '';
  
  if (!apiKey) {
    return "ИИ не настроен. API_KEY отсутствует.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const history = shifts.slice(0, 10).map(s => (
      `- ${s.date}: вождение ${s.driveHours}ч ${s.driveMinutes}м (смена ${s.startTime}-${s.endTime})`
    )).join('\n');

    const promptText = `
      Проанализируй логи водителя на соответствие правилам ЕС 561/2006.
      Последние смены:
      ${history}

      Дай краткий анализ (2 предложения) на русском языке. Есть ли нарушения? Что посоветуешь?
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      config: {
        systemInstruction: "Ты — инспектор транспортной службы. Анализируешь тахограф. Отвечай строго на русском.",
        temperature: 0.5,
      }
    });
    
    if (!response || !response.text) {
      return "ИИ вернул пустой ответ. Попробуйте еще раз.";
    }

    return response.text;
  } catch (error: any) {
    console.error("Gemini Critical Error:", error);
    
    // Детальный разбор ошибки для пользователя
    const msg = error.message || "";
    if (msg.includes('403')) return "Ошибка 403: Доступ запрещен. Возможно, ключ не подходит для этой модели.";
    if (msg.includes('429')) return "Ошибка 429: Слишком много запросов. Подождите 30 секунд.";
    if (msg.includes('fetch')) return "Ошибка сети: Не удалось связаться с серверами Google AI. Проверьте интернет.";
    
    return `Ошибка ИИ: ${msg || "Неизвестная ошибка соединения"}`;
  }
};


import { GoogleGenAI } from "@google/genai";
import { Shift } from "../types";

const getApiKey = (): string => {
  return (window as any).process?.env?.API_KEY || '';
};

export const analyzeLogs = async (shifts: Shift[]): Promise<string> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    return "ИИ не настроен. Ключ не найден в системном окружении.";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const history = shifts.slice(0, 15).map(s => (
    `Дата: ${s.date}, Время: ${s.startTime}-${s.endTime}, Вождение: ${s.driveHours}ч ${s.driveMinutes}м`
  )).join('\n');

  const prompt = `
    Проанализируй эти логи водителя грузовика на соответствие правилам ЕС (Регламент 561/2006).
    История последних смен:
    ${history}

    Дай краткое резюме (2-3 предложения): есть ли нарушения (превышение вождения, нехватка отдыха) и общую рекомендацию. Ответ должен быть на русском языке.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "Вы — эксперт по соблюдению режима труда и отдыха водителей (Регламент ЕС 561/2006). Ваша задача — лаконично выявлять нарушения и давать четкие советы. Отвечайте на русском.",
        temperature: 0.7,
        topP: 0.8,
        topK: 40
      }
    });
    
    return response.text || "Не удалось получить текстовый ответ от ИИ.";
  } catch (error: any) {
    console.error("Gemini API Error details:", error);
    if (error.message?.includes('403')) return "Ошибка: API ключ не имеет доступа к модели или регион заблокирован.";
    if (error.message?.includes('429')) return "Ошибка: Слишком много запросов. Подождите минуту.";
    return `Ошибка анализа: ${error.message || "проверьте интернет-соединение"}`;
  }
};

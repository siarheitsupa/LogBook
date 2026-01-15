
import { GoogleGenAI } from "@google/genai";
import { Shift } from "../types";

export const analyzeLogs = async (shifts: Shift[]): Promise<string> => {
  // Используем ключ из окружения
  const apiKey = process.env.API_KEY || (window as any).process?.env?.API_KEY || '';
  
  if (!apiKey) {
    return "Ключ AI не найден. Проверьте настройки платформы.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
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
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      config: {
        systemInstruction: "Ты — эксперт по европейским правилам труда и отдыха водителей (EC 561/2006). Отвечай четко, профессионально и только на русском.",
        temperature: 0.4,
      }
    });
    
    return response.text || "Анализ завершен, но ИИ не прислал текст.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    
    const errorStr = JSON.stringify(error).toLowerCase() + (error.message || "").toLowerCase();
    
    // Обработка региональной блокировки (самая частая проблема в Европе)
    if (errorStr.includes('location is not supported') || errorStr.includes('unsupported location')) {
      return "⚠️ Google AI официально не поддерживает ваш регион (например, страны ЕС). Чтобы анализ работал, включите VPN с сервером в США, Турции или другой поддерживаемой стране.";
    }
    
    if (errorStr.includes('403')) return "Ошибка 403: Ключ не имеет прав. Проверьте статус ключа в Google AI Studio.";
    if (errorStr.includes('429')) return "Ошибка 429: Слишком много запросов. Подождите минуту.";
    
    return `Ошибка ИИ: ${error.message || "проверьте интернет или VPN"}`;
  }
};

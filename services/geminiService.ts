
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
  
  const history = shifts.slice(0, 10).map(s => (
    `Date: ${s.date}, Shift: ${s.startTime}-${s.endTime}, Driving: ${s.driveHours}h ${s.driveMinutes}m`
  )).join('\n');

  const prompt = `
    Analyze these truck driver logs for compliance with EU driving rules (Regulation 561/2006).
    History:
    ${history}

    Provide a summary (2-3 sentences) in Russian.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: "Fleet compliance officer. Response in Russian."
      }
    });
    return response.text || "Не удалось получить ответ.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return "Ошибка анализа. Проверьте соединение.";
  }
};

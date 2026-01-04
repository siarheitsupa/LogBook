import { GoogleGenAI } from "@google/genai";
import { Shift } from "../types";

export const analyzeLogs = async (shifts: Shift[]): Promise<string> => {
  // Пытаемся получить ключ максимально безопасно
  let apiKey = '';
  try {
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      apiKey = process.env.API_KEY;
    } else if ((window as any).process?.env?.API_KEY) {
      apiKey = (window as any).process.env.API_KEY;
    }
  } catch (e) {
    apiKey = '';
  }
  
  if (!apiKey) {
    return "ИИ не настроен (отсутствует API_KEY в переменных окружения).";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const history = shifts.slice(0, 10).map(s => (
    `Date: ${s.date}, Shift: ${s.startTime}-${s.endTime}, Driving: ${s.driveHours}h ${s.driveMinutes}m`
  )).join('\n');

  const prompt = `
    Analyze these truck driver logs for compliance with EU driving rules (Regulation 561/2006).
    Focus on:
    1. Weekly driving limit (56h).
    2. Bi-weekly driving limit (90h).
    3. Daily driving limits and extensions.
    4. Weekly rest periods (24h/45h).
    
    Log History (latest 10 shifts):
    ${history}

    Provide a very brief summary (2-3 sentences) in Russian. Be encouraging but professional.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a professional fleet compliance officer specialized in EU driving and rest time regulations. Response must be in Russian."
      }
    });
    return response.text || "Не удалось проанализировать данные.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Ошибка при анализе логов ИИ. Проверьте настройки ключа.";
  }
};
import { GoogleGenAI } from "@google/genai";
import { Shift } from "../types";

export const analyzeLogs = async (shifts: Shift[], manualApiKey?: string): Promise<string> => {
  const apiKey = manualApiKey || process.env.API_KEY;
  
  if (!apiKey) {
    return "ИИ не настроен. Пожалуйста, добавьте Gemini API Key в настройках облака (иконка шестеренки).";
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
    3. Daily driving limits (9h/10h).
    4. Weekly rest periods (24h/45h).
    
    Log History (latest 10 shifts):
    ${history}

    Provide a very brief summary (2-3 sentences) in Russian. Be professional and mention if anything looks critical or if the driver is doing great.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a professional fleet compliance officer specialized in EU driving and rest time regulations. Your goal is to help the driver stay legal. Response must be in Russian."
      }
    });
    return response.text || "Не удалось получить ответ от ИИ.";
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    if (error?.message?.includes('API_KEY_INVALID')) return "Ошибка: Неверный API ключ Gemini.";
    return "Произошла ошибка при обращении к ИИ. Проверьте ключ или лимиты.";
  }
};
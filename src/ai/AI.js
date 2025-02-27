import { GoogleGenerativeAI } from '@google/generative-ai';
import { activeSessions } from '../index.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function sendNextQuestion(ws, sessionId) {
    const session = activeSessions.get(sessionId);
    if (!session) return;

    const context = session.questions.map((q, i) => `Q: ${q} \nA: ${session.answers[i] || ""}`).join("\n");

    const prompt = `
        You are an AI interviewer for a ${session.jobDescription} role.
        Based on the job description and the previous conversation:
        ${context}
        Ask the next interview question.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    const question = response.text();
    session.questions.push(question);
    ws.send(JSON.stringify({ type: "question", question }));
}

export async function sendFeedback(ws, sessionId) {
    const session = activeSessions.get(sessionId);
    if (!session) return;

    const conversation = session.questions.map((q, i) => `Q: ${q} \nA: ${session.answers[i]}`).join("\n");

    const prompt = `
        You are an AI interview coach.
        Based on the following conversation, provide constructive feedback:
        ${conversation}
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    const feedback = response.text();
    ws.send(JSON.stringify({ type: "feedback", feedback }));
}
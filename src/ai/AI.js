import OpenAI from 'openai'
import { activeSessions } from '../index.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "system", content: prompt }]
    });

    const question = response.choices[0].message.content;
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

    const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "system", content: prompt }]
    });

    const feedback = response.choices[0].message.content;
    ws.send(JSON.stringify({ type: "feedback", feedback }));
}


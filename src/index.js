import express from 'express';
import 'dotenv/config';
import { WebSocketServer } from "ws";
import { sendFeedback, sendNextQuestion } from "./ai/AI.js";
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

const ws = new WebSocketServer({ noServer: true });
export const activeSessions = new Map();

ws.on('connection', (socket) => {
    const sessionId = Math.random().toString(36).substring(2, 15);
    socket.sessionId = sessionId;
    activeSessions.set(sessionId, { 
        questions: [], 
        answers: [],
        questionCount: 0  // Add a counter to track questions
    });
    console.log(`New session created with id: ${sessionId}`);

    socket.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received message:', data);
            const session = activeSessions.get(sessionId);

            if (data.type === 'start') {
                session.jobDescription = data.jobDescription;
                session.questionCount = 0;  // Initialize counter
                await sendNextQuestion(socket, sessionId);
                session.questionCount++;
            } else if (data.type === "response") {
                session.answers.push(data.answer);
                
                // Check if we've reached the maximum questions
                if (session.questionCount < 10) {
                    await sendNextQuestion(socket, sessionId);
                    session.questionCount++;
                } else {
                    // Ensure feedback is sent before closing
                    try {
                        await sendFeedback(socket, sessionId);
                    } catch (error) {
                        console.error('Error sending feedback:', error);
                        socket.send(JSON.stringify({ 
                            type: 'error', 
                            message: 'Error generating feedback' 
                        }));
                    }
                    // Only close after feedback is sent
                    setTimeout(() => {
                        socket.close();
                        activeSessions.delete(sessionId);
                    }, 60000);
                }
            }
        } catch (error) {
            console.error('Error processing message:', error);
            socket.send(JSON.stringify({ 
                type: 'error', 
                message: 'Error processing message' 
            }));
        }
    });

    socket.on("close", () => {
        console.log(`Session ${socket.sessionId} closed`);
        activeSessions.delete(socket.sessionId);
    });
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
});

server.on("upgrade", (request, socket, head) => {
    ws.handleUpgrade(request, socket, head, (w) => {
        ws.emit('connection', w, request);
    });
});
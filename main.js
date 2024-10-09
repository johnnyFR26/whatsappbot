const { Client } = require('whatsapp-web.js');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('public'));

const client = new Client();

// Enviar o QR code via WebSocket
client.on('qr', (qr) => {
    wss.clients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'qr', qr }));
        }
    });
});

// Notificar quando o cliente estiver pronto
client.on('ready', () => {
    console.log('Client is ready!');
    wss.clients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'status', message: 'Client is ready!' }));
        }
    });
});

// Escutar e enviar as mensagens recebidas via WebSocket
client.on('message', message => {
    console.log(`Mensagem recebida: ${message.body}`);
    wss.clients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'message',
                from: message.from,
                body: message.body
            }));
        }
    });
});

// Receber mensagens e números do frontend e enviá-las via WhatsApp
wss.on('connection', (ws) => {
    ws.on('message', (data) => {
        const messageData = JSON.parse(data);
        if (messageData.type === 'send_message') {
            const { message, phoneNumber } = messageData;
            const chatId = `${phoneNumber}@c.us`;  // Número de WhatsApp formatado

            client.sendMessage(chatId, message).then(response => {
                console.log('Mensagem enviada com sucesso:', response);
                ws.send(JSON.stringify({ type: 'status', message: 'Mensagem enviada com sucesso!' }));
            }).catch(err => {
                console.error('Erro ao enviar a mensagem:', err);
                ws.send(JSON.stringify({ type: 'status', message: 'Erro ao enviar a mensagem.' }));
            });
        }
    });
});

// Inicializar o cliente WhatsApp
client.initialize();

server.listen(3000, () => {
    console.log('Server running on port 3000');
});

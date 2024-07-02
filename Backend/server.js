const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const expressWs = require('express-ws')(express());
const amqp = require('amqplib/callback_api');
const mongoose = require('mongoose');
const User = require('./models/User');
const Message = require('./models/Message');
require('./db'); // Importer le fichier de configuration de la base de données






const app = expressWs.app;
const port = 5000;

app.use(cors());
app.use(bodyParser.json());

let connectedClients = {}; // Pour stocker les connexions WebSocket par utilisateur

// Endpoint de signup
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const user = new User({ username, password });
    await user.save();
    res.status(200).json({ message: 'Signup successful' });
  } catch (err) {
    res.status(500).json({ error: 'An error occurred during signup.' });
  }
});

// Endpoint de login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = await User.findOne({ username, password });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    res.status(200).json({ message: 'Login successful', users: Object.keys(connectedClients) });
  } catch (err) {
    res.status(500).json({ error: 'An error occurred during login.' });
  }
});

// WebSocket endpoint pour le chat privé
app.ws('/private-chat', (ws, req) => {
  const username = req.query.username; // Récupère l'utilisateur à partir des paramètres de requête

  // Associe la connexion WebSocket à l'utilisateur
  connectedClients[username] = ws;

  ws.on('message', async (msg) => {
    const messageData = JSON.parse(msg);
    const { recipient, content } = messageData;

    // Enregistre le message dans la base de données
    const message = new Message({ sender: username, recipient, content });
    await message.save();

    // Vérifie si le destinataire est connecté
    const recipientSocket = connectedClients[recipient];
    if (recipientSocket) {
      recipientSocket.send(JSON.stringify({ sender: username, content }));
    } else {
      ws.send(JSON.stringify({ error: `User ${recipient} is not online` }));
    }
  });

  ws.on('close', () => {
    // Supprime la connexion WebSocket lorsque l'utilisateur se déconnecte
    delete connectedClients[username];

    // Envoie une notification de déconnexion à tous les clients
    broadcastUserList();
  });

  // Fonction pour diffuser la liste des utilisateurs connectés à tous les clients
  function broadcastUserList() {
    const userList = Object.keys(connectedClients);
    const message = JSON.stringify({ type: 'user-list', users: userList });
    expressWs.getWss().clients.forEach(client => {
      client.send(message);
    });
  }

  // Envoie la liste des utilisateurs connectés au nouvel utilisateur
  broadcastUserList();
});

// Connexion à RabbitMQ pour la gestion des messages (pas nécessairement privé ici)
amqp.connect('amqp://localhost', (err, conn) => {
  if (err) {
    console.error(err);
    return;
  }
  conn.createChannel((err, ch) => {
    if (err) {
      console.error(err);
      return;
    }
    const q = 'chat';
    ch.assertQueue(q, { durable: false });
    ch.consume(q, msg => {
      // Diffuse les messages reçus à tous les clients WebSocket connectés
      expressWs.getWss().clients.forEach(client => {
        client.send(msg.content.toString());
      });
    }, { noAck: true });
  });
});

// Endpoint pour récupérer les messages entre deux utilisateurs
app.get('/messages', async (req, res) => {
  const { username, recipient } = req.query;
  if (!username || !recipient) {
    return res.status(400).json({ error: 'Username and recipient are required' });
  }

  try {
    const messages = await Message.find({
      $or: [
        { sender: username, recipient },
        { sender: recipient, recipient: username }
      ]
    }).sort({ timestamp: 1 });

    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ error: 'An error occurred while retrieving messages.' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

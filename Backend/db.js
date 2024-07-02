const mongoose = require('mongoose');

const mongoURI = 'mongodb://mongo:27017/chatapp'; // URL de connexion à votre base de données MongoDB

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
 // useCreateIndex: true,
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

module.exports = db;

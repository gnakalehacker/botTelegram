const TelegramBot = require('node-telegram-bot-api');
const firebaseAdmin = require('firebase-admin');
const CoinbaseCommerce = require('coinbase-commerce-node');
const express = require('express');

// Initialisation de l'application Express
const app = express();

// Initialisation du client Coinbase Commerce
CoinbaseCommerce.Client.init('872ffd29-35ce-45bd-b68b-87adb3da49c4', {
  webhookSecret: '779a207c-5c5a-443f-bade-cf052375f770',
  webhookUrl: 'https://distinct-ninth-thing.glitch.me',
});

// Remplacez TOKEN par votre token de bot
const bot = new TelegramBot('5726454448:AAGfRzk785szXg9cIOPcHrrXRzajTX4kJ3Q', { polling: true });

// Initialisation de Firebase
firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert('./firebase-credentials.json'),
  databaseURL: 'https://autoshopbot-26da0-default-rtdb.firebaseio.com/',
});

const coinbasePaymentUrl = 'https://commerce.coinbase.com/checkout/90a311d0-b84d-4856-9033-e6b041312e99';

// Commande d'accès à la boutique
bot.onText(/\/start/, (msg) => {
  // Récupération de l'ID de l'utilisateur
  const userId = msg.from.id;

  // Récupération du solde de l'utilisateur dans la base de données
  firebaseAdmin.database().ref(`users/${userId}/solde`).once('value').then((snapshot) => {
    const solde = snapshot.val();
    // Envoi du solde à l'utilisateur
    bot.sendMessage(msg.chat.id, `Votre solde est de ${solde}€.`);
  });

  // Initialisation de Firebase
  firebaseAdmin.database().ref(`users/${userId}`).set({
    username: msg.from.username,
    firstName: msg.from.first_name,
    lastName: msg.from.last_name,
    solde: 0,
  });

  const opts = {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Recharger',
            callback_data: 'recharge',
          },
          {
            text: 'Boutique',
            callback_data: 'shop',
          },
        ],
      ],
    },
  };

  // Envoi des boutons à l'utilisateur
  bot.sendMessage(msg.chat.id, 'Bienvenue dans notre bot ! Que souhaitez-vous faire ?', opts);
});

// Commande de rechargement du solde
bot.onText(/\/recharge/, (msg) => {
  // Envoi d'un message contenant un lien vers le bouton de paiement Coinbase Commerce
  bot.sendMessage(msg.chat.id, `Pour recharger votre solde, cliquez sur ce lien : ${coinbasePaymentUrl}`);
});

// Fonction appelée lorsque le paiement est effectué sur Coinbase Commerce
function handleCoinbasePayment(chargeId, userId) {
  // Vérification du statut du paiement sur Coinbase Commerce
  CoinbaseCommerce.charges.retrieve(chargeId, (error, charge) => {
    if (error) {
      console.error(error);
      return;
    }

    // Mise à jour du solde de l'utilisateur dans la base de données
    firebaseAdmin.database().ref(`users/${userId}/balance`).transaction((balance) => {
      return balance + charge.local_amount.amount;
    });
  });
}

// Fonction appelée lorsqu'un utilisateur clique sur le bouton de la boutique
bot.on('callback_query', (query) => {
  if (query.data === 'shop') {
    // Récupération de l'ID de l'utilisateur
    const userId = query.from.id;

    // Récupération du solde de l'utilisateur dans la base de données
    firebaseAdmin.database().ref(`users/${userId}/solde`).once('value').then((snapshot) => {
      const solde = snapshot.val();

      // Envoi d'un message à l'utilisateur contenant la liste des articles disponibles à l'achat
      bot.sendMessage(query.message.chat.id, `Voici la liste des articles disponibles à l'achat (prix en €) :

- Article 1 : 10
- Article 2 : 20
- Article 3 : 30

Votre solde actuel est de ${solde}€.`);
    });
  }
});

// Endpoint appelé par les Webhooks de Coinbase Commerce lorsqu'un paiement est effectué
app.post('/webhook', (req, res) => {
  // Récupération de l'ID de la charge et de l'ID de l'utilisateur dans les données envoyées par les Webhooks
  const chargeId = req.body.data.id;
  const userId = req.body.data.metadata.user_id;

  // Traitement du paiement en utilisant la fonction handleCoinbasePayment
  handleCoinbasePayment(chargeId, userId);
});

// Démarrage de l'application Express
app.listen(3000, () => {
  console.log('Server started on port 3000');
});

const TelegramBot = require('node-telegram-bot-api');
const firebaseAdmin = require('firebase-admin');
const CoinbaseCommerce = require('coinbase-commerce-node');
const express = require('express');

// Initialisation de l'application Express
const app = express();

// Initialisation du client Coinbase Commerce
try {
  CoinbaseCommerce.Client.init('872ffd29-35ce-45bd-b68b-87adb3da49c4', {
    webhookSecret: '779a207c-5c5a-443f-bade-cf052375f770',
    webhookUrl: 'https://distinct-ninth-thing.glitch.me',
  });
} catch (error) {
  console.error(error);
}


// Remplacez TOKEN par votre token de bot
const bot = new TelegramBot('5726454448:AAGfRzk785szXg9cIOPcHrrXRzajTX4kJ3Q', { polling: true });

// Initialisation de Firebase
firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert('./firebase-credentials.json'),
  databaseURL: 'https://autoshopbot-26da0-default-rtdb.firebaseio.com/',
});

const coinbasePaymentUrl = 'https://commerce.coinbase.com/checkout/90a311d0-b84d-4856-9033-e6b041312e99';

// Commande d'accès à la boutique
bot.onText(/\/start/, async (msg) => {
  // Récupération de l'ID de l'utilisateur
  const { from } = msg;
  const { id: userId } = from;

  // Récupération du solde de l'utilisateur dans la base de données
  const snapshot = await firebaseAdmin.database().ref(`users/${userId}/solde`).once('value');
  const solde = snapshot.val();
  // Envoi du solde à l'utilisateur
  bot.sendMessage(msg.chat.id, `Votre solde est de ${solde}€.`);

  // Initialisation de Firebase
  firebaseAdmin.database().ref(`users/${userId}`).set({
    username: from.username,
    firstName: from.first_name,
    lastName: from.last_name,
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
async function handleCoinbasePayment(chargeId, userId) {
  // Vérification du statut du paiement sur Coinbase Commerce
  const charge = await CoinbaseCommerce.charges.retrieve(chargeId);
  // Mise à jour du solde de l'utilisateur dans la base de données
  firebaseAdmin.database().ref(`users/${userId}/solde`).transaction((solde) => {
    return solde + charge.local_amount.amount;
  });
}

// Fonction appelée lorsque l'utilisateur clique sur un bouton
bot.on('callback_query', (query) => {
  // Récupération de l'ID de l'utilisateur
  const { from } = query.message;
  const { id: userId } = from;

  // Traitement de la commande en fonction de la valeur de "callback_data"
  switch (query.data) {
    case 'recharge':
      // Envoi d'un message contenant un lien vers le bouton de paiement Coinbase Commerce
      bot.sendMessage(query.message.chat.id, `Pour recharger votre solde, cliquez sur ce lien : ${coinbasePaymentUrl}`);
      break;
    case 'shop':
      // Récupération du solde de l'utilisateur dans la base de données
      firebaseAdmin.database().ref(`users/${userId}/solde`).once('value').then((snapshot) => {
        const solde = snapshot.val();
        // Envoi du solde à l'utilisateur
        bot.sendMessage(query.message.chat.id, `Votre solde est de ${solde}€.`);

        // Envoi de la liste des produits à l'utilisateur
        bot.sendMessage(query.message.chat.id, 'Voici notre liste de produits :\n\n'
            + '1. Produit 1 - 10€\n'
            + '2. Produit 2 - 20€\n'
            + '3. Produit 3 - 30€\n'
            + '4. Produit 4 - 40€\n\n'
            + 'Pour acheter un produit, utilisez la commande /buy suivie de l\'ID du produit souhaité.');
      });
      break;
  }
});
// Commande d'achat de produit
bot.onText(/\/buy (\d+)/, (msg, match) => {
  // Récupération de l'ID de l'utilisateur
  const { from } = msg;
  const { id: userId } = from;

  // Récupération de l'ID du produit
  const productId = match[1];

  // Récupération du solde de l'utilisateur dans la base de données
  firebaseAdmin.database().ref(`users/${userId}/solde`).once('value').then((snapshot) => {
    const solde = snapshot.val();

    // Vérification de la disponibilité et du prix du produit
    if (productId === '1' && solde >= 10) {
      // Mise à jour du solde de l'utilisateur dans la base de données
      firebaseAdmin.database().ref(`users/${userId}/solde`).set(solde - 10);

      // Envoi d'un message de confirmation d'achat au utilisateur
      bot.sendMessage(msg.chat.id, 'Votre achat a été effectué avec succès !');
    } else if (productId === '2' && solde >= 20) {
      // Mise à jour du solde de l'utilisateur dans la base de données
      firebaseAdmin.database().ref(`users/${userId}/solde`).set(solde - 20);

      // Envoi d'un message de confirmation d'achat au utilisateur
      bot.sendMessage(msg.chat.id, 'Votre achat a été effectué avec succès !');
    } else if (productId === '3' && solde >= 30) {
      // Mise à jour du solde de l'utilisateur dans la base de données
      firebaseAdmin.database().ref(`users/${userId}/solde`).set(solde - 30);

      // Envoi d'un message de confirmation d'achat au utilisateur
      bot.sendMessage(msg.chat.id, 'Votre achat a été effectué avec succès !');
    } else if (productId === '4' && solde >= 40) {
      // Mise à jour du solde de l'utilisateur dans la base de données
      firebaseAdmin.database().ref(`users/${userId}/solde`).set(solde - 40);
      // Envoi d'un message de confirmation d'achat au utilisateur
      bot.sendMessage(msg.chat.id, 'Votre achat a été effectué avec succès !');
    } else {
      // Envoi d'un message d'erreur à l'utilisateur
      bot.sendMessage(msg.chat.id, 'Erreur : Produit indisponible ou solde insuffisant.');
    }
  });
});
// Gestion des erreurs
process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error(err);
});

// Configuration de l'application Express
app.use(express.json());

// Fonction de vérification de la signature de la requête
function verifySignature(req, res, buf) {
  const signature = req.headers['x-cc-webhook-signature'];
  if (!CoinbaseCommerce.Webhook.verify(buf, CoinbaseCommerce.Client.webhookSecret, signature)) {
    console.error('Error: Invalid signature');
    res.sendStatus(401);
  }
}

// Configuration des routes de l'application Express
app.post('/', express.raw({ verify: verifySignature }), (req, res) => {
  // Traitement de la requête
  const event = req.body;
  const { data } = event;

  // Vérification du type de l'événement
  if (event.type === 'charge:created') {
    // Récupération de l'ID de l'utilisateur
    const userId = data.metadata.user_id;

    // Traitement du paiement
    handleCoinbasePayment(data.id, userId);
  }

  // Envoi d'une réponse à Coinbase Commerce
  res.sendStatus(200);
});

// Démarrage de l'application
app.listen(process.env.PORT, () => {
  console.log(`Application démarrée sur le port ${process.env.PORT}`);
});

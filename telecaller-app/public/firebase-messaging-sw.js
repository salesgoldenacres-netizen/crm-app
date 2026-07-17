/* eslint-disable */
// Import and configure the Firebase SDK
// These scripts are only available to the Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBCmGr2081Eu1u5maFinvyrifdjvuafIuk",
  authDomain: "golden-acres-projects.firebaseapp.com",
  projectId: "golden-acres-projects",
  storageBucket: "golden-acres-projects.firebasestorage.app",
  messagingSenderId: "653663403052",
  appId: "1:653663403052:web:e34f126235e1eb4c13a589"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'Golden Acres Update';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new update in your CRM.',
    icon: '/favicon.svg', // Use existing favicon
    badge: '/favicon.svg',
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

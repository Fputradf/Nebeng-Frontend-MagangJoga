import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyBoXUQO5lhBt9qIrW_66EZCCsEXvdFarkE",
  authDomain: "nebeng-99cb7.firebaseapp.com",
  projectId: "nebeng-99cb7",
  storageBucket: "nebeng-99cb7.firebasestorage.app",
  messagingSenderId: "463441720786",
  appId: "1:463441720786:web:b38be5f55082437980c40b",
  measurementId: "G-7XX9S7850K"
};

const firebaseApp = initializeApp(firebaseConfig);
const messaging = getMessaging(firebaseApp);

export { firebaseApp, messaging };

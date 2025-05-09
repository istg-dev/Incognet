// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDLG5jRmPVGUU89Q7VBXHQa3QgnI1MwORg",
  authDomain: "anonchat-1ff01.firebaseapp.com",
  projectId: "anonchat-1ff01",
  storageBucket: "anonchat-1ff01.firebasestorage.app",
  messagingSenderId: "385914096688",
  appId: "1:385914096688:web:edf4eaeb033f92197331f5"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();

// Initialize Auth
const auth = firebase.auth(); 
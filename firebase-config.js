import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyD4PNzTUJ1mA3QgrxJDL8vYuzHMBhrhI04",
    authDomain: "aderevidas-da996.firebaseapp.com",
    projectId: "aderevidas-da996",
    storageBucket: "aderevidas-da996.firebasestorage.app",
    messagingSenderId: "671945975313",
    appId: "1:671945975313:web:b7d3a1b4e78c5d5a8fb3b0"
};

export async function initializeAppModules() {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    return { app, db };
}
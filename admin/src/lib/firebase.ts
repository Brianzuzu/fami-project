import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
    apiKey: "AIzaSyAf6V15TFKaZjnljgBFKbs7RjpOFsixZVw",
    authDomain: "fami-9b6bc.firebaseapp.com",
    projectId: "fami-9b6bc",
    storageBucket: "fami-9b6bc.appspot.com",
    messagingSenderId: "155481504364",
    appId: "1:155481504364:web:c4484413ccdd86cda5b649",
    measurementId: "G-7ZTBYEHR09"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;

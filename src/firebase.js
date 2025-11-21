// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCi2nZQgrw0NPYRlhyMo-T-8BOh9RSRbOA",
  authDomain: "fruit-efb27.firebaseapp.com",
  projectId: "fruit-efb27",
  storageBucket: "fruit-efb27.firebasestorage.app",
  messagingSenderId: "785567106813",
  appId: "1:785567106813:web:23f752b1413e6b49796094",
  measurementId: "G-9DTQ26TKFS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);      // Dịch vụ Database (Firestore)
export const auth = getAuth(app);       // Dịch vụ Đăng nhập (Authentication)
export const storage = getStorage(app);   // Dịch vụ Lưu trữ file (Storage)
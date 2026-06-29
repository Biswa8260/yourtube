// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBG_IxUMeF0cAgixBkUdXHVkMjAao2Rk-U",
  authDomain: "yourtubr-bad31.firebaseapp.com",
  projectId: "yourtubr-bad31",
  storageBucket: "yourtubr-bad31.firebasestorage.app",
  messagingSenderId: "93729439855",
  appId: "1:93729439855:web:cf29ff06995529debb0d9a",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
export { auth, provider };

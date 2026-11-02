import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// const firebaseConfig = {
//   apiKey: "YOUR_API_KEY",
//   authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
//   databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
//   projectId: "YOUR_PROJECT_ID",
//   storageBucket: "YOUR_PROJECT_ID.appspot.com",
//   messagingSenderId: "YOUR_SENDER_ID",
//   appId: "YOUR_APP_ID"
// };

const firebaseConfig = {
    apiKey: "AIzaSyDdSdUgDlcT4wxxjwT6bG4dCziub6PzVY4",
    authDomain: "classroom-quiz-1fdb9.firebaseapp.com",
    databaseURL: "https://classroom-quiz-1fdb9-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "classroom-quiz-1fdb9",
    storageBucket: "classroom-quiz-1fdb9.firebasestorage.app",
    messagingSenderId: "893840485212",
    appId: "1:893840485212:web:5f6cdf3d02e399f0f0af99"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

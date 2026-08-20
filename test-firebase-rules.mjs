import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

// I'll use a public project or invalid collection that denies writes
const app = initializeApp({ projectId: "demo-project" });
const db = getFirestore(app);

console.log("Adding doc...");
addDoc(collection(db, "test"), { a: 1 })
  .then(() => console.log("Success"))
  .catch(e => console.log("Caught:", e.code, e.message));

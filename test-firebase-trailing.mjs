import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, query, orderBy } from "firebase/firestore";

const app = initializeApp({ projectId: "historia-qr " });
const db = getFirestore(app);

console.log("Listening...");
const q = query(collection(db, "menu_items"), orderBy("name", "asc"));
onSnapshot(q, (snap) => {
  console.log("Snapshot size:", snap.size);
}, (err) => {
  console.log("Snapshot error:", err.message);
});

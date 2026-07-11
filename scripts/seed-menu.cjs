// We'll use the REST API approach via the public Firebase SDK instead.
// This script uses the firebase package (not admin) to seed data.
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, addDoc } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyCuKZI-FwDKw500nkGul_z82SuCfrkn1a4",
  authDomain: "historia-qr.firebaseapp.com",
  projectId: "historia-qr",
  storageBucket: "historia-qr.firebasestorage.app",
  messagingSenderId: "153885977238",
  appId: "1:153885977238:web:292036c1e78f6a7e7030b7",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const menuItems = [
  {
    name: "Historica Iced Coffee",
    price: 45000,
    category: "Signature Coffee",
    image_url: "https://images.unsplash.com/photo-1517701550927-30cf0baabc74?q=80&w=600&auto=format&fit=crop",
    description: "Our signature blend espresso poured over ice with a hint of roasted hazelnut and creamy milk.",
    is_available: true,
    is_chefs_recommendation: true,
  },
  {
    name: "Truffle Fries",
    price: 55000,
    category: "Light Bites",
    image_url: "https://images.unsplash.com/photo-1534080564583-6be75777b70a?q=80&w=600&auto=format&fit=crop",
    description: "Crispy shoestring fries tossed in premium truffle oil and topped with shaved parmesan.",
    is_available: true,
    is_chefs_recommendation: true,
  },
  {
    name: "Beef Wellington",
    price: 185000,
    category: "Main Course",
    image_url: "https://images.unsplash.com/photo-1600891964092-4316c288032e?q=80&w=600&auto=format&fit=crop",
    description: "Tender beef fillet wrapped in puff pastry, mushroom duxelles, and prosciutto, served with red wine jus.",
    is_available: true,
    is_chefs_recommendation: true,
  },
  {
    name: "Classic Carbonara",
    price: 85000,
    category: "Pasta & Pizza",
    image_url: "https://images.unsplash.com/photo-1612874742237-6526221588e3?q=80&w=600&auto=format&fit=crop",
    description: "Authentic Roman style carbonara with guanciale, pecorino romano, and a rich egg yolk sauce.",
    is_available: true,
    is_chefs_recommendation: false,
  },
  {
    name: "Margherita Pizza",
    price: 95000,
    category: "Pasta & Pizza",
    image_url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=600&auto=format&fit=crop",
    description: "Wood-fired sourdough crust topped with San Marzano tomato sauce, fresh mozzarella, and basil.",
    is_available: true,
    is_chefs_recommendation: false,
  },
  {
    name: "Matcha Latte",
    price: 48000,
    category: "Signature Coffee",
    image_url: "https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?q=80&w=600&auto=format&fit=crop",
    description: "Ceremonial grade Uji matcha whisked to perfection with steamed milk.",
    is_available: true,
    is_chefs_recommendation: false,
  },
  {
    name: "Crispy Calamari",
    price: 65000,
    category: "Light Bites",
    image_url: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?q=80&w=600&auto=format&fit=crop",
    description: "Lightly dusted and fried squid rings served with house-made tartare sauce and lemon wedge.",
    is_available: true,
    is_chefs_recommendation: false,
  },
  {
    name: "Grilled Norwegian Salmon",
    price: 165000,
    category: "Main Course",
    image_url: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=600&auto=format&fit=crop",
    description: "Perfectly seared salmon fillet served with garlic potato purée and buttered asparagus.",
    is_available: true,
    is_chefs_recommendation: true,
  },
  {
    name: "Classic Tiramisu",
    price: 55000,
    category: "Desserts",
    image_url: "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?q=80&w=600&auto=format&fit=crop",
    description: "Espresso-soaked ladyfingers layered with rich mascarpone cream and dusted with premium cocoa.",
    is_available: true,
    is_chefs_recommendation: true,
  },
  {
    name: "Basque Burnt Cheesecake",
    price: 60000,
    category: "Desserts",
    image_url: "https://images.unsplash.com/photo-1621236378699-8597ffc34024?q=80&w=600&auto=format&fit=crop",
    description: "Caramelized outer crust with a melting, creamy center. A true sweet indulgence.",
    is_available: true,
    is_chefs_recommendation: false,
  }
];

async function seed() {
  console.log("🌱 Seeding menu_items collection...");
  for (const item of menuItems) {
    const docRef = await addDoc(collection(db, "menu_items"), item);
    console.log(`✅ Added: ${item.name} (${docRef.id})`);
  }
  console.log("\n🎉 All menu items seeded successfully!");
  process.exit(0);
}

seed().catch(err => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});

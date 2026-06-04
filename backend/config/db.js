const mongoose = require('mongoose');

const connectDB = async () => {
  console.log("=== ENV DEBUG ON RENDER ===");
  console.log("MONGODB_URI exists:", !!process.env.MONGODB_URI);
  console.log("MONGO_URI exists:", !!process.env.MONGO_URI);
  console.log("All MONGO keys:", Object.keys(process.env).filter(key => key.includes("MONGO") || key.includes("URI")));
  console.log("============================");

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!uri) {
    console.error("❌ No MongoDB URI found in environment variables!");
    return;
  }

  console.log("✅ Using URI (starts with):", uri.substring(0, 50) + "...");

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 20000,
      socketTimeoutMS: 45000,
      family: 4
    });
    console.log("✅ MongoDB Connected Successfully");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
  }
};

module.exports = connectDB;
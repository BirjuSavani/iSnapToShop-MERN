require("dotenv").config();

const port = process.env.BACKEND_PORT || 8080;

console.log("Starting server...");
console.log("Port:", port);

try {
  const app = require("./src/app");
  console.log("App loaded successfully");
  
  app.listen(port, '127.0.0.1', () => {
    console.log(`✅ Server is running on port ${port}`);
  });
} catch (error) {
  console.error("❌ Error starting server:", error.message);
  console.error("Stack:", error.stack);
}
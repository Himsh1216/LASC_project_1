const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies

const PORT = process.env.PORT || 3002; // Use environment variable or default

// Utility function to validate input
const validateInput = (input) => typeof input === "string" && input.trim() !== "";

// Function to read and parse the authentication file
const readAuthFile = async () => {
  const authPath = path.join(__dirname, "auth.json");
  try {
    const data = await fs.readFile(authPath, "utf8");
    const users = JSON.parse(data);
    if (!Array.isArray(users)) {
      throw new Error("Auth file content is not an array");
    }
    return users;
  } catch (err) {
    console.error("Error reading or parsing auth file:", err);
    throw new Error("Unable to process authentication file");
  }
};

// Login route
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  // Validate input
  if (!validateInput(username) || !validateInput(password)) {
    return res.status(400).json({ error: "Invalid input data" });
  }

  try {
    const users = await readAuthFile();

    // Find user with matching credentials
    const user = users.find(
      (user) => user.username === username && user.password === password
    );

    if (user) {
      return res.status(200).json({ message: "Login successful" });
    } else {
      return res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (err) {
    console.error("Error during login:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Centralized error handler (Optional)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack);
  res.status(500).json({ error: "Something went wrong" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

import express from "express";

const app = express();
const PORT = 8000;

// Middleware
app.use(express.json());

// Root GET route
app.get("/", (req, res) => {
  res.send("Welcome to Classroom API");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

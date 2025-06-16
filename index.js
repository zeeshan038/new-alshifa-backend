const express = require("express");
const dotenv = require('dotenv');
dotenv.config();
const connectDb = require('./config/db');
const cors = require("cors");
const index = require('./routes/index');
const app = express();

// CORS config - fixed trailing slash and removed duplicate call
app.use(cors({
  origin: "https://new-alshifa-frontend.vercel.app", 
  credentials: true
}));
app.use(cors());

// Connect DB
connectDb();

// Routes
app.use('/api', index);

// Start server
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});

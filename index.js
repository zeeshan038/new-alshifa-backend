const express = require("express");
const dotenv = require('dotenv');
dotenv.config();
const connectDb = require('./config/db');
const cors = require("cors");
const index = require('./routes/index');
const app = express();

app.use(cors({
  origin: "http://localhost:5173", 
  credentials: true
}));
app.use(express.json());
app.use(cors());

connectDb();

// Routes
app.use('/api', index);

// Start server
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});

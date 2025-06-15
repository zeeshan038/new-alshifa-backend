const express = require("express");
const dotenv = require('dotenv');
dotenv.config()
const connectDb = require('./config/db')
const cors = require("cors");
const index = require('./routes/index')
const app =  express()

//middlewares
app.use(cors({
  origin: "http://localhost:5174",
  credentials: true
}));
app.use(cors());

//connect db
connectDb();

// routes
app.use('/api' , index)


const port = process.env.PORT || 4000;
// server
app.listen(port, ()=>{
    console.log(`server is running on port ${port}`)
})

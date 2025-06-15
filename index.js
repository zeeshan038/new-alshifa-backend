const express = require("express");
const dotenv = require('dotenv');
dotenv.config()
const connectDb = require('./config/db')
const cors = require("cors");
const index = require('./routes/index')
const app =  express()

//middlewares
app.use(cors({
  origin: "https://new-alshifa-frontend.vercel.app/",
  credentials: true
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//connect db
connectDb();

// routes
app.use('/api' , index)


const port = process.env.PORT || 4000;
// server
app.listen(port, ()=>{
    console.log(`server is running on port ${port}`)
})

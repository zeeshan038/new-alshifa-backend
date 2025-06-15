const express = require("express");
const connectDb = require('./config/db')
const cors = require("cors");
const index = require('./routes/index')
const app =  express()

//middlewares
app.use(express.json());
app.use(cors());

//connect db
connectDb();

// routes
app.use('/api' , index)

// server
app.listen(4000 , ()=>{
    console.log("server is running on port 4000")
})
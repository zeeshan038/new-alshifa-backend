const mongoose = require("mongoose");

const medSchema = new mongoose.Schema({
  name: {
    type: String,
 
  },
  description: {
    type: String,
    
  },
  brand: {
    type: String,
    
  },
  price: {
    type: Number,
   
  },
  image: {
    type: String,
    
  },
  category: {
    type: String,

  },
  manufacturer: {
    type: String,

  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model("Medicine", medSchema);

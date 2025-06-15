//NPM Packages
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

module.exports = connectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      dbName: "pharmacy-management",
    });
    console.log("Connection Created");
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
};

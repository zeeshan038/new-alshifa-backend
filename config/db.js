//NPM Packages
const mongoose = require("mongoose");

module.exports = connectDb = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017", {
      dbName: "pharmacy-management",
    });
    console.log("Connection Created");
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
};

require("dotenv").config();
const mongoose = require("mongoose");

const dbConnection = async () => {
  try {
    const con = await mongoose.connect(process.env.DATABASE);
    console.log("database connected");
  } catch (error) {
    console.log(error);
  }
};

module.exports = dbConnection;

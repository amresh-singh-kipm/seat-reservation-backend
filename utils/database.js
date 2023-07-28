require("dotenv").config()
const mongoose = require('mongoose')

const dbConnection = () =>{
    mongoose.connect(process.env.DATABASE)
    .then(resp=>console.log("database connected"))
    .catch(error=>console.log(error))
}

module.exports = dbConnection
const mongoose = require('mongoose')

const seatSchema = new mongoose.Schema({
    seatInRow:{
        type:Array,
    }
},
{timestamps : true}
)

module.exports = mongoose.model("seat",seatSchema)
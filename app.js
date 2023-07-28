const express = require("express");
const cors = require("cors");
const dbConnection = require("./utils/database");
const app = express();

app.use(express.json());

//enabling cross connection
app.use(cors());

//database connection
dbConnection();

//router
const seatRouter = require("./router/SeatRouter");

app.use("/api", seatRouter);

module.exports = app;

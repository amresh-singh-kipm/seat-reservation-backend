const express = require("express");
const {
  createSeatController,
  availableSeats,
  getNumberofAvailableSeat,
  bookSeats,
  resetAllSeat,
} = require("../controller/SeatController");
const router = express.Router();

//param
router.param("available", getNumberofAvailableSeat);

//seat router

router.get("/available/seats", availableSeats);
router.post("/create/seats", createSeatController);
router.post("/book/seats/:available", bookSeats);
router.post("/reset/seats", resetAllSeat);

module.exports = router;

const Seat = require("../models/SeatSchema");
// variable to create seat
const seatConstant = require("../utils/Constant");

//calculating total row
let totalRows = Math.ceil(
  seatConstant.totalNumberSeats / seatConstant.seatsPerRow
);

//calculating seat number in particular row
let seatsInLastRow = seatConstant.totalNumberSeats % seatConstant.seatsPerRow;

async function fetchSeats() {
  try {
    const resp = await Seat.find();
    return resp[0].seatInRow;
  } catch (err) {
    console.log(err);
    return null;
  }
}

//controller to book seat
exports.bookSeats = async (req, res) => {
  const { book } = req.body;
  if (book == null || book > 7) {
    return res.status(400).json({
      message: "Invalid input",
      status: "FAILED",
    });
  }
  try {
    const seats = await fetchSeats();
    let allSeatBooked = await toReserveSeats(req, seats, book);
    if (allSeatBooked) {
      res.json({
        message: "Seat are booked",
        bookedSeat: allSeatBooked,
        status: "SUCCESS",
      });
    }
  } catch (err) {
    res.status(500).json({
      message: "Failed to book seat.",
      error: err,
    });
  }
};

//FUNCTION TO FETCH THE AVAILABLE SEAT
exports.availableSeats = (req, res, next) => {
  Seat.find()
    .then((resp) => {
      //IF NO SEATS AVAILABLE
      if (!resp) {
        res.status(200).json({
          message: "No seats available",
          status: "SUCCESS",
        });
      } else {
        res.json({
          seats: resp[0],
        });
      }
    })
    .catch((err) => {
      res.status(500).json({
        message: "Error occur while fetching seats data",
        error: err,
        status: "FAILED",
      });
    });
};

//function to get sum of available seat in all row
exports.getNumberofAvailableSeat = async (req, res, next) => {
  let availableSeat = 0;

  Seat.find()
    .then((resp) => {
      if (!resp) {
        res.status(200).json({
          message: "No seats available",
          status: "SUCCESS",
        });
      } else {
        for (let i = 0; i < resp[0].seatInRow.length; i++) {
          let seatNumber =
            i === resp[0].seatInRow.length - 1
              ? seatsInLastRow
              : seatConstant.seatsPerRow;
          for (let j = 0; j < seatNumber; j++) {
            if (resp[0].seatInRow[i][j].status == 0) {
              availableSeat++;
            }
          }
        }
      }
      req.availableSeat = availableSeat;
      next();
    })
    .catch((err) => {
      res.status(500).json({
        message: "Error occur while fetching seats data",
        error: err,
        status: "FAILED",
      });
    });
};

//function to get index of required row and seat to book
function seatsAvailableInRow(row, seatList, seatsRequired) {
  let availableSeat = [];
  let seatNumberArray = [];
  let obj = {};
  for (let j = 0; j < seatList[row].length; j++) {
    if (seatList[row][j].status == 0) {
      seatNumberArray.push(seatList[row][j]);
    }
    if (seatList[row][j].status !== 0) {
      availableSeat.push(seatNumberArray);

      seatNumberArray = [];
    }
    if (j == seatList[row].length - 1) {
      availableSeat.push(seatNumberArray);
      availableSeat.some((arraylength) => {
        let maxLength = arraylength.length;
        if (maxLength > seatsRequired) {
          obj = { rowIndex: row, maxConsecutiveSeat: arraylength };
        }
        if (maxLength == seatsRequired) {
          return (obj = { rowIndex: row, maxConsecutiveSeat: arraylength });
        }
      });
      return obj;
    }
  }
  availableSeat = [];
  console.log("nsdihksdkjsdnjk", obj);
  return -1;
}

//function to get seat if avaiable required seat are not available in all row
function seatAvailableInConsecutiveRow(
  seatList,
  seatsRequired,
  availableSeatNumber
) {
  let availableSeat = [];
  let seatNumberArray = [];

  for (let i = 0; i < seatList.length; i++) {
    for (let j = 0; j < seatList[i].length; j++) {
      if (seatList[i][j].status == 0) {
        seatNumberArray.push(seatList[i][j]);
      } else {
        availableSeat.push(seatNumberArray);
        seatNumberArray = [];
      }
      if (j == seatList[i].length - 1) {
        if (seatNumberArray.length > 0) {
          availableSeat.push(seatNumberArray);
        }
        seatNumberArray = [];
      }
    }
    if (i == seatList.length - 1) {
      availableSeat.sort((a, b) => b.length - a.length);
      availableSeat?.some((seatslength) => {
        if (seatslength.length == seatsRequired) {
          return (obj = seatslength);
        }
        if (availableSeatNumber >= seatsRequired) {
          return (obj = availableSeat.flat());
        }
      });
      return obj;
    }
  }
}

//function to update seat status
const updateSeatsStatus = async (seatNumbers, status, remaningRequiredSeat) => {
  try {
    // Since the seats are not in a flat array, we need to update each seat individually
    for (const seatNumber of seatNumbers) {
      if (remaningRequiredSeat > 0) {
        // calculating the row and index to update seat
        const row = Math.floor((seatNumber - 1) / seatConstant.seatsPerRow);
        const index = (seatNumber - 1) % seatConstant.seatsPerRow;

        await Seat.updateOne(
          { [`seatInRow.${row}.${index}.seatNumber`]: seatNumber },
          { $set: { [`seatInRow.${row}.${index}.status`]: status } }
        ).then((resp) => {
          if (resp.modifiedCount == 1) {
            remaningRequiredSeat--;
          }
        });
      }
    }
  } catch (err) {
    console.error(err);
  }
};

//function to reserve seat
async function toReserveSeats(req, seatList, seatsRequired) {
  let remaningRequiredSeat = seatsRequired;

  //variable to store available number of seat
  let availableSeatNumber = req.availableSeat;
  //variable to store index value of row
  let indexOfRow = null;

  //variable to store consecutive seat
  let maxConsecutiveSeat = null;

  //loop to iterate through each row of seatdata
  for (let i = 0; i < seatList.length; i++) {
    //getting the row and seatnumber for the booking of seat
    let seatRows = seatsAvailableInRow(i, seatList, seatsRequired);
    //checking the length of consecutive seat in row is greater than or equal to required seat
    if (seatRows.maxConsecutiveSeat?.length >= seatsRequired) {
      //checking the consecutive seat in previous row is greater than the current row
      if (maxConsecutiveSeat?.length > seatRows.maxConsecutiveSeat.length) {
        indexOfRow = seatRows.rowIndex;
        maxConsecutiveSeat = seatRows.maxConsecutiveSeat;
      }

      //initalizing the index row and seatnumber for the first time
      if (maxConsecutiveSeat == null) {
        indexOfRow = seatRows.rowIndex;
        maxConsecutiveSeat = seatRows?.maxConsecutiveSeat;
      }
    }
    if (indexOfRow == null && i === seatList.length - 1) {
      let result = seatAvailableInConsecutiveRow(
        seatList,
        seatsRequired,
        availableSeatNumber
      );
      if (result) {
        console.log(result);
        const seatNumbers = result.map((seat) => seat.seatNumber);
        try {
          await updateSeatsStatus(seatNumbers, 1, remaningRequiredSeat);
        } catch (err) {
          console.log(err);
        }
      }
      return result.slice(0, seatsRequired);
    }
    //checking required seat is equal or greater than the consecutive seat and row of seatdata
    if (
      seatsRequired == seatRows?.maxConsecutiveSeat?.length ||
      (indexOfRow > -1 && i === seatList.length - 1)
    ) {
      const seatNumbers = maxConsecutiveSeat.map((seat) => seat.seatNumber);
      try {
        await updateSeatsStatus(seatNumbers, 1, remaningRequiredSeat);
      } catch (err) {
        console.log(err);
      }
      //looping all consecutive seat
      //   maxConsecutiveSeat.forEach((seat) => {
      //     for (let j = 0; j < seatList[indexOfRow].length; j++) {
      //       //checking the remaining seat to book
      //       if (remaningRequiredSeat > 0) {
      //         //updating status seatmunber in database
      //         Seat.updateOne(
      //           {
      //             [`seatInRow.${indexOfRow}.${j}.seatNumber`]: {
      //               $eq: seat.seatNumber,
      //             },
      //           },
      //           { $set: { [`seatInRow.${indexOfRow}.${j}.status`]: 1 } }
      //         ).catch((err) => console.log(err));
      //       }
      //     }
      //     remaningRequiredSeat--;
      //   });

      //returning booked seat number to the user
      return maxConsecutiveSeat.slice(0, seatsRequired);
    }
  }
}

//function to store seatdata in database according to number of row and seat
exports.createSeatController = (req, res) => {
  let totalSeat = creatSeat();
  let createSeat = new Seat({ seatInRow: totalSeat });

  //storing seats in database
  createSeat
    .save()
    .then((resp) =>
      res.json({
        message: "Seat created successfully",
        status: "SUCCESS",
      })
    )
    .catch((err) => {
      res.status(500).json({
        message: "Not Able to create seat",
        error: err,
        status: "FAILED",
      });
    });
};

//function to reset all seat status and book some random seat
exports.resetAllSeat = (req, res, next) => {
  for (let i = 0; i < totalRows; i++) {
    //checking that is it last row or not
    let seatInRow =
      i === totalRows - 1 ? seatsInLastRow : seatConstant.seatsPerRow;

    //making all seat to available
    for (let j = 0; j < seatInRow; j++) {
      Seat.updateOne(
        { [`seatInRow.${i}.${j}.status`]: { $eq: 1 } },
        { $set: { [`seatInRow.${i}.${j}.status`]: 0 } }
      )
        .then((resp) => {})
        .catch((err) => {
          res.status(500).json({
            message: "Failed resetting seat status",
            error: err,
            status: "FAILED",
          });
        });
    }
  }
  //booking some random seat
  toBookRandomSeat(req, res);
};

//function to create seat on the basis of variable
function creatSeat() {
  let seatNumber = 1;
  for (let i = 0; i < totalRows; i++) {
    seatConstant.coach[i] = [];
    let seatInRow =
      i === totalRows - 1 ? seatsInLastRow : seatConstant.seatsPerRow;
    for (let j = 0; j < seatInRow; j++) {
      seatConstant.coach[i][j] = { seatNumber: seatNumber, status: 0 };
      seatNumber++;
    }
  }

  return seatConstant.coach;
}

//function to create a random seat number
function toBookRandomSeat(req, res) {
  //variable to store random number
  const random = new Set();

  //genrating random number
  while (random.size !== 6) {
    random.add(Math.floor(Math.random() * 60));
  }

  //updating database with selected seat as occupied and send success response
  [...random].forEach((randomValue, index) => {
    //calculating row where to update
    let row = Math.floor(randomValue / seatConstant.seatsPerRow);

    //calculating index where to update
    let element = randomValue % seatConstant.seatsPerRow;

    //changing in database
    Seat.updateOne(
      { [`seatInRow.${row}.${element}.status`]: { $eq: 0 } },
      { $set: { [`seatInRow.${row}.${element}.status`]: 1 } }
    )
      .then((resp) => {
        //checking that we are booking last seat or not
        if (index === random.size - 1) {
          //if last seat is booked then sending response back to client side
          res.json({
            message: "successfully booked random seat",
            status: "SUCCESS",
          });
        }
      })
      //handling error while booking random seats
      .catch((err) => {
        res.status(500).json({
          message: "Error while booking random seats",
          error: err,
          status: "FAILED",
        });
      });
  });
}

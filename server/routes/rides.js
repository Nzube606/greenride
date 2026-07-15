const express = require("express");
const router = express.Router();
const Ride = require("../models/Ride");
const { protect, driverOnly } = require("../middleware/auth");

// @route   POST /api/rides/request
// @desc    Passenger requests a ride
router.post("/request", protect, async (req, res) => {
  try {
    const { pickupLocation, destination } = req.body;

    if (req.user.role !== "passenger") {
      return res
        .status(403)
        .json({ message: "Only passengers can request rides" });
    }

    const ride = await Ride.create({
      passenger: req.user._id,
      passengerName: req.user.fullName,
      pickupLocation,
      destination,
      status: "pending",
    });

    res.status(201).json({ message: "Ride request created", ride });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error creating ride request" });
  }
});

// @route   PUT /api/rides/:id/accept
// @desc    Driver accepts a ride
router.put("/:id/accept", protect, driverOnly, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    if (ride.status !== "pending") {
      return res.status(400).json({ message: "Ride is no longer available" });
    }

    ride.driver = req.user._id;
    ride.status = "accepted";
    await ride.save();

    const updatedRide = await Ride.findById(ride._id)
      .populate("passenger", "fullName phone")
      .populate("driver", "fullName phone vehicleNumber");

    res.json({ message: "Ride accepted", ride: updatedRide });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error accepting ride" });
  }
});

// @route   PUT /api/rides/:id/complete
// @desc    Driver marks ride as complete
router.put("/:id/complete", protect, driverOnly, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    if (ride.driver.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorised to complete this ride" });
    }

    ride.status = "completed";
    await ride.save();

    res.json({ message: "Ride completed", ride });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error completing ride" });
  }
});

// @route   PUT /api/rides/:id/cancel
// @desc    Passenger cancels a ride
router.put("/:id/cancel", protect, async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    if (ride.passenger.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorised to cancel this ride" });
    }

    if (ride.status === "completed") {
      return res
        .status(400)
        .json({ message: "Cannot cancel a completed ride" });
    }

    ride.status = "cancelled";
    await ride.save();

    res.json({ message: "Ride cancelled", ride });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error cancelling ride" });
  }
});

// @route   GET /api/rides/my-rides
// @desc    Get current user ride history
router.get("/my-rides", protect, async (req, res) => {
  try {
    let rides;

    if (req.user.role === "passenger") {
      rides = await Ride.find({ passenger: req.user._id })
        .populate("driver", "fullName phone vehicleNumber")
        .sort({ createdAt: -1 });
    } else if (req.user.role === "driver") {
      rides = await Ride.find({ driver: req.user._id })
        .populate("passenger", "fullName phone")
        .sort({ createdAt: -1 });
    }

    res.json({ rides });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching rides" });
  }
});

// @route   GET /api/rides/pending
// @desc    Get all pending rides (for drivers to see)
router.get("/pending", protect, driverOnly, async (req, res) => {
  try {
    const rides = await Ride.find({ status: "pending" })
      .populate("passenger", "fullName phone")
      .sort({ createdAt: -1 });

    res.json({ rides });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching pending rides" });
  }
});

// @route   GET /api/rides/all
// @desc    Get all rides (admin only)
router.get("/all", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const rides = await Ride.find()
      .populate("passenger", "fullName phone email")
      .populate("driver", "fullName phone vehicleNumber")
      .sort({ createdAt: -1 });

    res.json({ rides });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching all rides" });
  }
});

module.exports = router;

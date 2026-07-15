const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { protect, adminOnly } = require("../middleware/auth");

// @route   GET /api/users/me
// @desc    Get current logged in user profile
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching profile" });
  }
});

// @route   PUT /api/users/availability
// @desc    Driver toggles availability
router.put("/availability", protect, async (req, res) => {
  try {
    if (req.user.role !== "driver") {
      return res
        .status(403)
        .json({ message: "Only drivers can update availability" });
    }

    const user = await User.findById(req.user._id);
    user.isAvailable = !user.isAvailable;
    await user.save();

    res.json({
      message: `You are now ${user.isAvailable ? "available" : "unavailable"}`,
      isAvailable: user.isAvailable,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error updating availability" });
  }
});

// @route   GET /api/users/all
// @desc    Get all users (admin only)
router.get("/all", protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching users" });
  }
});

// @route   PUT /api/users/:id/deactivate
// @desc    Admin deactivates a user account
router.put("/:id/deactivate", protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      message: `User account ${user.isActive ? "activated" : "deactivated"} successfully`,
      isActive: user.isActive,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error updating user status" });
  }
});

// @route   GET /api/users/drivers
// @desc    Get all drivers (admin only)
router.get("/drivers", protect, adminOnly, async (req, res) => {
  try {
    const drivers = await User.find({ role: "driver" })
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({ drivers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching drivers" });
  }
});

module.exports = router;

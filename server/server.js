const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

// Routes
const authRoutes = require("./routes/auth");
const rideRoutes = require("./routes/rides");
const userRoutes = require("./routes/users");

app.use("/api/auth", authRoutes);
app.use("/api/rides", rideRoutes);
app.use("/api/users", userRoutes);

// Test route
app.get("/", (req, res) => {
  res.json({ message: "GreenRide server is running" });
});

// Socket.io
const connectedDrivers = {};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Driver sets themselves as active
  socket.on("driver:online", (driverId) => {
    connectedDrivers[driverId] = socket.id;
    console.log(`Driver ${driverId} is online`);
  });

  // Passenger requests a ride
  socket.on("ride:request", (rideData) => {
    console.log("New ride request:", rideData);
    // Broadcast to all connected drivers
    socket.broadcast.emit("ride:new_request", rideData);
  });

  // Driver accepts a ride
  socket.on("ride:accept", (data) => {
    console.log("Ride accepted:", data);
    // Notify the specific passenger
    io.emit("ride:accepted", data);
  });

  // Driver shares live location
  socket.on("driver:location", (data) => {
    // Broadcast driver location to all connected clients
    socket.broadcast.emit("driver:location_update", data);
  });

  // Ride completed
  socket.on("ride:complete", (data) => {
    io.emit("ride:completed", data);
  });

  // Ride cancelled
  socket.on("ride:cancel", (data) => {
    io.emit("ride:cancelled", data);
  });

  socket.on("disconnect", () => {
    // Remove driver from connected list
    for (const [driverId, socketId] of Object.entries(connectedDrivers)) {
      if (socketId === socket.id) {
        delete connectedDrivers[driverId];
        console.log(`Driver ${driverId} went offline`);
        break;
      }
    }
    console.log("User disconnected:", socket.id);
  });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    server.listen(process.env.PORT, () => {
      console.log(`GreenRide server running on port ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

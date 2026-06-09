require("dotenv").config();

const express = require("express");
const cors = require("cors");
const db = require("./src/db");
const authRoutes = require("./src/routes/auth");
const usersRoutes = require("./src/routes/users");
const projectsRoutes = require("./src/routes/projects");
const tasksRoutes = require("./src/routes/tasks");
const qaRoutes = require("./src/routes/qa");
const timeLogsRoutes = require("./src/routes/timelogs");
const collaborationRoutes = require("./src/routes/collaboration");
const notificationsRoutes = require("./src/routes/notifications");
const reportsRoutes = require("./src/routes/reports");
const streamNotifications = require("./src/realtime");
const { startNotificationDispatcher } = require("./src/notificationDispatcher");

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    res.status(503).json({ status: "error", database: "disconnected" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/qa", qaRoutes);
app.use("/api/timelogs", timeLogsRoutes);
app.use("/api/tasks", collaborationRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/reports", reportsRoutes);
app.get("/api/notifications/stream", streamNotifications);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  startNotificationDispatcher();
  console.log(`Server running on port ${PORT}`);
});

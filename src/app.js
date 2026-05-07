const express = require('express');
const cors = require('cors');

// import routes
const authRoutes = require('./routes/auth.route');
const userRoutes = require("./routes/user.route");
const studentRoutes = require("./routes/student.route");
const academicRoutes = require("./routes/academic.route");
const feedbackRoutes = require("./routes/feedback.route");
const meetingRoutes = require("./routes/meeting.route");
const dashboardRoutes = require("./routes/dashboard.route");
const notificationRoutes = require("./routes/notification.route");
const advisorClassRoutes = require("./routes/advisorClass.route");
const classMemberRoutes = require("./routes/classMember.route");
const masterDataRoutes = require("./routes/masterData.route");
// middleware for handling errors
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(express.json());
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use('/api/auth', authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/academic", academicRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/meeting", meetingRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/advisor-classes", advisorClassRoutes);
app.use("/api/class-members", classMemberRoutes);
app.use("/api/master-data", masterDataRoutes);

app.use(errorHandler);

module.exports = app;

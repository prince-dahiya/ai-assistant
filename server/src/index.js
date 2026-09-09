const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db.js");

require("dotenv").config();

const authRoutes = require("./routes/auth.js");
const interviewRoutes = require("./routes/interview.js");
const resumeRoutes = require("./routes/resume.js");
const placementReadinessRoutes = require("./routes/placementReadiness.js");
const challengeRoutes = require("./routes/challenge.js");
const adminRoutes = require("./routes/admin.js");

const User = require("./models/User.js");

// =====================================================
// CREATE / ENSURE ADMIN ACCOUNT
// =====================================================

const ensureAdminAccount = async () => {
  try {
    const adminEmail = (
      process.env.ADMIN_EMAIL ||
      "dahiyapri000@gmail.com"
    )
      .toLowerCase()
      .trim();

    const adminPassword =
      process.env.ADMIN_PASSWORD ||
      "Prince@321";

    const adminName =
      process.env.ADMIN_NAME ||
      "Administrator";

    // IMPORTANT:
    // Get the admin exactly like we get a normal User.
    let admin = await User.findOne({
      email: adminEmail,
    });

    // =================================================
    // CREATE ADMIN
    // =================================================

    if (!admin) {
      admin = await User.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: "Administrator",
        isEmailVerified: true,

        passwordChangedAt:
          new Date(),

        passwordExpiresAt:
          new Date(
            Date.now() +
              90 *
                24 *
                60 *
                60 *
                1000
          ),
      });

      console.log(
        "✅ Administrator account created:",
        admin.email
      );

      return admin;
    }

    // =================================================
    // EXISTING ADMIN
    // =================================================

    let changed = false;

    if (
      admin.role !==
      "Administrator"
    ) {
      admin.role =
        "Administrator";

      changed = true;
    }

    if (
      !admin.isEmailVerified
    ) {
      admin.isEmailVerified =
        true;

      changed = true;
    }

    if (changed) {
      await admin.save();
    }

    console.log(
      "✅ Administrator account ready:",
      admin.email
    );

    return admin;
  } catch (error) {
    console.error(
      "❌ Failed to create administrator account:",
      error
    );

    throw error;
  }
};

// =====================================================
// APP
// =====================================================

const app = express();

// =====================================================
// CORS
// =====================================================

app.use(
  cors({
    origin: "*",
  })
);

// =====================================================
// BODY PARSERS
// =====================================================

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

// =====================================================
// ROUTES
// =====================================================

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/interviews",
  interviewRoutes
);

app.use(
  "/api/resume",
  resumeRoutes
);

app.use(
  "/api/placement-readiness",
  placementReadinessRoutes
);

app.use(
  "/api/challenges",
  challengeRoutes
);

app.use(
  "/api/admin",
  adminRoutes
);

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/", (req, res) => {
  res.send(
    "Backend is running!"
  );
});

// =====================================================
// ERROR HANDLER
// =====================================================

app.use(
  (
    err,
    req,
    res,
    next
  ) => {
    console.error(
      err.stack
    );

    res.status(
      err.status || 500
    ).json({
      message:
        err.message ||
        "Internal server error",
    });
  }
);

// =====================================================
// START SERVER
// =====================================================

const PORT =
  process.env.PORT || 5000;

const startServer =
  async () => {
    try {
      // Wait for MongoDB first.
      await connectDB();

      // Make sure admin exists.
      await ensureAdminAccount();

      app.listen(
        PORT,
        () => {
          console.log(
            `🚀 Server running on http://localhost:${PORT}`
          );
        }
      );
    } catch (error) {
      console.error(
        "❌ Server startup failed:",
        error
      );

      process.exit(1);
    }
  };

startServer();
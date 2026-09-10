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

/* =====================================================
   CREATE / ENSURE ADMIN ACCOUNT
===================================================== */

const ensureAdminAccount = async () => {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || "")
      .toLowerCase()
      .trim();

    const adminPassword = process.env.ADMIN_PASSWORD;

    const adminName =
      process.env.ADMIN_NAME || "Administrator";

    if (!adminEmail || !adminPassword) {
      console.warn(
        "⚠️ ADMIN_EMAIL / ADMIN_PASSWORD not set in environment variables — skipping admin bootstrap."
      );

      return null;
    }

    /* =================================================
       GET ADMIN
    ================================================= */

    let admin = await User.findOne({
      email: adminEmail,
    });

    /* =================================================
       CREATE ADMIN
    ================================================= */

    if (!admin) {
      admin = await User.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: "Administrator",
        isEmailVerified: true,
        passwordChangedAt: new Date(),
        passwordExpiresAt: new Date(
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

    /* =================================================
       EXISTING ADMIN
    ================================================= */

    let changed = false;

    if (admin.role !== "Administrator") {
      admin.role = "Administrator";
      changed = true;
    }

    if (!admin.isEmailVerified) {
      admin.isEmailVerified = true;
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

/* =====================================================
   APP
===================================================== */

const app = express();

/* =====================================================
   CORS
===================================================== */

app.use(
  cors({
    origin: "*",
  })
);

/* =====================================================
   BODY PARSERS
===================================================== */

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

/* =====================================================
   DATABASE + ADMIN INITIALIZATION
===================================================== */

let initializationPromise = null;

const initializeServer = async () => {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      await connectDB();

      await ensureAdminAccount();

      console.log(
        "✅ Database and admin initialization complete"
      );
    })().catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  return initializationPromise;
};

/* =====================================================
   INITIALIZE BEFORE API REQUESTS
===================================================== */

app.use(async (req, res, next) => {
  try {
    await initializeServer();

    next();
  } catch (error) {
    console.error(
      "❌ Server initialization failed:",
      error
    );

    res.status(500).json({
      message: "Server initialization failed",
    });
  }
});

/* =====================================================
   ROUTES
===================================================== */

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

/* =====================================================
   HEALTH CHECK
===================================================== */

app.get("/", (req, res) => {
  res.status(200).send(
    "Backend is running!"
  );
});

/* =====================================================
   ERROR HANDLER
===================================================== */

app.use(
  (
    err,
    req,
    res,
    next
  ) => {
    console.error(
      err.stack || err
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

/* =====================================================
   LOCAL DEVELOPMENT SERVER
===================================================== */

const PORT =
  process.env.PORT || 5000;

if (require.main === module) {
  initializeServer()
    .then(() => {
      app.listen(PORT, () => {
        console.log(
          `🚀 Server running on http://localhost:${PORT}`
        );
      });
    })
    .catch((error) => {
      console.error(
        "❌ Server startup failed:",
        error
      );

      process.exit(1);
    });
}

/* =====================================================
   VERCEL EXPORT
===================================================== */

module.exports = app;
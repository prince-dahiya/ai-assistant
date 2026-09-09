const jwt = require("jsonwebtoken");
const Session = require("../models/Session.js");
const User = require("../models/User.js");

const protect = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "No token provided",
    });
  }

  try {
    const token = header.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // JWT must contain both userId and tokenId
    if (!decoded.userId || !decoded.tokenId) {
      return res.status(401).json({
        message: "Invalid authentication token",
      });
    }

    // Check whether this login session still exists and is active
    const session = await Session.findOne({
      tokenId: decoded.tokenId,
      user: decoded.userId,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      return res.status(401).json({
        message:
          "Session expired or revoked. Please log in again.",
      });
    }

    // Get the CURRENT user from database
    const user = await User.findById(decoded.userId).select(
      "-password"
    );

    if (!user) {
      return res.status(401).json({
        message: "User no longer exists",
      });
    }

    // Update session activity
    session.lastActiveAt = new Date();
    await session.save();

    // Make user/session available to controllers
    req.userId = decoded.userId;
    req.tokenId = decoded.tokenId;
    req.session = session;
    req.user = user;

    // IMPORTANT:
    // Always use current role from database.
    // Do not trust an old JWT role.
    req.userRole = user.role || "Student";

    next();
  } catch (err) {
    console.error("Authentication error:", err);

    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

// =====================================================
// TASK 6 - ROLE CHECKING MIDDLEWARE
// =====================================================

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(403).json({
        message: "User role not found",
      });
    }

    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({
        message:
          "You do not have permission to access this resource.",
      });
    }

    next();
  };
};

// =====================================================
// ROLE HELPERS
// =====================================================

const studentOnly = authorize("Student");

const mentorOnly = authorize("Mentor");

const adminOnly = authorize("Administrator");

module.exports = {
  protect,
  authorize,
  studentOnly,
  mentorOnly,
  adminOnly,
};
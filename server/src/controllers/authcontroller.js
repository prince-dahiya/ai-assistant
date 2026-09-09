const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const User = require("../models/User.js");
const Session = require("../models/Session.js");

// =====================================================
// ADMIN ACCOUNT
// =====================================================

const ADMIN_EMAIL = "dahiyapri000@gmail.com";
const ADMIN_PASSWORD = "Prince@321";

// =====================================================
// EMAIL TRANSPORTER
// =====================================================

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// =====================================================
// JWT TOKEN
// =====================================================

const signToken = (userId, tokenId, role) => {
  return jwt.sign(
    {
      userId,
      tokenId,
      role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

// =====================================================
// PASSWORD STRENGTH VALIDATION
// =====================================================

const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters long";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }

  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number";
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must contain at least one special character";
  }

  return null;
};

// =====================================================
// REGISTER
// =====================================================

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // =================================================
    // VALIDATION
    // =================================================

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const passwordError = validatePassword(password);

    if (passwordError) {
      return res.status(400).json({
        message: passwordError,
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // =================================================
    // PREVENT ADMIN EMAIL FROM NORMAL REGISTRATION
    // =================================================

    if (normalizedEmail === ADMIN_EMAIL) {
      return res.status(409).json({
        message:
          "This email is reserved for the Administrator account.",
      });
    }

    // =================================================
    // CHECK EXISTING USER
    // =================================================

    const exists = await User.findOne({
      email: normalizedEmail,
    });

    if (exists) {
      return res.status(409).json({
        message: "Email already in use",
      });
    }

    // =================================================
    // CREATE VERIFICATION TOKEN
    // =================================================

    const verificationToken = crypto
      .randomBytes(32)
      .toString("hex");

    // =================================================
    // CREATE STUDENT ACCOUNT
    // =================================================

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,

      // Every normal registration is Student.
      role: "Student",

      isEmailVerified: false,

      emailVerificationToken: verificationToken,

      emailVerificationExpires: new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ),

      passwordChangedAt: new Date(),

      passwordExpiresAt: new Date(
        Date.now() + 90 * 24 * 60 * 60 * 1000
      ),
    });

    // =================================================
    // CREATE VERIFICATION URL
    // =================================================

    const clientUrl =
      process.env.CLIENT_URL || "http://localhost:3000";

    const verificationUrl =
      `${clientUrl}/verify-email?token=${verificationToken}`;

    console.log("Verification URL:", verificationUrl);

    // =================================================
    // SEND RESPONSE IMMEDIATELY
    // =================================================

    res.status(201).json({
      message:
        "Account created successfully. Please check your email to verify your account.",

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    });

    // =================================================
    // SEND EMAIL IN BACKGROUND
    // =================================================

    transporter
      .sendMail({
        from: `"AI Assistant" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: "Verify your email - AI Assistant",

        html: `
          <div
            style="
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: auto;
              padding: 30px;
            "
          >

            <h2>
              Welcome to AI Assistant, ${user.name}!
            </h2>

            <p>
              Thanks for creating your account.
              Please verify your email address by clicking
              the button below.
            </p>

            <div style="margin: 30px 0;">

              <a
                href="${verificationUrl}"
                style="
                  display: inline-block;
                  padding: 12px 24px;
                  background: #000;
                  color: #fff;
                  text-decoration: none;
                  border-radius: 6px;
                "
              >
                Verify Email
              </a>

            </div>

            <p>
              This verification link will expire in 24 hours.
            </p>

            <p>
              If you did not create this account,
              you can safely ignore this email.
            </p>

          </div>
        `,
      })
      .then(() => {
        console.log(
          "Verification email sent to:",
          user.email
        );
      })
      .catch(async (emailError) => {
        console.error(
          "Email sending failed:",
          emailError
        );

        try {
          await User.findByIdAndDelete(user._id);

          console.log(
            "User removed because verification email failed."
          );
        } catch (deleteError) {
          console.error(
            "Failed to remove user:",
            deleteError
          );
        }
      });
  } catch (err) {
    console.error("Register error:", err);

    if (!res.headersSent) {
      return res.status(500).json({
        message: "Server error",
        error: err.message,
      });
    }
  }
};

// =====================================================
// LOGIN
// =====================================================

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // =================================================
    // GET USER
    // =================================================

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // =================================================
    // ADMIN CHECK
    // =================================================
    // If the login email is the configured admin email,
    // make absolutely sure the database account is Admin.

    const isAdminAccount =
      normalizedEmail === ADMIN_EMAIL;

    if (isAdminAccount) {
      if (user.role !== "Administrator") {
        user.role = "Administrator";
      }

      // Admin should always be verified.
      if (!user.isEmailVerified) {
        user.isEmailVerified = true;
      }

      await user.save();
    }

    // =================================================
    // ACCOUNT LOCK CHECK
    // =================================================

    if (user.isAccountLocked()) {
      const remainingTime = Math.ceil(
        (user.accountLockedUntil - Date.now()) / 60000
      );

      return res.status(423).json({
        message:
          `Account temporarily locked. Try again in ${remainingTime} minute(s).`,
      });
    }

    // =================================================
    // PASSWORD EXPIRATION
    // =================================================

    // Admin password is also subject to expiration unless
    // you decide to remove password expiration for admins.
    if (
      user.passwordExpiresAt &&
      user.passwordExpiresAt < new Date()
    ) {
      return res.status(403).json({
        message:
          "Your password has expired. Please reset your password.",
        passwordExpired: true,
      });
    }

    // =================================================
    // PASSWORD CHECK
    // =================================================

    const passwordCorrect =
      await user.comparePassword(password);

    if (!passwordCorrect) {
      user.failedLoginAttempts += 1;

      if (user.failedLoginAttempts >= 5) {
        user.accountLockedUntil = new Date(
          Date.now() + 15 * 60 * 1000
        );

        user.securityAlert = true;

        await user.save();

        return res.status(423).json({
          message:
            "Too many failed login attempts. Account locked for 15 minutes.",
        });
      }

      await user.save();

      return res.status(401).json({
        message: "Invalid credentials",

        attemptsRemaining:
          5 - user.failedLoginAttempts,
      });
    }

    // =================================================
    // EMAIL VERIFICATION
    // =================================================

    // Admin is always allowed because we force it above.
    if (
      !user.isEmailVerified &&
      !isAdminAccount
    ) {
      return res.status(403).json({
        message:
          "Please verify your email before logging in.",

        emailNotVerified: true,
      });
    }

    // =================================================
    // DEVICE INFORMATION
    // =================================================

    const ipAddress =
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress ||
      null;

    const userAgent =
      req.headers["user-agent"] ||
      "Unknown device";

    const deviceInfo = userAgent;

    // =================================================
    // PREVENT DUPLICATE SESSIONS
    // =================================================

    await Session.updateMany(
      {
        user: user._id,
        isActive: true,
      },
      {
        $set: {
          isActive: false,
        },
      }
    );

    // =================================================
    // CREATE NEW SESSION
    // =================================================

    const tokenId = crypto
      .randomBytes(32)
      .toString("hex");

    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    );

    await Session.create({
      user: user._id,

      tokenId,

      deviceInfo,

      ipAddress,

      userAgent,

      createdAt: new Date(),

      lastActiveAt: new Date(),

      expiresAt,

      isActive: true,
    });

    // =================================================
    // UPDATE USER LOGIN INFORMATION
    // =================================================

    user.failedLoginAttempts = 0;

    user.accountLockedUntil = null;

    user.lastLoginAt = new Date();

    user.lastLoginIP = ipAddress;

    user.lastLoginDevice = deviceInfo;

    user.securityAlert = false;

    await user.save();

    // =================================================
    // GET FINAL ROLE
    // =================================================

    const finalRole =
      isAdminAccount
        ? "Administrator"
        : user.role || "Student";

    // =================================================
    // CREATE JWT
    // =================================================

    const token = signToken(
      user._id.toString(),
      tokenId,
      finalRole
    );

    // =================================================
    // RESPONSE
    // =================================================

    return res.json({
      message: "Login successful",

      token,

      user: {
        id: user._id,

        name: user.name,

        email: user.email,

        role: finalRole,

        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (err) {
    console.error("Login error:", err);

    return res.status(500).json({
      message: "Server error",

      error: err.message,
    });
  }
};

// =====================================================
// VERIFY EMAIL
// =====================================================

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        message: "Verification token is missing",
      });
    }

    const user = await User.findOne({
      emailVerificationToken: token,

      emailVerificationExpires: {
        $gt: new Date(),
      },
    });

    if (!user) {
      return res.status(400).json({
        message:
          "Invalid or expired verification token",
      });
    }

    user.isEmailVerified = true;

    user.emailVerificationToken = null;

    user.emailVerificationExpires = null;

    await user.save();

    return res.json({
      message: "Email verified successfully",
    });
  } catch (err) {
    console.error(
      "Email verification error:",
      err
    );

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// =====================================================
// FORGOT PASSWORD
// =====================================================

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      return res.json({
        message:
          "If an account exists with this email, a password reset link has been generated.",
      });
    }

    const resetToken = crypto
      .randomBytes(32)
      .toString("hex");

    user.passwordResetToken = resetToken;

    user.passwordResetExpires = new Date(
      Date.now() + 15 * 60 * 1000
    );

    await user.save();

    return res.json({
      message:
        "If an account exists with this email, a password reset link has been generated.",

      resetToken,
    });
  } catch (err) {
    console.error(
      "Forgot password error:",
      err
    );

    return res.status(500).json({
      message: "Server error",

      error: err.message,
    });
  }
};

// =====================================================
// RESET PASSWORD
// =====================================================

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;

    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        message: "New password is required",
      });
    }

    const passwordError =
      validatePassword(password);

    if (passwordError) {
      return res.status(400).json({
        message: passwordError,
      });
    }

    const user = await User.findOne({
      passwordResetToken: token,

      passwordResetExpires: {
        $gt: new Date(),
      },
    });

    if (!user) {
      return res.status(400).json({
        message:
          "Invalid or expired reset token",
      });
    }

    user.password = password;

    user.passwordChangedAt = new Date();

    user.passwordExpiresAt = new Date(
      Date.now() + 90 * 24 * 60 * 60 * 1000
    );

    user.passwordResetToken = null;

    user.passwordResetExpires = null;

    user.failedLoginAttempts = 0;

    user.accountLockedUntil = null;

    await user.save();

    // Invalidate all existing sessions.
    await Session.updateMany(
      {
        user: user._id,

        isActive: true,
      },
      {
        $set: {
          isActive: false,
        },
      }
    );

    return res.json({
      message: "Password reset successfully",
    });
  } catch (err) {
    console.error(
      "Reset password error:",
      err
    );

    return res.status(500).json({
      message: "Server error",

      error: err.message,
    });
  }
};

// =====================================================
// GET CURRENT USER
// =====================================================

const getMe = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: "No authenticated user",
      });
    }

    const user = await User.findById(
      req.userId
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // =================================================
    // IMPORTANT:
    // Always return the REAL role from MongoDB.
    // =================================================

    return res.json({
      user: {
        id: user._id,

        name: user.name,

        email: user.email,

        role: user.role || "Student",

        isEmailVerified:
          user.isEmailVerified,

        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error(
      "Get current user error:",
      err
    );

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// =====================================================
// DEFAULT ADMIN ACCOUNT
// =====================================================

const createDefaultAdmin = async () => {
  try {
    const normalizedAdminEmail =
      ADMIN_EMAIL.toLowerCase().trim();

    // =================================================
    // FIND ADMIN
    // =================================================

    const admin = await User.findOne({
      email: normalizedAdminEmail,
    });

    // =================================================
    // ADMIN ALREADY EXISTS
    // =================================================

    if (admin) {
      let changed = false;

      if (admin.role !== "Administrator") {
        admin.role = "Administrator";
        changed = true;
      }

      if (!admin.isEmailVerified) {
        admin.isEmailVerified = true;
        changed = true;
      }

      if (!admin.passwordChangedAt) {
        admin.passwordChangedAt = new Date();
        changed = true;
      }

      if (
        !admin.passwordExpiresAt ||
        admin.passwordExpiresAt < new Date()
      ) {
        admin.passwordExpiresAt = new Date(
          Date.now() + 90 * 24 * 60 * 60 * 1000
        );
        changed = true;
      }

      if (changed) {
        await admin.save();

        console.log(
          "Existing account verified/promoted to Administrator."
        );
      }

      return;
    }

    // =================================================
    // CREATE ADMIN
    // =================================================

    await User.create({
      name: "Administrator",

      email: normalizedAdminEmail,

      password: ADMIN_PASSWORD,

      role: "Administrator",

      isEmailVerified: true,

      passwordChangedAt: new Date(),

      passwordExpiresAt: new Date(
        Date.now() + 90 * 24 * 60 * 60 * 1000
      ),
    });

    console.log(
      "Default Administrator account created."
    );
  } catch (error) {
    console.error(
      "Failed to create Administrator account:",
      error
    );
  }
};

// =====================================================
// EXPORT
// =====================================================

module.exports = {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getMe,
  createDefaultAdmin,
};
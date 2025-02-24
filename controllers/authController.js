const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const { signupSchema, signinSchema } = require("../middlewares/validator");
const { hashPassword, validatePassword } = require("../utils/authUtils");

// User signup
exports.signup = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const { error } = signupSchema.validate({ username, email, password });

    if (error) {
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }

    const hashedPassword = await hashPassword(password);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
    });
    await newUser.save();
    res.status(201).json({ success: true, message: "User created" });
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// User signin
exports.signin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const { error } = signinSchema.validate({ email, password });

    if (error) {
      return res
        .status(401)
        .json({ success: false, message: error.details[0].message });
    }

    const existingUser = await User.findOne({ email }).select("+password");
    if (!existingUser) {
      return res
        .status(401)
        .json({ success: false, message: "User does not exist" });
    }

    const isValidPassword = await validatePassword(
      password,
      existingUser.password
    );
    if (!isValidPassword) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid password" });
    }

    const token = jwt.sign(
      {
        userId: existingUser._id,
        email: existingUser.email,
        verified: existingUser.verified,
      },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    res
      .cookie("Authorization", "Bearer " + token, {
        expires: new Date(Date.now() + 86400),
        httpOnly: process.env.NODE_ENV === "production",
        secure: process.env.NODE_ENV === "production",
      })
      .json({ success: true, token, message: "User connected" });
  } catch (error) {
    console.error("Error during signin:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// User signout
exports.signout = async (req, res) => {
  const token = req.cookies.Authorization;

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "User not logged in" });
  }

  res
    .clearCookie("Authorization")
    .status(200)
    .json({ success: true, message: "User disconnected" });
};

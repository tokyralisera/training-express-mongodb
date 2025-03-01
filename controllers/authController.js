const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const {
  signupSchema,
  signinSchema,
  acceptCodeSchema,
} = require("../middlewares/validator");
const {
  hashPassword,
  validatePassword,
  hmacProcess,
} = require("../utils/authUtils");
const transport = require("../middlewares/sendMail");

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

//Account verification
exports.sendVerificationCode = async (req, res) => {
  const { email } = req.body;

  try {
    const existingUser = await User.findOne({
      email,
    });

    if (!existingUser) {
      return res
        .status(404)
        .json({ success: false, message: "User does not exist" });
    }

    if (existingUser.verified) {
      return res
        .status(400)
        .json({ success: false, message: "You are already verified" });
    }

    const codeValue = Math.floor(100000 + Math.random() * 1000000).toString();
    let info = await transport.sendMail({
      from: process.env.NODE_CODE_SENDING_EMAIL_ADRESS,
      to: existingUser.email,
      subject: "Verification Code",
      html: `Your verification code is <b>${codeValue}</b>`,
    });

    if (info.accepted[0] === existingUser.email) {
      const hashedCodeValue = await hmacProcess(
        codeValue,
        process.env.HMAC_VERIFICATION_CODE_SECRET
      );
      existingUser.verificationCode = hashedCodeValue;
      existingUser.verificationCodeValidation = Date.now();
      await existingUser.save();
      return res
        .status(200)
        .json({ success: true, message: "Verification code sent" });
    }

    return res
      .status(400)
      .json({ success: false, message: "Sendig code failed" });
  } catch (error) {
    console.log(error);
  }
};

exports.verifyVerificationCode = async (req, res) => {
  const { email, providedCode } = req.body;

  try {
    const { error } = acceptCodeSchema.validate({ email, providedCode });

    if (error) {
      return res
        .status(401)
        .json({ success: false, message: error.details[0].message });
    }

    const codeValue = providedCode.toString();
    const existingUser = await User.findOne({ email }).select(
      "+verificationCode +verificationCodeValidation"
    );

    if (!existingUser) {
      return res
        .status(404)
        .json({ success: false, message: "User does not exist" });
    }

    if (existingUser.verified) {
      return res
        .status(400)
        .json({ success: false, message: "You are already verified" });
    }

    if (
      !existingUser.verificationCode ||
      !existingUser.verificationCodeValidation
    ) {
      return res.status(400).json({ success: false, message: "No code sent" });
    }

    if (Date.now() - existingUser.verificationCodeValidation > 5 * 60 * 1000) {
      return res.status(400).json({ success: false, message: "Code Expired" });
    }

    const hashedCodeValue = hmacProcess(
      codeValue,
      process.env.HMAC_VERIFICATION_CODE_SECRET
    );

    if (hashedCodeValue === existingUser.verificationCode) {
      existingUser.verified = true;
      existingUser.verificationCode = undefined;
      existingUser.verificationCodeValidation = undefined;
      await existingUser.save();
      return res
        .status(200)
        .json({ success: true, message: "Account verified" });
    }

    return res
      .status(400)
      .json({ success: false, message: "Unexpected error" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

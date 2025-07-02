//NPM Packages
const bcrypt = require("bcryptjs");

//Models
const userModel = require("../models/user");

//Schema
const { signupSchema, loginSchema, editSchema, passwordSchema } = require("../schema/User");

//Utils
const { generateToken } = require("../utils/Methods");

/**
 * @description signup api
 * @route POST api/user/signup
 * @access Public
 */
module.exports.signup = async (req, res) => {
  const payload = req.body;
  console.log("Incoming body:", req.body);

  //Error Handling
  const result = signupSchema(payload);
  if (result.error) {
    const errors = result.error.details
      .map((detail) => detail.message)
      .join(",");
    return res.status(400).json({ msg: errors, status: false });
  }

  try {
    const userExists = await userModel.findOne({ email: payload.email });
    if (userExists) {
      return res
        .status(400)
        .json({ status: false, msg: "User already exists" });
    }

    //Preparing Password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(payload.password, salt);

    //Creating User
    const user = await userModel.create({ ...payload, password: hash });

    //Generate Token
    const token = generateToken(user._id);

    //Response
    return res.status(200).json({
      status: true,
      msg: "Account Created Successfully",
      id: user._id,
      token,
      role: user.role,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ errors: error });
  }
};

/**
 * @description Login api
 * @route POST api/user/login
 * @access Public
 */
module.exports.login = async (req, res) => {
  const payload = req.body; 

  //Error Handling
  const result = loginSchema(payload);
  if (result.error) {
    const errors = result.error.details
      .map((detail) => detail.message)
      .join(",");
    return res.status(400).json({ msg: errors, status: false });
  }
 
  try {
    const user = await userModel.findOne({ email: payload.email });
    if (!user) {
      return res.status(400).json({ status: false, msg: "Invalid email or password" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(payload.password, user.password);
    if (!isMatch) {
      return res.status(400).json({ status: false, msg: "Invalid email or password" });
    }

    // Generate token
    const token = generateToken(user._id);

    // Response
    return res.status(200).json({
      status: true,
      msg: "Login successful",
      id: user._id,
      token,
      role: user.role,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: error });
  }
}

/**
 * @description Get user details
 * @route GET api/user/details
 * @access Private
 */
module.exports.getUserDetails = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ status: false, msg: "User not found" });
    }
    return res.status(200).json({ status: true, user });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: error });
  }
}

/**
 * @description Edit user
 * @route GET api/user/edit
 * @access Private
 */
module.exports.editUser = async (req, res) => {
  const payload = req.body;
  const { _id } = req.user;

  // Error Handling
  const result = editSchema(payload);
  if (result.error) {
    const errors = result.error.details
      .map((detail) => detail.message)
      .join(",");
    return res.status(400).json({ msg: errors, status: false });
  }

  try {
    const user = await userModel.findByIdAndUpdate(
      _id,
      { ...payload },
      { new: true, select: "-password" }
    );

    if (!user) {
      return res.status(404).json({ status: false, msg: "User not found" });
    }

    return res.status(200).json({
      status: true,
      msg: "User updated successfully",
      user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: error });
  }
};

/**
 * @description change user password
 * @route GET api/user/change-password
 * @access Private
 */
module.exports.changePassword = async (req, res) => {
  const { _id } = req.user;
  const payload = req.body;

  //Error Handling
  const result = passwordSchema(payload);
  if (result.error) {
    const errors = result.error.details
      .map((detail) => detail.message)
      .join(",");
    return res.status(400).json({ msg: errors, status: false });
  }

  try {
    //Find User
    const user = await userModel.findById(_id).select("+password");
    if (!user)
      return res.status(404).json({ status: false, msg: "User not found" });

    //Match Password
    const matched = await bcrypt.compare(
      payload.currentPassword,
      user.password
    );
    if (!matched)
      return res
        .status(402)
        .json({ status: false, msg: "Invalid Current Password" });

    //Encrypt New Password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(payload.newPassword, salt);

    //Update Password
    await userModel.updateOne({ _id }, { password: hash });

    //Response
    return res
      .status(200)
      .json({ status: true, msg: "Password Changed Successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ errors: error });
  }
};

/**
 * @description Delete user
 * @route DELETE api/user/delete
 * @access Private
 */
module.exports.deleteUser = async (req, res) => {
  const { _id } = req.user;
  try {
    const user = await userModel.findByIdAndDelete(_id);
    if (!user) {
      return res.status(404).json({ status: false, msg: "User not found" });
    }
    return res.status(200).json({ status: true, msg: "User deleted successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: error });
  }
}
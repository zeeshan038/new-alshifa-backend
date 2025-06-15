const Joi = require("joi");

module.exports.signupSchema = (payload) => {
  const schema = Joi.object({
    username: Joi.string().required().messages({
      "string.base": "Username must be a string.",
      "string.empty": "Username cannot be empty.",
      "any.required": "Username is required.",
    }),
    password: Joi.string().min(8).max(1024).required().messages({
      "string.base": "Password must be a string.",
      "string.empty": "Password cannot be empty.",
      "string.min": "Password must be at least 8 characters long.",
      "string.max": "Password cannot exceed 1024 characters.",
      "any.required": "Password is required.",
    }),
    email: Joi.string().email().max(50).required().messages({
      "string.base": "Email must be a string.",
      "string.empty": "Email cannot be empty.",
      "string.email": "Email must be a valid email address.",
      "string.max": "Email cannot exceed 50 characters.",
      "any.required": "Email is required.",
    }),
    role: Joi.string().valid("admin", "user").default("user").messages({
      "string.base": "Role must be a string.",
      "any.only": "Role must be one of [admin, user].",
    }),
    createdAt: Joi.date().optional(),
  }).messages({
    "object.base": "User data must be an object.",
  });

  const validationResult = schema.validate(payload);
  return validationResult;
};

module.exports.loginSchema = (payload) => {
  const schema = Joi.object({
    email: Joi.string().email().max(50).required().messages({
      "string.base": "Email must be a string.",
      "string.empty": "Email cannot be empty.",
      "string.email": "Email must be a valid email address.",
      "string.max": "Email cannot exceed 50 characters.",
      "any.required": "Email is required.",
    }),
    password: Joi.string().min(8).max(1024).required().messages({
      "string.base": "Password must be a string.",
      "string.empty": "Password cannot be empty.",
      "string.min": "Password must be at least 8 characters long.",
      "string.max": "Password cannot exceed 1024 characters.",
      "any.required": "Password is required.",
    }),
    createdAt: Joi.date().optional(),
  }).messages({
    "object.base": "User data must be an object.",
  });

  const validationResult = schema.validate(payload);
  return validationResult;
};

module.exports.editSchema = (payload) => {
  const schema = Joi.object({
    username: Joi.string().messages({
      "string.base": "Username must be a string.",
      "string.empty": "Username cannot be empty.",
      "any.required": "Username is required.",
    }),
    email: Joi.string().email().max(50).messages({
      "string.base": "Email must be a string.",
      "string.empty": "Email cannot be empty.",
      "string.email": "Email must be a valid email address.",
      "string.max": "Email cannot exceed 50 characters.",
      "any.required": "Email is required.",
    }),

    createdAt: Joi.date().optional(),
  }).messages({
    "object.base": "User data must be an object.",
  });

  const validationResult = schema.validate(payload);
  return validationResult;
};


module.exports.passwordSchema = (payload) => {
  const schema = Joi.object({
    currentPassword: Joi.string().min(8).max(1024).required().messages({
      "string.empty": "Current password is required",
      "string.min":
        "Current password must be at least {#limit} characters long",
      "string.max": "Current password cannot exceed {#limit} characters",
      "any.required": "Current password is required",
    }),
    newPassword: Joi.string().min(8).max(1024).required().messages({
      "string.empty": "New password is required",
      "string.min": "New password must be at least {#limit} characters long",
      "string.max": "New password cannot exceed {#limit} characters",
      "any.required": "New password is required",
    }),
    confirmNewPassword: Joi.string()
      .valid(Joi.ref("newPassword"))
      .required()
      .messages({
        "any.only": "New password and confirm new password must match",
        "any.required": "Confirm new password is required",
      }),
  }).unknown(false);

  const validationResult = schema.validate(payload);
  return validationResult;
};
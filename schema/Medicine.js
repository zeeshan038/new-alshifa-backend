const Joi = require("joi");

module.exports.medicineSchema = (payload) => {
  const schema = Joi.object({
    name: Joi.string().trim().required().messages({
      "string.base": "Medicine name must be a string.",
      "string.empty": "Medicine name cannot be empty.",
      "any.required": "Medicine name is required.",
    }),
    description: Joi.string().required().messages({
      "string.base": "Description must be a string.",
      "string.empty": "Description cannot be empty.",
      "any.required": "Description is required.",
    }),
    brand: Joi.string().required().messages({
      "string.base": "Brand must be a string.",
      "string.empty": "Brand cannot be empty.",
      "any.required": "Brand is required.",
    }),
    price: Joi.number().min(0).required().messages({
      "number.base": "Price must be a number.",
      "number.min": "Price cannot be negative.",
      "any.required": "Price is required.",
    }),
    image: Joi.string().required().messages({
      "string.base": "Image must be a string.",
      "string.empty": "Image cannot be empty.",
      "any.required": "Image is required.",
    }),
    category: Joi.string().required().messages({
      "string.base": "Category must be a string.",
      "string.empty": "Category cannot be empty.",
      "any.required": "Category is required.",
    }),
    manufacturer: Joi.string().required().messages({
      "string.base": "Manufacturer must be a string.",
      "string.empty": "Manufacturer cannot be empty.",
      "any.required": "Manufacturer is required.",
    }),
    createdAt: Joi.date().optional(),
  }).messages({
    "object.base": "Medicine data must be an object.",
  });

  const validationResult = schema.validate(payload);
  return validationResult;
};

module.exports.updateMedSchema = (payload) => {
  const schema = Joi.object({
    name: Joi.string().trim().required().messages({
      "string.base": "Medicine name must be a string.",
      "string.empty": "Medicine name cannot be empty.",
      "any.required": "Medicine name is required.",
    }),
    description: Joi.string().required().messages({
      "string.base": "Description must be a string.",
      "string.empty": "Description cannot be empty.",
      "any.required": "Description is required.",
    }),
    brand: Joi.string().required().messages({
      "string.base": "Brand must be a string.",
      "string.empty": "Brand cannot be empty.",
      "any.required": "Brand is required.",
    }),
    price: Joi.number().min(0).required().messages({
      "number.base": "Price must be a number.",
      "number.min": "Price cannot be negative.",
      "any.required": "Price is required.",
    }),
    image: Joi.string().optional().messages({
      "string.base": "Image must be a string.",
      "string.empty": "Image cannot be empty.",
    }),

    category: Joi.string().required().messages({
      "string.base": "Category must be a string.",
      "string.empty": "Category cannot be empty.",
      "any.required": "Category is required.",
    }),
    manufacturer: Joi.string().required().messages({
      "string.base": "Manufacturer must be a string.",
      "string.empty": "Manufacturer cannot be empty.",
      "any.required": "Manufacturer is required.",
    }),
    createdAt: Joi.date().optional(),
  }).messages({
    "object.base": "Medicine data must be an object.",
  });

  const validationResult = schema.validate(payload);
  return validationResult;
};

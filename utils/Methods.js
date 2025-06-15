const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

module.exports.generateToken = (id) => {
  return jwt.sign({ id }, process.env.SECRET);
};


module.exports.sanitizeFileName = (name) => {
  const parts = name.split(".");
  // Sanitize the filename part (replace invalid characters with underscores)
  const sanitizedFilename = parts[0].replace(/[^a-zA-Z0-9-_.]/g, "_");
  // Reconstruct the sanitized name with the extension (if it exists)
  const sanitizedName =
    parts.length > 1
      ? `${sanitizedFilename}.${parts[parts.length - 1]}`
      : sanitizedFilename;
  return sanitizedName.substring(0, Math.min(sanitizedName.length, 1024));
};

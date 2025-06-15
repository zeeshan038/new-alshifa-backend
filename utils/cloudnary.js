const cloudinary = require("cloudinary").v2;
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const streamifier = require("streamifier");

const uploadFile = async (buffer, filename) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "pharmacy",
        public_id: filename,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary Upload Error:", error);
          reject(new Error("Image upload failed"));
        } else {
          resolve({ url: result.secure_url, status: true });
        }
      }
    );
 
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

module.exports = { uploadFile };

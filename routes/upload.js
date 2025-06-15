const router = require("express").Router();
const sharp = require("sharp");
const multer = require("multer");

// Utils
const { uploadFile } = require("../utils/cloudnary");
const { sanitizeFileName } = require("../utils/Methods");

// Multer Config
const storage = multer.memoryStorage();
const uploadImage = multer({ 
  storage, 
  fileFilter: imageFilter 
});

// Image Filter Function
function imageFilter(req, file, cb) {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Please upload a valid image file."), false);
  }
}

// POST /images
router.post("/image", uploadImage.single("image"), async (req, res) => {
  const file = req.file;
  console.log("Received file:", file);

  if (!file) return res.status(400).json({ error: "No image provided." });

  try {
    const filename = `${Date.now()}_${sanitizeFileName(file.originalname)}`;
    const buffer = file.buffer;

    // Compress the image using sharp
    const compressedImageBuffer = await sharp(buffer)
      .toFormat("jpeg")
      .jpeg({ quality: 80, progressive: true })
      .toBuffer();

    // Upload to Cloudinary (or BackBlaze, depending on your config)
    const response = await uploadFile(compressedImageBuffer, filename);

    if (!response.status) {
      return res.status(500).json({ error: response.error });
    }

    // Send back the URL and any meta
    return res.status(200).json({ 
      message: "Image uploaded successfully",
      url: response.url || response.data?.url, 
      filename 
    });
    
  } catch (err) {
    console.error("Image upload failed:", err);
    return res.status(500).json({ error: "Failed to upload image" });
  }
});

module.exports = router;

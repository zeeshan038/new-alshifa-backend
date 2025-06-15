const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema(
  {
    medicineId: { type: mongoose.Schema.Types.ObjectId, ref: "Medicine" },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch" },
    quantitySold: Number,
    purchasePrice: Number,
    sellingPrice: Number,
    profit: Number,
    category: String,
    brand: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Sale", saleSchema);

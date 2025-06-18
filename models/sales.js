const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema({
  items: [
    {
      medicineId: { type: mongoose.Schema.Types.ObjectId, ref: "Medicine" },
      batchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch" },
      quantitySold: Number,
      purchasePrice: Number,
      sellingPrice: Number,
      profit: Number,
      category: String,
      brand: String,
    }
  ],
  totalProfit: Number,
}, { timestamps: true });

module.exports = mongoose.model("Sale", saleSchema);

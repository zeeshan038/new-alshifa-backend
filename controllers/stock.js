const mongoose = require("mongoose");
const moment = require("moment");

const Batch = require("../models/batch");
const Sale = require("../models/sales");
const Medicine = require("../models/medicine");

/**
 * @description stock availabilty
 * @route GET /api/stock/stocks
 * @access Private
 */
module.exports.getStockAvailability = async (req, res) => {
  try {
    // 1. Get total stock in per medicine
    const stockIn = await Batch.aggregate([
      {
        $group: {
          _id: "$medicineId",
          totalStockIn: { $sum: "$quantity" },
        },
      },
    ]);

    // 2. Get total stock out per medicine
    const stockOut = await Sale.aggregate([
      {
        $lookup: {
          from: "batches",
          localField: "batchId",
          foreignField: "_id",
          as: "batch",
        },
      },
      { $unwind: "$batch" },
      {
        $group: {
          _id: "$batch.medicineId",
          totalStockOut: { $sum: "$quantitySold" },
        },
      },
    ]);

    // 3. Merge stockIn and stockOut into a stockMap
    const stockMap = {};

    stockIn.forEach((item) => {
      stockMap[item._id.toString()] = {
        medicineId: item._id,
        stockIn: item.totalStockIn,
        stockOut: 0,
        availableStock: item.totalStockIn,
      };
    });

    stockOut.forEach((item) => {
      const key = item._id.toString();
      if (!stockMap[key]) {
        stockMap[key] = {
          medicineId: item._id,
          stockIn: 0,
          stockOut: item.totalStockOut,
          availableStock: 0 - item.totalStockOut,
        };
      } else {
        stockMap[key].stockOut = item.totalStockOut;
        stockMap[key].availableStock =
          stockMap[key].stockIn - item.totalStockOut;
      }
    });

    const stockArray = Object.values(stockMap);

    // 4. Get medicine names and categories using lookup
    const medicineIds = stockArray.map(
      (item) => new mongoose.Types.ObjectId(item.medicineId)
    );

    const medicines = await Medicine.aggregate([
      {
        $match: { _id: { $in: medicineIds } },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          category: 1,
        },
      },
    ]);

    const medicineMap = {};
    medicines.forEach((med) => {
      medicineMap[med._id.toString()] = {
        name: med.name,
        category: med.category,
      };
    });

    // 5. Attach name and category
    const finalResult = stockArray.map((item) => ({
      medicineId: item.medicineId,
      name: medicineMap[item.medicineId.toString()]?.name || "Unknown",
      category: medicineMap[item.medicineId.toString()]?.category || "Unknown",
      stockIn: item.stockIn,
      stockOut: item.stockOut,
      availableStock: item.availableStock,
    }));

    res.status(200).json(finalResult);
  } catch (err) {
    console.error("Error fetching stock availability:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

/**
 * @description stock summmary
 * @route GET /api/stock/stock-summmary
 * @access Private
 */
module.exports.getStockSummary = async (req, res) => {
  try {
    const today = new Date();
    const next30Days = moment().add(30, "days").toDate();

    // 1. Total stock in (from all batches)
    const stockInAgg = await Batch.aggregate([
      {
        $group: {
          _id: null,
          totalStockIn: { $sum: "$quantity" },
        },
      },
    ]);
    const totalStockIn = stockInAgg[0]?.totalStockIn || 0;

    // 2. Total stock out (from all sales)
    const stockOutAgg = await Sale.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: null,
          totalStockOut: { $sum: "$items.quantitySold" },
        },
      },
    ]);
    const totalStockOut = stockOutAgg[0]?.totalStockOut || 0;

    // 3. Total available = in - out
    const totalAvailableStock = totalStockIn - totalStockOut;

    // 4. Total short expiry (within next 30 days)
    const shortExpiryAgg = await Batch.aggregate([
      {
        $match: {
          expiryDate: { $gte: today, $lte: next30Days },
        },
      },
      {
        $group: {
          _id: null,
          totalShortExpiry: { $sum: "$quantity" },
        },
      },
    ]);
    const totalShortExpiry = shortExpiryAgg[0]?.totalShortExpiry || 0;

    // 5. Total expired
    const expiredAgg = await Batch.aggregate([
      {
        $match: {
          expiryDate: { $lt: today },
        },
      },
      {
        $group: {
          _id: null,
          totalExpired: { $sum: "$quantity" },
        },
      },
    ]);
    const totalExpired = expiredAgg[0]?.totalExpired || 0;

    // 6. Response
    res.status(200).json({
      totalStocks: totalStockIn, // alias
      totalStockIn,
      totalStockOut,
      totalAvailableStock,
      totalShortExpiry,
      totalExpired,
    });
  } catch (err) {
    console.error("Error fetching stock summary:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

/**
 * @description short expirey
 * @route GET /api/stock/short-expirey
 * @access Private
 */
module.exports.getShortExpiryMedicines = async (req, res) => {
  try {
    const today = new Date();
    const next30Days = moment().add(30, "days").toDate();

    // Search and pagination parameters
    const { name, category } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Step 1: Find batches expiring in the next 30 days
    const expiringBatches = await Batch.aggregate([
      {
        $match: {
          expiryDate: { $gte: today, $lte: next30Days },
        },
      },
      {
        $group: {
          _id: "$medicineId",
          earliestExpiry: { $min: "$expiryDate" },
          totalQuantity: { $sum: "$quantity" },
        },
      },
    ]);

    if (expiringBatches.length === 0) {
      return res.status(200).json({
        status: true,
        msg: "No medicines found with short expiry",
        medicines: [],
        page,
        totalPages: 0,
        total: 0,
      });
    }

    const medicineIds = expiringBatches.map((b) => b._id);

    // Step 2: Get medicine details for all expiring batches
    const medicines = await Medicine.find({ _id: { $in: medicineIds } }).select("name category");

    const medicineMap = {};
    medicines.forEach((med) => {
      medicineMap[med._id.toString()] = {
        name: med.name,
        category: med.category,
      };
    });

    // Step 3: Combine batch + medicine info, then filter by search
    let result = expiringBatches.map((batch) => ({
      medicineId: batch._id,
      name: medicineMap[batch._id.toString()]?.name || "Unknown",
      category: medicineMap[batch._id.toString()]?.category || "Unknown",
      earliestExpiry: batch.earliestExpiry,
      totalQuantity: batch.totalQuantity,
    }));

    // Apply search filters
    if (name) {
      result = result.filter((item) =>
        item.name.toLowerCase().includes(name.toLowerCase())
      );
    }
    if (category) {
      result = result.filter((item) =>
        item.category.toLowerCase().includes(category.toLowerCase())
      );
    }

    // Sort by earliestExpiry ascending (soonest expiry first)
    result.sort((a, b) => new Date(a.earliestExpiry) - new Date(b.earliestExpiry));

    const total = result.length;
    const paginatedResult = result.slice(skip, skip + limit);

    res.status(200).json({
      status: true,
      msg: "Medicines with short expiry",
      medicines: paginatedResult,
      page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (err) { 
      console.error("Error fetching short expiry medicines:", err);
    res
      .status(500)
      .json({ status: false, msg: "Server error", error: err.message });
  }

}

/**
 * @description expired items
 * @route GET /api/stock/expired-items
 * @access Private
 */
module.exports.getExpiredItems = async (req, res) => {
  try {
    const today = new Date();

    // Search parameters
    const { name, category } = req.query;

    // 1. Get expired batches
    const expiredBatches = await Batch.aggregate([
      {
        $match: {
          expiryDate: { $lt: today },
        },
      },
      {
        $group: {
          _id: "$medicineId",
          earliestExpiry: { $min: "$expiryDate" },
          totalQuantity: { $sum: "$quantity" },
        },
      },
    ]);

    if (expiredBatches.length === 0) {
      return res.status(200).json({
        status: true,
        msg: "No medicines found with expired medicine",
        medicines: [],
      });
    }
    const medicineIds = expiredBatches.map((b) => b._id);

    // 2. Get medicine details
    const medicines = await Medicine.find({ _id: { $in: medicineIds } }).select("name category");

    const medicineMap = {};
    medicines.forEach((med) => {
      medicineMap[med._id.toString()] = {
        name: med.name,
        category: med.category,
      };
    });

    // 3. Merge data
    let result = expiredBatches.map((batch) => ({
      medicineId: batch._id,
      name: medicineMap[batch._id.toString()]?.name || "Unknown",
      category: medicineMap[batch._id.toString()]?.category || "Unknown",
      earliestExpiry: batch.earliestExpiry,
      totalQuantity: batch.totalQuantity,
    }));

    // Apply search filters
    if (name) {
      result = result.filter((item) =>
        item.name.toLowerCase().includes(name.toLowerCase())
      );
    }
    if (category) {
      result = result.filter((item) =>
        item.category.toLowerCase().includes(category.toLowerCase())
      );
    }

    result.sort((a, b) => new Date(b.earliestExpiry) - new Date(a.earliestExpiry));

    res.status(200).json({
      status: true,
      msg: "Medicines with expired batches",
      medicines: result,
    });
  } catch (err) {
    console.error("Error fetching expired items:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

module.exports.getDailyStockMovements = async (req, res) => {
  try {
    const startOfDay = moment().startOf("day").toDate();
    const endOfDay = moment().endOf("day").toDate();

    // 1. Get today's stock-in
    const stockIn = await Batch.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: "$medicineId",
          totalStockIn: { $sum: "$quantity" },
        },
      },
    ]);

    // 2. Get today's stock-out
    const stockOut = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      {
        $lookup: {
          from: "batches",
          localField: "batchId",
          foreignField: "_id",
          as: "batch",
        },
      },
      { $unwind: "$batch" },
      {
        $group: {
          _id: "$batch.medicineId",
          totalStockOut: { $sum: "$quantitySold" },
        },
      },
    ]);

    // 3. Combine stock in and out
    const movementMap = {};

    stockIn.forEach((item) => {
      movementMap[item._id.toString()] = {
        medicineId: item._id,
        stockIn: item.totalStockIn,
        stockOut: 0,
      };
    });

    stockOut.forEach((item) => {
      const key = item._id.toString();
      if (!movementMap[key]) {
        movementMap[key] = {
          medicineId: item._id,
          stockIn: 0,
          stockOut: item.totalStockOut,
        };
      } else {
        movementMap[key].stockOut = item.totalStockOut;
      }
    });

    const medicineIds = Object.keys(movementMap).map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const medicines = await Medicine.find({
      _id: { $in: medicineIds },
    }).select("name category");

    const medicineMap = {};
    medicines.forEach((m) => {
      medicineMap[m._id.toString()] = {
        name: m.name,
        category: m.category,
      };
    });

    const finalResult = Object.values(movementMap).map((entry) => ({
      medicineId: entry.medicineId,
      name: medicineMap[entry.medicineId.toString()]?.name || "Unknown",
      category: medicineMap[entry.medicineId.toString()]?.category || "Unknown",
      stockIn: entry.stockIn,
      stockOut: entry.stockOut,
    }));

    res.status(200).json({
      date: moment().format("YYYY-MM-DD"),
      data: finalResult,
    });
  } catch (err) {
    console.error("Error fetching daily stock movements:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

/**
 * @description Get total stock value (purchase price)
 * @route GET /api/stock/total-value
 * @access Private
 */
module.exports.getTotalStockValue = async (req, res) => {
  try {
    // Calculate total stock value based on batch purchase prices
    const stockValueAgg = await Batch.aggregate([
      {
        $match: {
          quantity: { $gt: 0 } // Only consider batches with remaining stock
        }
      },
      {
        $group: {
          _id: null,
          totalValue: { 
            $sum: { $multiply: ["$pricePerUnit", "$quantity"] } 
          },
          totalItems: { $sum: "$quantity" }
        }
      }
    ]);

    const totalValue = stockValueAgg[0]?.totalValue || 0;
    const totalItems = stockValueAgg[0]?.totalItems || 0;

    // Get category-wise breakdown
    const categoryValueAgg = await Batch.aggregate([
      {
        $match: {
          quantity: { $gt: 0 }
        }
      },
      {
        $lookup: {
          from: "medicines",
          localField: "medicineId",
          foreignField: "_id",
          as: "medicine"
        }
      },
      { $unwind: "$medicine" },
      {
        $group: {
          _id: "$medicine.category",
          value: { $sum: { $multiply: ["$pricePerUnit", "$quantity"] } },
          items: { $sum: "$quantity" }
        }
      },
      { $sort: { value: -1 } }
    ]);

    res.status(200).json({
      status: true,
      totalStockValue: totalValue,
      totalItems: totalItems,
      categoryBreakdown: categoryValueAgg.map(cat => ({
        category: cat._id || "Uncategorized",
        value: cat.value,
        items: cat.items
      }))
    });
  } catch (err) {
    console.error("Error calculating total stock value:", err);
    res.status(500).json({ 
      status: false, 
      msg: "Server error", 
      error: err.message 
    });
  }
};


/**
 * @description Get total stock value (purchase price)
 * @route GET /api/stock/stocks-value
 * @access Private
 */
/**
 * @description Get total stock value (purchase price)
 * @route GET /api/stock/available-value
 * @access Private
 */
/**
 * @description Get available stock value
 * @route GET /api/stock/available-value
 * @access Private
 */
/**
 * @description Get available stock value
 * @route GET /api/stock/available-value
 * @access Private
 */
/**
 * @description Get available stock value
 * @route GET /api/stock/available-value
 * @access Private
 */
module.exports.getAvailableStockValue = async (req, res) => {
  try {
    // 1. Total stock in (from all batches) with value
    const stockInAgg = await Batch.aggregate([
      {
        $group: {
          _id: null,
          totalStockIn: { $sum: "$quantity" },
          totalPurchaseValue: { $sum: { $multiply: ["$pricePerUnit", "$quantity"] } }
        }
      }
    ]);
    
    const totalStockIn = stockInAgg[0]?.totalStockIn || 0;
    const totalPurchaseValue = Math.floor(stockInAgg[0]?.totalPurchaseValue || 0);

    // 2. Total stock out (from all sales)
    const stockOutAgg = await Sale.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: null,
          totalStockOut: { $sum: "$items.quantitySold" }
        }
      }
    ]);
    
    const totalStockOut = stockOutAgg[0]?.totalStockOut || 0;

    // 3. Total available = in - out
    const totalAvailableStock = totalStockIn - totalStockOut;
    
    // 4. Calculate available stock value (proportional to total stock)
    const availableRatio = totalStockIn > 0 ? totalAvailableStock / totalStockIn : 0;
    const availablePurchaseValue = Math.floor(totalPurchaseValue * availableRatio);

    // 5. Get category breakdown
    const categoryAgg = await Batch.aggregate([
      {
        $lookup: {
          from: "medicines",
          localField: "medicineId",
          foreignField: "_id",
          as: "medicine"
        }
      },
      { $unwind: "$medicine" },
      {
        $group: {
          _id: "$medicine.category",
          totalQuantity: { $sum: "$quantity" },
          totalValue: { $sum: { $multiply: ["$pricePerUnit", "$quantity"] } }
        }
      },
      { $sort: { totalValue: -1 } }
    ]);

    const categoryBreakdown = categoryAgg.map(cat => ({
      category: cat._id || "Uncategorized",
      totalQuantity: Math.floor(cat.totalQuantity),
      availableQuantity: Math.floor(cat.totalQuantity * availableRatio),
      totalValue: Math.floor(cat.totalValue),
      availableValue: Math.floor(cat.totalValue * availableRatio)
    }));

    res.status(200).json({
      status: true,
      totalStockIn,
      totalStockOut,
      totalAvailableStock,
      totalPurchaseValue,
      availablePurchaseValue,
      categoryBreakdown
    });
  } catch (err) {
    console.error("Error calculating available stock value:", err);
    res.status(500).json({ 
      status: false, 
      msg: "Server error", 
      error: err.message 
    });
  }
};
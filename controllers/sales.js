const moment = require("moment");
const moment2 = require("moment-timezone");

//Models
const batch = require("../models/batch");
const medicine = require("../models/medicine");
const sales = require("../models/sales");

/**
 * @description SelllMed
 * @route PUT api/medicine/sell-med/:id
 * @access Private
 */
module.exports.sellMed = async (req, res) => {
  const { medicineId, quantity, sellingPrice } = req.body;

  try {
    const med = await medicine.findById(medicineId);
    if (!med) {
      return res.status(404).json({ msg: "Medicine not found." });
    }

    let qtyToSell = quantity;
    let totalProfit = 0;

    const batches = await batch
      .find({
        medicineId,
        quantity: { $gt: 0 },
      })
      .sort({ expiryDate: 1 });

    for (let batch of batches) {
      if (qtyToSell <= 0) break;

      const sellQty = Math.min(batch.quantity, qtyToSell);
      const profit = (sellingPrice - batch.purchasePrice) * sellQty;

      // Reduce batch quantity
      batch.quantity -= sellQty;
      await batch.save();

      // Save sale record
      await sales.create({
        medicineId,
        batchId: batch._id,
        quantitySold: sellQty,
        purchasePrice: batch.purchasePrice,
        sellingPrice,
        profit,
        category: med.category,
        brand: med.brand,
      });

      totalProfit += profit;
      qtyToSell -= sellQty;
    }

    if (qtyToSell > 0) {
      return res
        .status(400)
        .json({ msg: "Not enough stock to fulfill the sale." });
    }

    return res.status(200).json({
      msg: "Medicine Sold Sucessfully",
      totalProfit,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: err.message });
  }
};

/**
 * @description record
 * @route GET api/sale/record
 * @access Private
 */
module.exports.getProfitSummary = async (req, res) => {
  try {
    const now = moment();
    const todayStart = now.clone().startOf("day").toDate();
    const todayEnd = now.clone().endOf("day").toDate();
    const monthStart = now.clone().startOf("month").toDate();
    const monthEnd = now.clone().endOf("month").toDate();

    const getSummary = async (start, end) => {
      const result = await sales.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: null,
            totalProfit: {
              $sum: {
                $cond: [{ $gt: ["$profit", 0] }, "$profit", 0],
              },
            },
            totalLoss: {
              $sum: {
                $cond: [{ $lt: ["$profit", 0] }, "$profit", 0],
              },
            },
          },
        },
      ]);

      return result[0] || { totalProfit: 0, totalLoss: 0 };
    };

    const today = await getSummary(todayStart, todayEnd);
    const month = await getSummary(monthStart, monthEnd);
    const overall = await getSummary(new Date(0), new Date()); // all time

    return res.status(200).json({
      todayProfit: today.totalProfit,
      todayLoss: Math.abs(today.totalLoss),
      monthlyProfit: month.totalProfit,
      monthlyLoss: Math.abs(month.totalLoss),
      overallProfit: overall.totalProfit,
      overallLoss: Math.abs(overall.totalLoss),
    });
  } catch (err) {
    console.error("Error getting profit/loss summary:", err);
    res.status(500).json({ msg: err.message });
  }
};
module.exports.getProfitSummary = async (req, res) => {
  try {
    const now = moment();
    const todayStart = now.clone().startOf("day").toDate();
    const todayEnd = now.clone().endOf("day").toDate();
    const monthStart = now.clone().startOf("month").toDate();
    const monthEnd = now.clone().endOf("month").toDate();

    const getSummary = async (start, end) => {
      const result = await sales.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: null,
            totalProfit: {
              $sum: {
                $cond: [{ $gt: ["$profit", 0] }, "$profit", 0],
              },
            },
            totalLoss: {
              $sum: {
                $cond: [{ $lt: ["$profit", 0] }, "$profit", 0],
              },
            },
          },
        },
      ]);

      return result[0] || { totalProfit: 0, totalLoss: 0 };
    };

    const today = await getSummary(todayStart, todayEnd);
    const month = await getSummary(monthStart, monthEnd);
    const overall = await getSummary(new Date(0), new Date()); // all time

    return res.status(200).json({
      todayProfit: today.totalProfit,
      todayLoss: Math.abs(today.totalLoss),
      monthlyProfit: month.totalProfit,
      monthlyLoss: Math.abs(month.totalLoss),
      overallProfit: overall.totalProfit,
      overallLoss: Math.abs(overall.totalLoss),
    });
  } catch (err) {
    console.error("Error getting profit/loss summary:", err);
    res.status(500).json({ msg: err.message });
  }
};

/**
 * @description record by month
 * @route GET api/sale/record-by-month
 * @access Private
 */
module.exports.getProfitByMonth = async (req, res) => {
  const { month, year } = req.query;

  try {
    if (!month || !year) {
      return res.status(400).json({ msg: "Month and year are required" });
    }

    const start = moment()
      .year(year)
      .month(month - 1)
      .startOf("month")
      .toDate();
    const end = moment()
      .year(year)
      .month(month - 1)
      .endOf("month")
      .toDate();

    const result = await sales.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          totalProfit: {
            $sum: {
              $cond: [{ $gt: ["$profit", 0] }, "$profit", 0],
            },
          },
          totalLoss: {
            $sum: {
              $cond: [{ $lt: ["$profit", 0] }, "$profit", 0],
            },
          },
        },
      },
    ]);

    const summary = result[0] || { totalProfit: 0, totalLoss: 0 };

    return res.status(200).json({
      month: moment(start).format("MMMM"),
      year,
      profit: summary.totalProfit,
      loss: Math.abs(summary.totalLoss),
    });
  } catch (err) {
    console.error("Error fetching monthly profit/loss:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

/**
 * @description Get today's profit grouped by hour
 * @route GET /api/sale/profit-by-hour
 * @access Private
 */
module.exports.getProfitByHour = async (req, res) => {
  try {
    const startOfDay = moment2().tz("Asia/Karachi").startOf("day").toDate();
    const endOfDay = moment2().tz("Asia/Karachi").endOf("day").toDate();

    const hourlyProfit = await sales.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startOfDay,
            $lte: endOfDay,
          },
        },
      },
      {
        $addFields: {
          pktHour: {
            $hour: {
              date: "$createdAt",
              timezone: "Asia/Karachi",
            },
          },
        },
      },
      {
        $group: {
          _id: "$pktHour",
          totalProfit: { $sum: "$profit" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const formatted = hourlyProfit.map((entry) => ({
      hour: `${entry._id}:00`,
      profit: entry.totalProfit,
    }));

    res.status(200).json({
      date: moment().tz("Asia/Karachi").format("YYYY-MM-DD"),
      data: formatted,
    });
  } catch (err) {
    console.error("Error fetching hourly profit:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

module.exports.totalSales = async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Search parameters
    const { batchNumber, category, brand, name } = req.query;
    const query = {};

    if (category) query.category = { $regex: category, $options: "i" };
    if (brand) query.brand = { $regex: brand, $options: "i" };

    // Find sales, populate batchId and medicineId
    let salesResult = await sales
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("batchId", "batchNumber")
      .populate("medicineId", "name");

    // Filter by batchNumber if provided
    if (batchNumber) {
      salesResult = salesResult.filter(
        (sale) =>
          sale.batchId &&
          sale.batchId.batchNumber &&
          sale.batchId.batchNumber
            .toLowerCase()
            .includes(batchNumber.toLowerCase())
      );
    }

    // Filter by medicine name if provided
    if (name) {
      salesResult = salesResult.filter(
        (sale) =>
          sale.medicineId &&
          sale.medicineId.name &&
          sale.medicineId.name
            .toLowerCase()
            .includes(name.toLowerCase())
      );
    }

    const total = await sales.countDocuments(query);

    return res.status(200).json({
      status: true,
      sales: salesResult,
      page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      msg: error.message,
    });
  }
};

module.exports.totalSalesNo = async (req, res) => {
  try {
    const totalSalesNo = await sales.countDocuments({});
    return res.status(200).json({
      status: true,
      totalSalesNo,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      msg: error.message,
    });
  }
};

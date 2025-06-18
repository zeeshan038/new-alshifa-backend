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
  const { medicines } = req.body;

  if (!Array.isArray(medicines) || medicines.length === 0) {
    return res.status(400).json({ msg: "No medicines provided." });
  }

  try {
    let totalProfit = 0;
    const items = [];

    for (let item of medicines) {
      const { medicineId, quantity, sellingPrice } = item;

      const med = await medicine.findById(medicineId);
      if (!med) {
        return res.status(404).json({ msg: `Medicine not found: ${medicineId}` });
      }

      let qtyToSell = quantity;

      const batches = await batch.find({
        medicineId,
        quantity: { $gt: 0 },
      }).sort({ expiryDate: 1 });

      for (let batchItem of batches) {
        if (qtyToSell <= 0) break;

        const sellQty = Math.min(batchItem.quantity, qtyToSell);

        // ✅ Use stored pricePerUnit directly
        const unitPurchasePrice = batchItem.pricePerUnit || 0;
        const rawProfit = (sellingPrice - unitPurchasePrice) * sellQty;
        const profit = isNaN(rawProfit) ? 0 : rawProfit;

        // Update batch quantity
        batchItem.quantity -= sellQty;
        await batchItem.save();

        // Add to sold items
        items.push({
          medicineId,
          batchId: batchItem._id,
          quantitySold: sellQty,
          purchasePrice: unitPurchasePrice,
          sellingPrice,
          profit,
          category: med.category,
          brand: med.brand,
        });

        totalProfit += profit;
        qtyToSell -= sellQty;
      }

      if (qtyToSell > 0) {
        return res.status(400).json({ msg: `Not enough stock for ${med.name}` });
      }
    }

    totalProfit = isNaN(totalProfit) ? 0 : totalProfit;

    const saleDoc = await sales.create({
      items,
      totalProfit,
    });

    return res.status(200).json({
      msg: "All medicines sold successfully.",
      totalProfit,
      sale: saleDoc,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Server error", error: err.message });
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
        {
          $match: {
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: null,
            totalProfit: {
              $sum: {
                $cond: [
                  { $gt: ["$totalProfit", 0] },
                  "$totalProfit",
                  0
                ]
              }
            },
            totalLoss: {
              $sum: {
                $cond: [
                  { $lt: ["$totalProfit", 0] },
                  "$totalProfit",
                  0
                ]
              }
            }
          }
        }
      ]);

      return result[0] || { totalProfit: 0, totalLoss: 0 };
    };

    const today = await getSummary(todayStart, todayEnd);
    const month = await getSummary(monthStart, monthEnd);
    const overall = await getSummary(new Date(0), new Date());

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
      .year(Number(year))
      .month(Number(month) - 1)
      .startOf("month")
      .toDate();

    const end = moment()
      .year(Number(year))
      .month(Number(month) - 1)
      .endOf("month")
      .toDate();

    const result = await sales.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          totalProfit: {
            $sum: {
              $cond: [{ $gt: ["$totalProfit", 0] }, "$totalProfit", 0],
            },
          },
          totalLoss: {
            $sum: {
              $cond: [{ $lt: ["$totalProfit", 0] }, "$totalProfit", 0],
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
    const startOfDay = moment().tz("Asia/Karachi").startOf("day").toDate();
    const endOfDay = moment().tz("Asia/Karachi").endOf("day").toDate();

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
        $unwind: "$items",
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
          totalProfit: {
            $sum: {
              $cond: [
                { $gt: ["$items.profit", 0] },
                "$items.profit",
                0,
              ],
            },
          },
          totalLoss: {
            $sum: {
              $cond: [
                { $lt: ["$items.profit", 0] },
                "$items.profit",
                0,
              ],
            },
          },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const formatted = hourlyProfit.map((entry) => ({
      hour: `${entry._id}:00`,
      profit: entry.totalProfit,
      loss: Math.abs(entry.totalLoss),
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { batchNumber, category, brand, name, type } = req.query;

    const today = moment().startOf("day");
    const endOfToday = moment().endOf("day");

    const matchStage = {};

    // Filter by time range
    if (type === "daily") {
      matchStage.createdAt = { $gte: today.toDate(), $lte: endOfToday.toDate() };
    } else if (type === "monthly") {
      matchStage.createdAt = {
        $gte: moment().startOf("month").toDate(),
        $lte: moment().endOf("month").toDate(),
      };
    }

    const pipeline = [
      { $match: matchStage },
      { $unwind: "$items" },

      // Optional filters inside items
      {
        $lookup: {
          from: "medicines",
          localField: "items.medicineId",
          foreignField: "_id",
          as: "medicineInfo",
        },
      },
      { $unwind: "$medicineInfo" },

      {
        $lookup: {
          from: "batches",
          localField: "items.batchId",
          foreignField: "_id",
          as: "batchInfo",
        },
      },
      { $unwind: "$batchInfo" },

      {
        $match: {
          ...(category && { "items.category": { $regex: category, $options: "i" } }),
          ...(brand && { "items.brand": { $regex: brand, $options: "i" } }),
          ...(name && { "medicineInfo.name": { $regex: name, $options: "i" } }),
          ...(batchNumber && {
            "batchInfo.batchNumber": { $regex: batchNumber, $options: "i" },
          }),
        },
      },

      {
        $project: {
          _id: 1,
          createdAt: 1,
          "item": "$items",
          medicine: "$medicineInfo.name",
          batchNumber: "$batchInfo.batchNumber",
        },
      },

      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const salesResult = await sales.aggregate(pipeline);

    return res.status(200).json({
      status: true,
      sales: salesResult,
      currentPage: page,
      pageSize: limit,
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

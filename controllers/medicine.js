const mongoose = require("mongoose");
//Model
const medicine = require("../models/medicine");
const Batch = require("../models/batch");

//Schema
const { medicineSchema, updateMedSchema } = require("../schema/Medicine");
const batch = require("../models/batch");

/**
 * @description Add medicine
 * @route POST api/medicine/add
 * @access Private
 */
module.exports.addMedicine = async (req, res) => {
  console.log("Incoming body:", req.body);
  const {
    name,
    description,
    brand,
    price,
    image,
    category,
    manufacturer,
    batchNumber,
    purchasePrice,
    quantity,
    expiryDate,
  } = req.body;

  try {
    // Check if medicine exists
    let med = await medicine.findOne({ name, brand });

    // If medicine doesn't exist, create it
    if (!med) {
      med = await medicine.create({
        name,
        description,
        brand,
        price,
        image,
        category,
        manufacturer,
      });
    }

    // Check if batch exists
    let existingBatch = await Batch.findOne({
      medicineId: med._id,
      batchNumber,
      purchasePrice,
      expiryDate,
    });

    if (existingBatch) {
      existingBatch.quantity += quantity;
      // Recalculate pricePerUnit if needed (optional)
      existingBatch.pricePerUnit = existingBatch.purchasePrice / existingBatch.quantity;
      await existingBatch.save();
    } else {
      const pricePerUnit = purchasePrice / quantity;

      await Batch.create({
        medicineId: med._id,
        batchNumber,
        purchasePrice,
        quantity,
        expiryDate,
        pricePerUnit,
      });
    }

    return res.status(200).json({
      status: true,
      msg: "Medicine and batch added/updated successfully",
      medicine: med,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: false, msg: err.message });
  }
};

/**
 * @description Get all medicines
 * @route GET api/medicine/all
 * @access Private
 */
module.exports.getAllMedicines = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { name, brand, category, description } = req.query;
    const query = {};

    if (name) query.name = { $regex: name, $options: "i" };
    if (brand) query.brand = { $regex: brand, $options: "i" };
    if (category) query.category = { $regex: category, $options: "i" };
    if (description) query.description = { $regex: description, $options: "i" };

    const total = await medicine.countDocuments(query);

    const medicines = await medicine.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

    // Get batches for each medicine
    const updatedMedicines = await Promise.all(
      medicines.map(async (med) => {
        const batches = await Batch.find({ medicineId: med._id }).lean();
        const totalQuantity = batches.reduce((acc, batch) => acc + batch.quantity, 0);
        return {
          ...med,
           quantity : totalQuantity,
        };
      })
    );

    return res.status(200).json({
      status: true,
      medicines: updatedMedicines,
      page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error("Error in getAllMedicines:", error);
    return res.status(500).json({ msg: error.message });
  }
};

/**
 * @description Get medicine by ID
 * @route GET api/medicine/edit-med/:id
 * @access Private
 */
module.exports.getMedicineById = async (req, res) => {
  const { id } = req.params;

  try {
    const medicineItem = await medicine.findById(id);
    if (!medicineItem) {
      return res.status(404).json({ status: false, msg: "Medicine not found" });
    }

    const batches = await Batch.find({ medicineId: id }).sort({
      expiryDate: 1,
    });

    return res.status(200).json({
      status: true,
      medicine: medicineItem,
      batches,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: error.message });
  }
};

/**
 * @description Edit medicine
 * @route PUT api/medicine/edit/:id
 * @access Private
 */
module.exports.editMedicine = async (req, res) => {
  const { id } = req.params;
  const payload = req.body;

  // Error Handling
  const result = updateMedSchema(payload);
  if (result.error) {
    const errors = result.error.details
      .map((detail) => detail.message)
      .join(",");
    return res.status(400).json({ msg: errors, status: false });
  }

  try {
    const medicineItem = await medicine.findByIdAndUpdate(id, payload, {
      new: true,
    });
    if (!medicineItem) {
      return res.status(404).json({ status: false, msg: "Medicine not found" });
    }
    return res.status(200).json({
      status: true,
      msg: "Medicine updated successfully",
      medicine: medicineItem,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: error.message });
  }
};

/**
 * @description Delete medicine
 * @route PUT api/medicine/delete-med/:id
 * @access Private
 */
module.exports.deleteMed = async (req, res) => {
  const { id } = req.params;
  try {
    const med = await medicine.findByIdAndDelete(id);

    if (!med) {
      return res.status(404).json({
        status: false,
        msg: "Medicine not found",
      });
    }

    await batch.deleteMany({ medicineId: id });

    return res.status(200).json({
      status: true,
      msg: "Medicine and its batches deleted successfully",
      medicine: med,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: error.message });
  }
};

/**
 * @description update
 * @route PUT api/medicine/update-batch/:id
 * @access Private
 */
module.exports.updateBatch = async (req, res) => {
  const { id } = req.params;
  const { batchNumber, purchasePrice, quantity, expiryDate } = req.body;
  try {
    const updatedBatch = await Batch.findByIdAndUpdate(
      id,
      {
        batchNumber,
        purchasePrice,
        quantity,
        expiryDate,
      },
      { new: true }
    );

    if (!updatedBatch) {
      return res.status(404).json({
        status: false,
        msg: "Batch not found",
      });
    }

    return res.status(200).json({
      status: true,
      msg: "Batch updated successfully",
      batch: updatedBatch,
    });
  } catch (error) {
    console.error("Error updating batch:", error);
    return res.status(500).json({ status: false, msg: error.message });
  }
}
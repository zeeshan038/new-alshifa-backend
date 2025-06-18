//NPM Packages
const router = require('express').Router();

const { addMedicine, getAllMedicines, getMedicineById, editMedicine, deleteMed, updateBatch, getMedicineInvenById } = require('../controllers/medicine');

router.post('/create' ,addMedicine);
router.get("/get-all-med" , getAllMedicines);
router.get("/get-med/:id" , getMedicineById);
router.get("/get-med-inven/:id" , getMedicineInvenById);
router.put("/edit-med/:id" , editMedicine);
router.put("/edit-batch/:id" , updateBatch);
router.delete("/delete-med/:id" , deleteMed);



module.exports = router;
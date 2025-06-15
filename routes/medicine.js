//NPM Packages
const router = require('express').Router();

const { addMedicine, getAllMedicines, getMedicineById, editMedicine, deleteMed, updateBatch } = require('../controllers/medicine');

router.post('/create' ,addMedicine);
router.get("/get-all-med" , getAllMedicines);
router.get("/get-med/:id" , getMedicineById);
router.put("/edit-med/:id" , editMedicine);
router.put("/edit-batch/:id" , updateBatch);
router.delete("/delete-med/:id" , deleteMed);


module.exports = router;
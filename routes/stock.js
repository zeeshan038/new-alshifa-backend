//NPM Packages
const router = require('express').Router();

//Controller
const { getStockAvailability, getStockSummary, getShortExpiryMedicines, getExpiredItems, getDailyStockMovements } = require('../controllers/stock');


router.get("/stocks", getStockAvailability);
router.get("/summary" , getStockSummary);
router.get('/short-expirey' ,getShortExpiryMedicines);
router.get('/expired-med' ,getExpiredItems);
router.get('/daily-movement' , getDailyStockMovements);



module.exports = router;
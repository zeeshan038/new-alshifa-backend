//NPM Packages
const router = require('express').Router();

//Controller
const { sellMed, getProfitSummary, getProfitByMonth, getProfitByHour, totalSalesNo, totalSales } = require('../controllers/sales');

router.post("/sell-med", sellMed);
router.get("/record" , getProfitSummary);
router.get("/record-by-month" , getProfitByMonth);
router.get("/profit-by-hour" , getProfitByHour);
router.get("/sales" , totalSales);
router.get("/salesNo" , totalSalesNo);

module.exports = router;
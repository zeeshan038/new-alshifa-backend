const express = require("express");
const router = express.Router();

//Paths
const user = require("./user");
const upload = require("./upload");
const medicine = require('./medicine');
const sale = require('./sale');
const stock = require('./stock')

//Routes
router.use("/user", user);
router.use("/upload" , upload);
router.use('/medicine' , medicine);
router.use('/sale' , sale);
router.use('/stock' , stock);


module.exports = router;
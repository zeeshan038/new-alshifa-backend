//NPM Packages
const router = require('express').Router();

const { signup, login, getUserDetails, editUser, changePassword, deleteUser } = require('../controllers/user');

//middleware
const  verifyUser  = require('../middlewares/verifyUser');

router.post("/signup", signup);
router.post("/login", login);

//auth routes
router.use(verifyUser);

router.get('/user-details' , getUserDetails);
router.put('/edit', editUser);
router.put("/change-password", changePassword);
router.delete('/delete' , deleteUser);


module.exports = router;
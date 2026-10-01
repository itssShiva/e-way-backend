const express = require("express");
const router = express.Router();

const { register, login, logout, getMe } = require("../controllers/authController");
const { registerValidator, loginValidator } = require("../validators/authValidator");
const validate = require("../middlewares/validate");
const { protect } = require("../middlewares/auth");

router.post("/register", registerValidator, validate, register);
router.post("/login", loginValidator, validate, login);
router.post("/logout", logout);
router.get("/me", protect, getMe);

module.exports = router;

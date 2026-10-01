const express = require("express");
const router = express.Router();
const { createOrder, verifyPayment, getTransactions } = require("../controllers/paymentController");
const { protect, adminOnly } = require("../middlewares/auth");

// Authenticated user creates a Razorpay order for a product
router.post("/create-order", protect, createOrder);

// Authenticated user submits payment details for server-side verification
router.post("/verify", protect, verifyPayment);

// Admin fetches all transactions (enriched with Razorpay data)
router.get("/transactions", protect, adminOnly, getTransactions);

module.exports = router;

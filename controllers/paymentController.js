const Razorpay = require("razorpay");
const crypto = require("crypto");
const Transaction = require("../models/Transaction");
const { getProductById } = require("../data/products");

// Lazy getter — Razorpay is only instantiated when a request arrives,
// so missing env vars at startup won't crash the server.
const getRazorpay = () =>
  new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

// POST /api/payment/create-order
const createOrder = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "productId is required." });
    }

    const product = getProductById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    const user = req.user;

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: product.amountInPaise,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId: user._id.toString(),
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        productId: product.id,
        productName: product.name,
      },
    });

    // Create a transaction record with status "created"
    await Transaction.create({
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      productId: product.id,
      productName: product.name,
      amount: product.price,
      currency: "INR",
      razorpayOrderId: order.id,
      status: "created",
    });

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Create order error:", err);
    return res.status(500).json({ message: "Failed to create payment order." });
  }
};

// POST /api/payment/verify
const verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ message: "Missing payment verification details." });
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      await Transaction.findOneAndUpdate(
        { razorpayOrderId },
        { status: "failed" }
      );
      return res.status(400).json({ message: "Payment verification failed." });
    }

    // Prevent duplicate — check if already paid
    const existing = await Transaction.findOne({ razorpayPaymentId });
    if (existing) {
      return res.status(200).json({ message: "Payment already verified." });
    }

    await Transaction.findOneAndUpdate(
      { razorpayOrderId },
      { razorpayPaymentId, status: "paid" }
    );

    return res.status(200).json({ message: "Payment verified successfully." });
  } catch (err) {
    console.error("Verify payment error:", err);
    return res.status(500).json({ message: "Payment verification error." });
  }
};

// GET /api/payment/transactions  (admin only)
const getTransactions = async (req, res) => {
  try {
    // Fetch our local transaction records (populated with user-friendly data)
    const transactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .lean();

    // Enrich each transaction with live Razorpay payment details
    const razorpay = getRazorpay();
    const enriched = await Promise.all(
      transactions.map(async (txn) => {
        let razorpayPayment = null;
        if (txn.razorpayPaymentId) {
          try {
            razorpayPayment = await razorpay.payments.fetch(txn.razorpayPaymentId);
          } catch {
            // Razorpay fetch failed — use local data only
          }
        }

        return {
          _id: txn._id,
          productId: txn.productId,
          productName: txn.productName,
          amount: txn.amount,
          currency: txn.currency,
          razorpayOrderId: txn.razorpayOrderId,
          razorpayPaymentId: txn.razorpayPaymentId,
          status: txn.status,
          userName: txn.userName,
          userEmail: txn.userEmail,
          createdAt: txn.createdAt,
          // From Razorpay live data (if available)
          razorpayStatus: razorpayPayment?.status || null,
          razorpayMethod: razorpayPayment?.method || null,
        };
      })
    );

    return res.status(200).json({ transactions: enriched });
  } catch (err) {
    console.error("Get transactions error:", err);
    return res.status(500).json({ message: "Failed to fetch transactions." });
  }
};

module.exports = { createOrder, verifyPayment, getTransactions };

// Products are stored here since there's no products DB collection.
// Each product has a unique id, name, description, price (in paise for Razorpay), and display price.
const PRODUCTS = [
  {
    id: "scooter_001",
    name: "Lumina V — Electric Scooter",
    description: "A next-gen electric scooter with 120 km range and zero emissions.",
    price: 799, // in rupees
    amountInPaise: 799 * 100,
  },
  {
    id: "bike_001",
    name: "Volta X — Electric Bike",
    description: "High-performance electric bike with 150 km range and integrated anti-theft.",
    price: 999, // in rupees
    amountInPaise: 999 * 100,
  },
];

const getProductById = (id) => PRODUCTS.find((p) => p.id === id) || null;

module.exports = { PRODUCTS, getProductById };

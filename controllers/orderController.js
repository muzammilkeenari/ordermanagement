
const Order = require('../models/Order');

// CREATE ORDER
exports.createOrder = async (req, res) => {
  try {
    const { customerName, productName, quantity, price } = req.body;

    if (
      !customerName?.trim() ||
      !productName?.trim() ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      typeof price !== 'number' ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      return res.status(400).json({
        message: 'Provide valid customer, product, quantity and price'
      });
    }

    const totalAmount = quantity * price;

    const order = await Order.create({
      customerName,
      productName,
      quantity,
      price,
      totalAmount
    });

    res.status(201).json({
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET ALL ORDERS
exports.getOrders = async (req, res) => {
  try {
    const { customerName } = req.query;
    const filter = {};

    if (customerName) {
      filter.customerName = customerName;
    }

    const orders = await Order.find(filter).sort({
      createdAt: -1
    });

    res.status(200).json({
      count: orders.length,
      orders
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE ORDER STATUS
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      'Pending',
      'Shipped',
      'Delivered'
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: 'Status must be Pending, Shipped, or Delivered'
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      {
        new: true,
        runValidators: true
      }
    );

    if (!order) {
      return res.status(404).json({
        message: 'Order not found'
      });
    }

    res.status(200).json({
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    const isInvalidId = error.name === 'CastError';

    res.status(isInvalidId ? 400 : 500).json({
      message: isInvalidId ? 'Invalid order ID' : error.message
    });
  }
};

// DELETE ORDER
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: 'Order not found'
      });
    }

    res.status(200).json({
      message: 'Order deleted successfully',
      order
    });
  } catch (error) {
    const isInvalidId = error.name === 'CastError';

    res.status(isInvalidId ? 400 : 500).json({
      message: isInvalidId ? 'Invalid order ID' : error.message
    });
  }
};

// AGGREGATION: TOTAL REVENUE + ORDERS PER USER
exports.getOrderStats = async (req, res) => {
  try {
    const stats = await Order.aggregate([
      {
        $facet: {
          overall: [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: '$totalAmount' }
              }
            },
            {
              $project: {
                _id: 0,
                totalOrders: 1,
                totalRevenue: 1
              }
            }
          ],

          perUser: [
            {
              $group: {
                _id: '$customerName',
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: '$totalAmount' }
              }
            },
            {
              $sort: { totalRevenue: -1 }
            },
            {
              $project: {
                _id: 0,
                customerName: '$_id',
                totalOrders: 1,
                totalRevenue: 1
              }
            }
          ]
        }
      }
    ]);

    res.status(200).json({
      overall: stats[0].overall[0] || {
        totalOrders: 0,
        totalRevenue: 0
      },
      perUser: stats[0].perUser
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

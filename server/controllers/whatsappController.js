const Order = require('../models/Order');
const Table = require('../models/Table');
const dayjs = require('dayjs');

exports.sendBill = async (req, res) => {
  try {
    const { orderId, customerMobile } = req.body;
    
    if (!orderId || !customerMobile) {
      return res.status(400).json({ error: 'Order ID and customer mobile are required' });
    }

    // Find the order
    const order = await Order.findById(orderId).populate('tableId');
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Generate bill text
    const billText = generateBillText(order);
    
    // For now, we'll return the WhatsApp URL that can be opened in browser
    // In production, you would integrate with a WhatsApp Business API service
    const whatsappUrl = `https://wa.me/91${customerMobile}?text=${encodeURIComponent(billText)}`;
    
    res.json({ 
      success: true, 
      whatsappUrl,
      message: 'WhatsApp URL generated successfully. Open this URL to send the bill.'
    });
    
  } catch (err) {
    console.error('Error sending WhatsApp bill:', err);
    res.status(500).json({ error: 'Failed to send WhatsApp bill' });
  }
};

const generateBillText = (order) => {
  const items = order.items.map(item => 
    `${item.name} x${item.quantity} = ₹${item.price * item.quantity}`
  ).join('\n');
  
  const subtotal = order.subtotal || order.totalAmount;
  const gstAmount = order.gstAmount || 0;
  const gstPercentage = order.gstPercentage || 0;
  const grandTotal = order.totalAmount;
  
  const date = dayjs(order.timestamp).format('DD/MM/YY');
  const time = dayjs(order.timestamp).format('HH:mm');
  
  return `*Kismat Kathiyawadi*

*Bill #${order.billNumber}*
Table: ${order.tableId?.tableNumber || 'N/A'}
Date: ${date}
Time: ${time}
Customer: ${order.customerName || 'Walk-in Customer'}

*Items:*
${items}

*Bill Summary:*
Subtotal: ₹${subtotal.toLocaleString('en-IN')}
${gstPercentage > 0 ? `GST (${gstPercentage}%): ₹${gstAmount.toLocaleString('en-IN')}\n` : ''}*Grand Total: ₹${grandTotal.toLocaleString('en-IN')}*

Thank you for visiting!
Please visit again! 🍽️`;
}; 
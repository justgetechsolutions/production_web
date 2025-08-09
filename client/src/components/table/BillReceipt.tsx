import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { X, Printer, MessageCircle } from 'lucide-react';
import dayjs from 'dayjs';

interface BillReceiptProps {
  order: any;
  table: any;
  gstEnabled: boolean;
  gstPercentage: number;
  discount?: number;
  onClose: () => void;
}

const BillReceipt: React.FC<BillReceiptProps> = ({ order, table, gstEnabled, gstPercentage, discount = 0, onClose }) => {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current!,
    documentTitle: `Bill-${order.billNumber}`,
  } as any);

  // Removed Download functionality as only print is needed

  const handleSendWhatsApp = async () => {
    try {
      // This would integrate with a WhatsApp API service
      const billText = generateBillText();
      const whatsappUrl = `https://wa.me/91${order.customerMobile}?text=${encodeURIComponent(billText)}`;
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      alert('Failed to send WhatsApp message');
    }
  };

  const generateBillText = () => {
    const items = order.items.map((item: any) => 
      `${item.name} x${item.quantity} = ₹${item.price * item.quantity}`
    ).join('\n');

    const derivedSubtotal = order.items.reduce((sum: number, i: any) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);
    const gstAmt = gstEnabled ? (order.gstAmount || (derivedSubtotal * (gstPercentage || 0) / 100)) : 0;
    const discountAmt = Math.max(0, Number(discount || 0));
    const total = Math.max(0, derivedSubtotal + gstAmt - discountAmt);
    
    return `*Kismat Kathiyawadi*\n\n*Bill #${order.billNumber}*\nTable: ${table.tableNumber}\nDate: ${formatDate(order.timestamp)}\nTime: ${formatTime(order.timestamp)}\n\n*Items:*\n${items}\n\n*Subtotal:* ₹${derivedSubtotal.toFixed(2)}\n${gstEnabled ? `*GST (${gstPercentage}%):* ₹${gstAmt.toFixed(2)}\n` : ''}${discountAmt > 0 ? `*Discount:* -₹${discountAmt.toFixed(2)}\n` : ''}*Grand Total:* ₹${total.toFixed(2)}\n\nThank you for visiting!`;
  };

  const formatDate = (date: string) => {
    return dayjs(date).format('DD/MM/YY');
  };

  const formatTime = (date: string) => {
    return dayjs(date).format('HH:mm');
  };

  const calculateTotalQuantity = () => {
    return order.items.reduce((total: number, item: any) => total + item.quantity, 0);
  };

  const derivedSubtotal: number = Array.isArray(order.items)
    ? order.items.reduce((sum: number, item: any) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0)
    : 0;
  const gstAmount = gstEnabled ? (order.gstAmount || (derivedSubtotal * (gstPercentage || 0) / 100)) : 0;
  const discountAmountRaw = Number(discount || 0);
  const discountAmount = discountAmountRaw > derivedSubtotal + gstAmount ? derivedSubtotal + gstAmount : Math.max(0, discountAmountRaw);
  const grandTotal = Math.max(0, derivedSubtotal + gstAmount - discountAmount);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Bill Receipt</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title="Print Bill"
            >
              <Printer className="w-4 h-4" />
            </button>
            {/* Removed Download button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bill Content */}
        <div className="p-4">
          <div 
            ref={componentRef}
            className="bg-white text-black font-mono text-xs max-w-[320px] mx-auto"
            style={{ 
              width: '320px',
              fontFamily: 'monospace',
              fontSize: '12px',
              lineHeight: '1.2'
            }}
          >
                         {/* Header Section */}
             <div className="text-center mb-6">
               <div className="font-bold text-base mb-2">Kismat Kathiyawadi</div>
               <div className="text-xs mb-1">Shukan Mall Char Rasta, Science City, Sola</div>
               <div className="text-xs mb-3">Phone: +91 98765 43210</div>
             </div>

             {/* Bill Details */}
             <div className="flex justify-between text-xs mb-6">
               <div>
                 <div>Customer: {order.customerName || 'Walk-in Customer'}</div>
                 <div>Table: {table.tableNumber}</div>
               </div>
               <div className="text-right">
                 <div>Date: {dayjs(order.createdAt).format('DD/MM/YYYY')}</div>
                 <div>Time: {dayjs(order.createdAt).format('HH:mm')}</div>
                 <div>Bill #: {order.billNumber}</div>
                 <div>Cashier: admin</div>
               </div>
             </div>

            {/* Separator */}
            <div className="border-t border-black mb-4"></div>

            {/* Table Header */}
            <div className="grid grid-cols-4 gap-2 text-xs font-bold mb-2">
              <div>Item</div>
              <div className="text-center">Qty</div>
              <div className="text-right">Price</div>
              <div className="text-right">Amount</div>
            </div>

            {/* Separator */}
            <div className="border-t border-black mb-2"></div>

            {/* Table Content */}
            <div className="space-y-1 mb-4">
              {order.items.map((item: any, index: number) => {
                const itemName = item.menuItem?.name || item.name;
                const quantity = item.quantity;
                const price = item.price;
                const amount = quantity * price;
                
                return (
                  <div key={index} className="grid grid-cols-4 gap-2 text-xs">
                    <div className="truncate">{itemName}</div>
                    <div className="text-center">{quantity}</div>
                    <div className="text-right">₹{price}</div>
                    <div className="text-right">₹{amount}</div>
                  </div>
                );
              })}
            </div>

            {/* Separator */}
            <div className="border-t border-black mb-4"></div>

            {/* Summary Section */}
            <div className="space-y-1 mb-4">
              {(() => {
                const totalQuantity = order.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
                return (
                  <>
                    <div className="flex justify-between text-xs">
                      <span>Total Qty:</span>
                      <span>{totalQuantity}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Subtotal:</span>
                      <span>₹{derivedSubtotal.toFixed(2)}</span>
                    </div>
                    {gstEnabled && gstAmount > 0 && (
                      <div className="flex justify-between text-xs">
                        <span>GST ({gstPercentage}%):</span>
                        <span>₹{gstAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-xs">
                        <span>Discount:</span>
                        <span>-₹{discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold border-t border-black pt-1">
                      <span>Grand Total:</span>
                      <span>₹{grandTotal.toFixed(2)}</span>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Separator */}
            <div className="border-t border-black mb-4"></div>

            {/* Footer Section */}
            <div className="text-center space-y-2">
              <div className="text-xs">Payment Method: Cash</div>
              <div className="text-sm font-bold">Thank You! Visit Again</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillReceipt; 
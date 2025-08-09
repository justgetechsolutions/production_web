import React, { useEffect, useState } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import dayjs from 'dayjs';

const MakeOrder: React.FC = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState<{ id: string; name: string; price: number; qty: number }[]>([]);
  const [hotelInfo, setHotelInfo] = useState({ name: 'Hotel Name', address: 'Hotel Address' });

  useEffect(() => {
    axios.get('/api/restaurants/menu/public/1') // Replace '1' with actual restaurantId
      .then(res => setMenuItems(res.data))
      .catch(() => setMenuItems([]));
    // Optionally fetch hotel info from API
  }, []);

  const addToCart = (item: any) => {
    setCart(prev => {
      const found = prev.find(i => i.id === item._id);
      if (found) {
        return prev.map(i => i.id === item._id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { id: item._id, name: item.name, price: item.price, qty: 1 }];
    });
  };
  const removeFromCart = (item: any) => {
    setCart(prev => prev.map(i => i.id === item._id ? { ...i, qty: Math.max(i.qty - 1, 0) } : i).filter(i => i.qty > 0));
  };

  const getTotal = () => cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(hotelInfo.name, 20, 20);
    doc.setFontSize(12);
    doc.text(hotelInfo.address, 20, 28);
    doc.text(`Date: ${dayjs().format('YYYY-MM-DD')}`, 20, 36);
    doc.text(`Time: ${dayjs().format('HH:mm:ss')}`, 120, 36);
    doc.text(`Bill No: ${Math.floor(Math.random()*100000)}`, 20, 44);
    doc.text('----------------------------------------', 20, 50);
    let y = 56;
    doc.text('Item', 20, y);
    doc.text('Qty', 80, y);
    doc.text('Price', 100, y);
    doc.text('Amount', 140, y);
    y += 8;
    cart.forEach(item => {
      doc.text(item.name, 20, y);
      doc.text(String(item.qty), 80, y);
      doc.text(`₹${item.price}`, 100, y);
      doc.text(`₹${item.price * item.qty}`, 140, y);
      y += 8;
    });
    doc.text('----------------------------------------', 20, y);
    y += 8;
    doc.text(`Total: ₹${getTotal()}`, 20, y);
    y += 8;
    doc.text('Payment: Cash', 20, y); // You can make this dynamic
    doc.save('bill.pdf');
    // Share logic below
    if (navigator.share) {
      doc.output('blob').then(blob => {
        const file = new File([blob], 'bill.pdf', { type: 'application/pdf' });
        navigator.share({
          title: 'Hotel Bill',
          text: 'Please find your bill attached.',
          files: [file]
        });
      });
    } else {
      // WhatsApp share fallback
      const url = window.location.origin + '/bill.pdf'; // You need to upload/share the file
      window.open(`https://wa.me/?text=Please find your bill: ${url}`);
    }
  };

  return (
    <div className="flex p-6 gap-8">
      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
        {menuItems.map((item: any) => (
          <div key={item._id} className="border rounded-lg p-4 flex flex-col items-center">
            <div className="font-bold text-lg">{item.name}</div>
            <div className="text-blue-600 font-semibold">₹{item.price}</div>
            <div className="flex items-center gap-2 mt-2">
              <button className="px-2 py-1 bg-gray-200 rounded" onClick={() => removeFromCart(item)}>-</button>
              <input type="number" className="w-12 text-center border rounded" value={cart.find(i => i.id === item._id)?.qty || 0} readOnly />
              <button className="px-2 py-1 bg-gray-200 rounded" onClick={() => addToCart(item)}>+</button>
            </div>
          </div>
        ))}
      </div>
      <div className="w-80 border rounded-lg p-4 bg-white shadow">
        <h3 className="text-xl font-bold mb-4">Order Summary</h3>
        {cart.length === 0 ? <div>No items added.</div> : (
          <ul>
            {cart.map(item => (
              <li key={item.id} className="flex justify-between mb-2">
                <span>{item.name} x {item.qty}</span>
                <span>₹{item.price * item.qty}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 font-bold">Total: ₹{getTotal()}</div>
        <button className="mt-6 w-full bg-blue-600 text-white py-2 rounded" onClick={generatePDF} disabled={cart.length === 0}>Place Order & Generate Bill</button>
      </div>
    </div>
  );
};

export default MakeOrder;

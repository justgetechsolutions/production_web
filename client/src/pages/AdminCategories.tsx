import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../AuthContext.tsx';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch } from '../store';
import { fetchCategories, fetchItemsForCategory, selectCategories, selectItemsFor, setSelectedCategory } from '../store/menuSlice';
import { placeCounterOrder, selectOrderPlacing } from '../store/orderSlice';
import { io } from 'socket.io-client';
import { ShoppingCart } from 'lucide-react';

const AdminCategories: React.FC = () => {
  const { restaurantId } = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const categories = useSelector(selectCategories);
  const [activeCategoryId, setActiveCategoryId] = useState<string | undefined>();
  const [activeCategoryName, setActiveCategoryName] = useState<string>('');
  const items = useSelector(selectItemsFor(activeCategoryId));
  const placing = useSelector(selectOrderPlacing);

  const [cart, setCart] = useState<{ id: string; name: string; price: number; qty: number }[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    if (restaurantId) {
      dispatch(fetchCategories({ restaurantId }));
    }
  }, [restaurantId, dispatch]);

  useEffect(() => {
    if (restaurantId && activeCategoryId && activeCategoryName) {
      dispatch(fetchItemsForCategory({ restaurantId, categoryName: activeCategoryName, categoryId: activeCategoryId }));
      dispatch(setSelectedCategory(activeCategoryId));
    }
  }, [restaurantId, activeCategoryId, activeCategoryName, dispatch]);

  const handleCategoryClick = (id: string, name: string) => {
    setActiveCategoryId(id);
    setActiveCategoryName(name);
  };

  const handlePlaceOrder = async () => {
    if (!restaurantId || cart.length === 0) return;
    await dispatch(placeCounterOrder({ restaurantId, tableNumber: 'Cash Counter', items: cart.map(c => ({ id: c.id, qty: c.qty })), discount }));
    // Emit a client-side hint; server will broadcast on order creation too
    try {
      const socket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000', { transports: ['websocket', 'polling'] });
      socket.emit('joinRestaurant', restaurantId);
      socket.emit('newOrder', { restaurantId });
      socket.disconnect();
    } catch {}
    setCart([]);
    setDiscount(0);
    setCartOpen(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 xl:gap-10 max-w-7xl mx-auto">
      {/* Categories list */}
      <div className="lg:col-span-1 bg-white rounded-2xl shadow border border-gray-200 p-6">
        <h2 className="text-2xl font-extrabold mb-4">Categories</h2>
        <ul className="space-y-3 max-h-[70vh] overflow-auto pr-1">
          {categories.map(c => (
            <li key={c._id}>
              <button
                className={`w-full text-left px-5 py-4 rounded-xl text-lg font-semibold border transition-all ${activeCategoryId === c._id ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'}`}
                onClick={() => handleCategoryClick(c._id, c.name)}
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Items list */}
      <div className="lg:col-span-2 bg-white rounded-2xl shadow border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold">{activeCategoryName ? `Items • ${activeCategoryName}` : 'Select a category'}</h2>
        </div>
        {activeCategoryId && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {items.map(item => (
                <div key={item._id} className="border rounded-xl p-5 shadow-sm hover:shadow-md transition">
                <div className="font-bold text-xl text-gray-900 mb-1">{item.name}</div>
                <div className="text-base text-gray-600 mb-4">₹{item.price}</div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
                    onClick={() => {
                      setCart(prev => {
                        const existing = prev.find(p => p.id === item._id);
                        if (existing) return prev.map(p => p.id === item._id ? { ...p, qty: p.qty + 1 } : p);
                        return [...prev, { id: item._id, name: item.name, price: item.price, qty: 1 }];
                      });
                    }}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-gray-500">No items in this category.</div>
            )}
          </div>
        )}
      </div>

      {/* Floating cart button - bottom-left */}
      <button
        className="fixed left-6 bottom-6 z-50 flex items-center gap-2 bg-blue-600 text-white px-5 py-4 rounded-full shadow-xl hover:bg-blue-700 text-base"
        onClick={() => setCartOpen(true)}
        aria-label="Open cart"
      >
        <ShoppingCart className="w-5 h-5" />
        <span className="text-base font-semibold">Cart</span>
        {cart.length > 0 && (
          <span className="ml-1 inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-white text-blue-700 text-sm font-bold">
            {cart.reduce((s, c) => s + c.qty, 0)}
          </span>
        )}
      </button>

      {/* Cart sidebar */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setCartOpen(false)}></div>
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 flex flex-col rounded-l-2xl">
            <h3 className="text-2xl font-extrabold mb-5">Cash Counter Cart</h3>
            <div className="flex-1 overflow-auto divide-y">
              {cart.length === 0 && <div className="text-gray-500">Cart is empty</div>}
              {cart.map((c, idx) => (
                <div key={c.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="font-medium text-gray-900">
                    {c.name}
                    <div className="text-xs text-gray-500">₹{(c.price || 0).toFixed(2)} each • ₹{((c.price || 0) * c.qty).toFixed(2)} total</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 border rounded-lg" onClick={() => setCart(prev => prev.map(p => p.id === c.id ? { ...p, qty: Math.max(1, p.qty - 1) } : p))}>-</button>
                    <span className="w-10 text-center font-semibold">{c.qty}</span>
                    <button className="px-3 py-1.5 border rounded-lg" onClick={() => setCart(prev => prev.map(p => p.id === c.id ? { ...p, qty: p.qty + 1 } : p))}>+</button>
                    <button className="ml-2 text-red-600" onClick={() => setCart(prev => prev.filter(p => p.id !== c.id))}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
            {/* Totals and discount */}
            <div className="mt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span>Items</span>
                <span>{cart.reduce((s, c) => s + c.qty, 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>₹{cart.reduce((s, c) => s + c.qty * (c.price || 0), 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm">Discount</label>
                <input type="number" min={0} value={discount} onChange={e => {
                  const val = Math.max(0, Number(e.target.value || 0));
                  const subtotal = cart.reduce((s, c) => s + c.qty * (c.price || 0), 0);
                  setDiscount(Math.min(val, subtotal));
                }} className="w-32 border rounded px-2 py-1 text-right" />
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>Total Payable</span>
                <span>
                  ₹{(() => {
                    const subtotal = cart.reduce((s, c) => s + c.qty * (c.price || 0), 0);
                    return Math.max(0, subtotal - (discount || 0)).toFixed(2);
                  })()}
                </span>
              </div>
              <div className="text-xs text-gray-500">Discount is applied to the payable total.</div>
            </div>
            <div className="pt-4 border-t flex gap-3">
              <button className="flex-1 border rounded-lg px-4 py-3" onClick={() => setCart([])}>Clear</button>
              <button className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-3 disabled:opacity-60" disabled={placing || cart.length === 0} onClick={handlePlaceOrder}>{placing ? 'Placing...' : 'Place Order'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategories;


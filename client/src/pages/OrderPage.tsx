import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ShoppingCart } from 'react-feather';
import { MessageCircle } from 'react-feather'; // Add this import for a comment icon
import { ChevronLeft, ChevronRight } from 'react-feather';
import { useAuth } from '../AuthContext.tsx';
import CommentModal from '../components/CommentModal';
import Chatbot from '../components/Chatbot';
import Confetti from 'react-confetti';
import { getComments } from '../utils/api-client';

interface MenuItem {
  _id: string;
  name: string;
  price: number;
  category?: string;
  imageUrl?: string;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

interface Category {
  _id: string;
  name: string;
}

const MENU_API = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/menu`;
const ORDER_API =`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/orders`;
const FALLBACK_IMG = 'https://via.placeholder.com/120?text=No+Image';

// Utility: Map category or name to icon
const categoryIcons: Record<string, string> = {
  'Fast Food': '🍔',
  'Pizza': '🍕',
  'Spicy': '🌶️',
  'Cheese': '🧀',
  'Drinks': '🥤',
  'Dessert': '🍰',
  'Burger': '🍔',
  'Fries': '🍟',
  'Salad': '🥗',
  'Sushi': '🍣',
  'Chicken': '🍗',
  'Noodles': '🍜',
  'Soup': '🍲',
  'Sandwich': '🥪',
  'Taco': '🌮',
  'Coffee': '☕',
};
function getCategoryIcon(cat: string) {
  for (const key in categoryIcons) {
    if (cat.toLowerCase().includes(key.toLowerCase())) return categoryIcons[key];
  }
  return '🍽️';
}

function OrderPage() {
  const { restaurantId, tableNumber } = useParams();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [description, setDescription] = useState("");
  const navigate = useNavigate();
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  // Add state for confetti/checkmark per item
  const [cartAnimation, setCartAnimation] = useState<{[id:string]:boolean}>({});
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [cartBounce, setCartBounce] = useState(false);
  const [averageRatings, setAverageRatings] = useState<{[id:string]:number}>({});
  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!restaurantId) return;
    fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/restaurants/menu/public/${restaurantId}`)
      .then(res => res.json())
      .then(data => {
        setMenu(data);
        setLoading(false);
        // Extract unique categories from menu items
        const uniqueCategories = Array.from(new Set(data.map((item: any) => item.category).filter(Boolean))) as string[];
        setCategories(uniqueCategories);
      })
      .catch(() => {
        setLoading(false);
        setCategories([]);
      });
  }, [restaurantId]);

  useEffect(() => {
    // Fetch average ratings for all menu items
    async function fetchRatings() {
      const ratings: {[id:string]:number} = {};
      for (const item of menu) {
        try {
          const comments = await getComments(item._id);
          if (comments.length > 0) {
            const avg = comments.reduce((sum, c) => sum + (c.rating || 0), 0) / comments.length;
            ratings[item._id] = avg;
          }
        } catch {}
      }
      setAverageRatings(ratings);
    }
    if (menu.length > 0) fetchRatings();
  }, [menu]);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const found = prev.find(ci => ci.menuItem._id === item._id);
      if (found) {
        return prev.map(ci => ci.menuItem._id === item._id ? { ...ci, quantity: ci.quantity + 1 } : ci);
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
    
    // Show toast after state update
    const found = cart.find(ci => ci.menuItem._id === item._id);
    if (found) {
      toast.info('Increased quantity in cart');
    } else {
      toast.success('Added to cart!');
    }
    // setShowCart(true); // Removed to prevent cart from opening automatically
  };

  // Function to add item to cart from chatbot
  const addToCartFromChatbot = (itemName: string) => {
    const menuItem = menu.find(item => 
      item.name.toLowerCase().includes(itemName.toLowerCase()) ||
      itemName.toLowerCase().includes(item.name.toLowerCase())
    );
    
    if (menuItem) {
      addToCart(menuItem);
      toast.success(`✅ ${menuItem.name} added to your cart!`);
    } else {
      toast.error(`Sorry, I couldn't find "${itemName}" in our menu.`);
    }
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(ci => ci.menuItem._id !== itemId));
  };

  const updateQuantity = (itemId: string, qty: number) => {
    if (qty < 1) return;
    setCart(prev => prev.map(ci => ci.menuItem._id === itemId ? { ...ci, quantity: qty } : ci));
  };

  const increaseQty = (itemId: string) => {
    setCart(prev => prev.map(ci => ci.menuItem._id === itemId ? { ...ci, quantity: ci.quantity + 1 } : ci));
  };

  const decreaseQty = (itemId: string) => {
    setCart(prev => prev.map(ci => ci.menuItem._id === itemId && ci.quantity > 1 ? { ...ci, quantity: ci.quantity - 1 } : ci));
  };

  const cartTotal = cart.reduce((sum, ci) => sum + ci.menuItem.price * ci.quantity, 0);

  const placeOrder = async () => {
    if (!tableNumber || !restaurantId) {
      toast.error('No table or restaurant found in URL.');
      return;
    }
    if (cart.length === 0) {
      toast.error('Cart is empty.');
      return;
    }
    setPlacing(true);
    const items = cart.map(ci => ({ 
      menuItem: ci.menuItem._id, 
      quantity: ci.quantity,
      name: ci.menuItem.name,
      price: ci.menuItem.price
    }));
    const res = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/orders/public/${restaurantId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: tableNumber, items, totalAmount: cartTotal, description }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      toast.success('Order placed successfully!');
      setCart([]);
      setShowCart(false);
      navigate(`/order-status?orderId=${data._id}`);
    } else {
      toast.error('Failed to place order.');
    }
    setPlacing(false);
  };

  // Filter menu items by selected category
  const filteredMenu = selectedCategory ? menu.filter(item => item.category === selectedCategory) : menu;

  // Bounce animation when cart changes
  useEffect(() => {
    if (cart.length > 0) {
      setCartBounce(true);
      const timeout = setTimeout(() => setCartBounce(false), 500);
      return () => clearTimeout(timeout);
    }
  }, [cart.length]);

  // Category scroll logic
  const catScrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  useEffect(() => {
    const el = catScrollRef.current;
    if (!el) return;
    // Auto-scroll right and back left on mount
    el.scrollTo({ left: 80, behavior: 'smooth' });
    setTimeout(() => el.scrollTo({ left: 0, behavior: 'smooth' }), 700);
    // Show swipe hint for 1.5s
    setShowSwipeHint(true);
    setTimeout(() => setShowSwipeHint(false), 1500);
    // Arrow logic
    const updateArrows = () => {
      if (!el) return;
      setShowLeftArrow(el.scrollLeft > 5);
      setShowRightArrow(el.scrollLeft + el.offsetWidth < el.scrollWidth - 5);
    };
    updateArrows();
    el.addEventListener('scroll', updateArrows);
    window.addEventListener('resize', updateArrows);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, [categories.length]);
  const scrollCat = (dir: 'left' | 'right') => {
    const el = catScrollRef.current;
    if (!el) return;
    const amount = el.offsetWidth * 0.7;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading menu...</p>
      </div>
    </div>
  );

  // Responsive grid: 1 col mobile, 2 col tablet, 3 col desktop
  return (
    <div className="relative min-h-screen bg-gray-50" style={{ fontFamily: 'Poppins, Inter, sans-serif' }}>
      {/* Header with gradient, animated underline, and SVG doodle */}
      <div className="relative flex flex-col items-center justify-center py-6 sm:py-10 mb-4 overflow-hidden">
        {/* SVG doodle background */}
        <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" viewBox="0 0 600 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M50 60 Q150 10 250 60 T450 60 Q550 110 600 60" stroke="#fbbf24" strokeWidth="6" fill="none"/>
          <circle cx="100" cy="40" r="12" fill="#f87171"/>
          <rect x="500" y="80" width="18" height="18" rx="6" fill="#34d399"/>
          <ellipse cx="300" cy="100" rx="20" ry="8" fill="#60a5fa"/>
        </svg>
        <h1 className="relative z-10 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-pink-500 via-yellow-500 to-green-400 bg-clip-text text-transparent text-center select-none px-4">
          Order Menu
        </h1>
        <div className="relative z-10 mt-2 w-24 sm:w-32 h-1.5 sm:h-2 mx-auto">
          <div className="h-full bg-gradient-to-r from-pink-400 via-yellow-400 to-green-300 rounded-full animate-pulse" style={{ animationDuration: '2s' }}></div>
        </div>
      </div>

      {/* Sticky category filter bar */}
      <div className="sticky top-0 z-30 bg-gray-50/80 backdrop-blur-md py-3 mb-4 sm:mb-6 flex justify-center shadow-sm" style={{ fontFamily: 'Poppins, Inter, sans-serif' }}>
        <div className="relative w-full max-w-3xl px-2">
          {/* Fade left/right scroll indicators */}
          {showLeftArrow && (
            <button className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-white/80 rounded-full shadow p-1 flex items-center justify-center" style={{boxShadow:'0 2px 8px 0 rgba(0,0,0,0.08)'}} onClick={() => scrollCat('left')} aria-label="Scroll left">
              <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
            </button>
          )}
          {showRightArrow && (
            <button className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-white/80 rounded-full shadow p-1 flex items-center justify-center" style={{boxShadow:'0 2px 8px 0 rgba(0,0,0,0.08)'}} onClick={() => scrollCat('right')} aria-label="Scroll right">
              <ChevronRight size={20} className="sm:w-6 sm:h-6" />
            </button>
          )}
          <div ref={catScrollRef} className="overflow-x-auto scrollbar-hide whitespace-nowrap flex flex-nowrap gap-2 pb-1 relative" style={{scrollbarWidth:'none'}}>
            <button
              className={`transition-all duration-200 px-3 sm:px-4 py-2 rounded-full font-semibold shadow-sm border flex items-center gap-1 sm:gap-2 text-sm sm:text-base focus:outline-none flex-shrink-0
                ${!selectedCategory ? 'bg-gradient-to-r from-pink-500 to-yellow-400 text-white scale-105 shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
              onClick={() => setSelectedCategory('')}
            >
              <span role="img" aria-label="all">🍽️</span> <span className="inline">All</span>
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                className={`transition-all duration-200 px-3 sm:px-4 py-2 rounded-full font-semibold shadow-sm border flex items-center gap-1 sm:gap-2 text-sm sm:text-base focus:outline-none flex-shrink-0
                  ${selectedCategory === cat ? 'bg-gradient-to-r from-pink-500 to-yellow-400 text-white scale-105 shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                onClick={() => setSelectedCategory(cat)}
              >
                <span role="img" aria-label={cat}>{getCategoryIcon(cat)}</span> <span className="inline">{cat}</span>
              </button>
            ))}
            {/* Swipe/drag hand icon overlay for mobile */}
            {showSwipeHint && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-0 mb-2 z-30 pointer-events-none flex flex-col items-center">
                <span className="text-xl sm:text-2xl animate-bounce">🤚</span>
                <span className="text-xs text-gray-400">Swipe</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Menu Grid - Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 px-4 sm:px-6 lg:px-8 mb-20 sm:mb-24">
        {filteredMenu.map(item => {
            // Tag icons based on name/category
            const tags: string[] = [];
            if ((item.name + ' ' + (item.category || '')).toLowerCase().includes('spicy')) tags.push('🌶️');
            if ((item.name + ' ' + (item.category || '')).toLowerCase().includes('cheese')) tags.push('🧀');
            if ((item.name + ' ' + (item.category || '')).toLowerCase().includes('vegan')) tags.push('🥦');
            if ((item.name + ' ' + (item.category || '')).toLowerCase().includes('chicken')) tags.push('🍗');
            if ((item.name + ' ' + (item.category || '')).toLowerCase().includes('pizza')) tags.push('🍕');
            if ((item.name + ' ' + (item.category || '')).toLowerCase().includes('burger')) tags.push('🍔');
            const avgRating = averageRatings[item._id] || 0;
            const isAnimating = !!cartAnimation[item._id];
            return (
              <div
                key={item._id}
                className="relative flex flex-col items-center justify-between p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-2xl border border-white/60 bg-white/80 backdrop-blur-xl overflow-hidden min-h-[320px] sm:min-h-[380px] max-w-sm mx-auto hover:shadow-xl transition-all duration-300"
                style={{ boxShadow: '0 4px 20px 0 rgba(31,38,135,0.12)', border: '1.5px solid rgba(255,255,255,0.5)' }}
              >
                {/* Confetti animation overlay */}
                {isAnimating && (
                  <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
                    <Confetti
                      width={windowSize.width > 400 ? 340 : windowSize.width - 40}
                      height={340}
                      numberOfPieces={80}
                      recycle={false}
                      gravity={0.25}
                      initialVelocityY={8}
                      style={{ pointerEvents: 'none' }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-white/80 rounded-full p-4 shadow-lg animate-bounce">
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="24" cy="24" r="24" fill="#34d399"/>
                          <path d="M15 25l6 6 12-12" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
                {/* Card content */}
                <img
                  src={item.imageUrl || FALLBACK_IMG}
                  alt={item.name}
                  className="w-20 h-20 sm:w-28 sm:h-28 object-cover rounded-xl sm:rounded-2xl mb-3 sm:mb-4 border-2 border-white/80 group-hover:scale-110 transition-transform duration-300 shadow-lg z-10"
                  onError={e => (e.currentTarget.src = FALLBACK_IMG)}
                  style={{ boxShadow: '0 4px 24px 0 rgba(0,0,0,0.08)' }}
                />
                <div className="w-full flex flex-col items-center">
                  <div className="font-extrabold text-lg sm:text-xl text-gray-900 mb-1 text-center tracking-tight flex items-center gap-1 sm:gap-2" style={{fontFamily:'Poppins,Inter,sans-serif'}}>
                    <span className="truncate max-w-full">{item.name}</span>
                    {tags.length > 0 && (
                      <span className="flex gap-1 text-base sm:text-lg flex-shrink-0">{tags.map(t => <span key={t}>{t}</span>)}</span>
                    )}
                  </div>
                  {/* Real average rating stars */}
                  <div className="flex items-center gap-1 mb-2 text-yellow-500 text-base sm:text-lg">
                    {avgRating > 0 ? (
                      <React.Fragment>
                        {Array.from({length: Math.round(avgRating)}).map((_,i) => <span key={i}>★</span>)}
                        {Array.from({length: 5-Math.round(avgRating)}).map((_,i) => <span key={i} className="text-gray-300">★</span>)}
                        <span className="ml-1 sm:ml-2 text-sm sm:text-base text-gray-600">{avgRating.toFixed(1)} / 5</span>
                      </React.Fragment>
                    ) : (
                      <span className="text-gray-400 text-sm sm:text-base">No ratings yet</span>
                    )}
                  </div>
                  <div className="mb-3 text-gray-800 text-center font-bold text-base sm:text-lg">₹{item.price}</div>
                  {/* Comment button - full width, pill, vibrant, visible */}
                  <button
                    className="w-full flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 px-3 sm:px-4 mb-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold text-sm sm:text-base shadow-lg hover:from-blue-600 hover:to-purple-600 focus:outline-none transition-all duration-200"
                    style={{ minHeight: 40 }}
                    onClick={() => { setSelectedMenuItem(item); setCommentModalOpen(true); }}
                    title="See what others say!"
                  >
                    <MessageCircle size={16} className="sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">Customer Review!</span>
                    <span className="sm:hidden">Review!</span>
                  </button>
                  {/* Add to Cart button - full width, large, vibrant */}
                  <button
                    className={`w-full flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 px-3 sm:px-4 rounded-full bg-gradient-to-r from-pink-500 to-yellow-400 text-white font-bold text-base sm:text-lg shadow-xl hover:from-pink-600 hover:to-yellow-500 hover:scale-105 transition-all duration-200 mt-auto focus:outline-none relative ${isAnimating ? 'pointer-events-none opacity-70' : ''}`}
                    style={{ minHeight: 40 }}
                    onClick={() => {
                      addToCart(item);
                      setCartAnimation(a => ({...a, [item._id]: true}));
                      setTimeout(() => setCartAnimation(a => ({...a, [item._id]: false})), 1200);
                    }}
                    disabled={isAnimating}
                  >
                    <span role="img" aria-label="cart">🛒</span> <span className="hidden sm:inline">Add to Cart</span>
                    <span className="sm:hidden">Add</span>
                  </button>
                </div>
              </div>
            );
          })}
      </div>
      {/* Floating cart button for mobile */}
      <button
        className={`fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-40 bg-white/80 backdrop-blur-xl border border-white/60 shadow-2xl rounded-full p-3 sm:p-5 flex items-center gap-2 lg:hidden transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none ${cartBounce ? 'animate-bounce' : ''}`}
        style={{ boxShadow: '0 12px 32px 0 rgba(31,38,135,0.18)', backdropFilter: 'blur(16px)', minHeight: 48, minWidth: 48 }}
        onClick={() => setShowCart(v => !v)}
      >
        <span className="text-pink-500">
          <ShoppingCart size={24} className="sm:w-8 sm:h-8" />
        </span>
        {cart.length > 0 && (
          <span className={`bg-gradient-to-r from-pink-500 to-yellow-400 text-white rounded-full px-2 sm:px-3 py-1 text-sm sm:text-base font-bold ml-1 shadow-lg border-2 border-white/80 transition-all duration-300 ${cartBounce ? 'scale-125' : ''}`}
            style={{ minWidth: 24, minHeight: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {cart.length}
          </span>
        )}
      </button>

      {/* Cart side panel (desktop) or drawer (mobile) */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm sm:max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300
          ${showCart ? 'translate-x-0' : 'translate-x-full'}
          lg:static lg:translate-x-0 lg:shadow-none lg:bg-transparent lg:w-96 lg:h-auto lg:float-right lg:ml-8`}
      >
        <div className="p-4 sm:p-6 lg:sticky lg:top-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold">Cart</h2>
            <button className="lg:hidden text-gray-500 text-2xl p-1" onClick={() => setShowCart(false)}>&times;</button>
          </div>
          {cart.length === 0 ? <div className="mb-4 text-gray-500">Cart is empty.</div> : (
            <>
              <table className="w-full mb-4">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map(ci => (
                    <tr key={ci.menuItem._id}>
                      <td>{ci.menuItem.name}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button onClick={() => decreaseQty(ci.menuItem._id)} className="px-2 py-1 bg-gray-200 rounded">-</button>
                          <input
                            type="number"
                            min={1}
                            value={ci.quantity}
                            onChange={e => updateQuantity(ci.menuItem._id, Number(e.target.value))}
                            className="w-12 border rounded px-2 py-1 text-center"
                          />
                          <button onClick={() => increaseQty(ci.menuItem._id)} className="px-2 py-1 bg-gray-200 rounded">+</button>
                        </div>
                      </td>
                      <td>₹{ci.menuItem.price * ci.quantity}</td>
                      <td>
                        <button onClick={() => removeFromCart(ci.menuItem._id)} className="text-red-600 hover:underline">Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mb-4 font-bold text-lg">Total: ₹{cartTotal}</div>
              <div className="mb-4">
                <label className="block font-semibold mb-1">
                  Special Requests (e.g. "Extra spicy bhaji in pav bhaji", "No onions", "Less sugar", etc.)
                </label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  placeholder="Type any special instructions for your order here..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </>
          )}
          <button
            className="w-full bg-gradient-to-r from-green-400 to-green-600 text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:from-green-500 hover:to-green-700 transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60"
            onClick={placeOrder}
            disabled={placing || cart.length === 0}
          >
            <span role="img" aria-label="order">✅</span> {placing ? 'Placing Order...' : 'Place Order'}
          </button>
        </div>
      </div>
      {/* Overlay for mobile cart drawer */}
      {showCart && <div className="fixed inset-0 bg-black bg-opacity-30 z-40 lg:hidden" onClick={() => setShowCart(false)}></div>}
      {selectedMenuItem && (
        <CommentModal
          open={commentModalOpen}
          onClose={() => setCommentModalOpen(false)}
          menuItem={selectedMenuItem}
          mode="view"
        />
      )}
      
                      {/* Chatbot Component */}
                <Chatbot
                  restaurantId={restaurantId || '1'}
                  onAddToCart={addToCartFromChatbot}
                  cart={cart}
                />
    </div>
  );
}

export default OrderPage; 

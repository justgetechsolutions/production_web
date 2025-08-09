import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import CommentModal from '../components/CommentModal';
import Confetti from 'react-confetti';

interface Order {
  _id: string;
  token: number;
  tableNumber?: string;
  items: { menuItem: { name: string; _id: string }, quantity: number }[];
  status: string;
  timestamp: string;
  totalAmount: number;
  description?: string;
}

const ORDER_STATUS_STEPS = [
  { key: 'received', label: 'Received', icon: '📥', color: 'bg-blue-400' },
  { key: 'preparing', label: 'Preparing', icon: '👨‍🍳', color: 'bg-yellow-400' },
  { key: 'ready', label: 'Ready', icon: '🍽️', color: 'bg-green-400' },
  { key: 'completed', label: 'Completed', icon: '🎉', color: 'bg-purple-400' },
];
function getOrderStep(status: string) {
  if (!status) return 0;
  if (status === 'pending' || status === 'received') return 0;
  if (status === 'preparing') return 1;
  if (status === 'ready') return 2;
  if (status === 'completed') return 3;
  return 0;
}

const OrderStatusPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [feedback, setFeedback] = useState("");
  const [category, setCategory] = useState<string | null>('tech');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<any>(null);
  const [commentedItems, setCommentedItems] = useState<string[]>([]);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get orderId from URL
  const query = new URLSearchParams(location.search);
  const orderId = query.get("orderId") || "";

  // Fetch order details
  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}/api/orders/${orderId}`
        );
        if (response.ok) {
          const orderData = await response.json();
          setOrder(orderData);
        } else {
          console.error('Failed to fetch order details');
        }
      } catch (error) {
        console.error('Error fetching order:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const handleOrderMore = () => {
    if (order && order.tableNumber && order._id) {
      // Try to extract restaurantId from orderId (if possible) or store it in a cookie when ordering
      // For now, try to get restaurantId from cookie (set during auth)
      const cookie = document.cookie.split('; ').find(row => row.startsWith('restaurantId='));
      const restaurantId = cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
      if (restaurantId) {
        navigate(`/r/${restaurantId}/menu/${order.tableNumber}`);
        return;
      }
    }
    navigate("/menu");
  };

  const handleFeedbackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFeedback(e.target.value);
  };

  const handleCategorySelect = (cat: string) => {
    setCategory(cat);
  };

  const handleSendFeedback = async () => {
    if (!feedback.trim() || !category) return;
    setFeedbackError("");
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}/api/feedback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ message: feedback, category }),
        }
      );
      if (res.ok) {
        setFeedbackSent(true);
        setFeedback("");
        setCategory(null);
        setTimeout(() => setFeedbackSent(false), 3000);
      } else {
        setFeedbackError("Failed to send feedback. Please try again.");
      }
    } catch (err) {
      setFeedbackError("Failed to send feedback. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <div className="text-2xl">Loading order details...</div>
      </div>
    );
  }

  const FALLBACK_IMG = 'https://via.placeholder.com/120?text=No+Image';

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-pink-50">
      {/* Festive header */}
      <div className="w-full flex flex-col items-center mb-6 mt-6">
        <div className="text-4xl sm:text-5xl md:text-6xl mb-3 animate-bounce">🥳</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-center bg-gradient-to-r from-pink-500 via-yellow-500 to-green-400 bg-clip-text text-transparent drop-shadow mb-2 px-4">Thank You for Your Order!</h1>
        <p className="text-base sm:text-lg md:text-xl text-center text-gray-700 max-w-xl mb-3 font-medium px-4">
          We've received your order and our team is preparing it with care.<br />
          You'll get your food soon. Please relax and enjoy your time!
        </p>
      </div>
      {/* Confetti on completed order */}
      {order && order.status === 'completed' && (
        <Confetti width={windowSize.width} height={windowSize.height} numberOfPieces={120} recycle={false} gravity={0.2} />
      )}
      {/* Order Progress Bar */}
      {order && (
        <div className="w-full max-w-lg mb-6 flex flex-col items-center px-4">
          <div className="flex items-center justify-between w-full mb-2">
            {ORDER_STATUS_STEPS.map((step, idx) => {
              const active = idx <= getOrderStep(order.status);
              return (
                <div key={step.key} className="flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full text-lg sm:text-2xl font-bold mb-1 border-4 ${active ? step.color + ' border-opacity-80' : 'bg-gray-200 border-gray-300'}`}>{step.icon}</div>
                  <span className={`text-xs font-semibold text-center ${active ? 'text-gray-800' : 'text-gray-400'}`}>{step.label}</span>
                </div>
              );
            })}
          </div>
          <div className="w-full h-2 rounded-full bg-gray-200 flex overflow-hidden">
            {ORDER_STATUS_STEPS.map((step, idx) => (
              <div key={step.key} className={`${idx <= getOrderStep(order.status) ? step.color : 'bg-gray-200'} flex-1 transition-all duration-300`}></div>
            ))}
          </div>
        </div>
      )}
      {/* Token Number Display */}
      {order && (
        <div className="w-full flex justify-center mb-6 px-4">
          <div className="bg-white/80 shadow-xl rounded-2xl px-4 sm:px-6 py-4 sm:py-5 flex flex-col items-center max-w-xs w-full border border-blue-100 animate-fade-in">
            <div className="flex items-center mb-2">
              <span className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 mr-2 text-2xl sm:text-3xl">🎫</span>
              <span className="text-base sm:text-lg font-bold text-blue-700">Order Token</span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-blue-600 tracking-wider mb-1 drop-shadow">#{order.token}</div>
            <div className="text-xs sm:text-sm text-blue-500 text-center mb-1">Show this to staff to collect your order.</div>
          </div>
        </div>
      )}
      {/* Ordered Items Comment Section */}
      {order && order.items && order.items.length > 0 && (
        <div className="w-full max-w-lg mb-6 px-4">
          <h2 className="text-lg sm:text-xl font-bold mb-3 text-pink-600 flex items-center gap-2"><span>🍽️</span>Your Ordered Items</h2>
          <ul className="space-y-3">
            {order.items.map((item, idx) => (
              <li key={idx} className="flex items-center bg-white/80 rounded-xl px-3 sm:px-4 py-3 shadow gap-3 border border-gray-100">
                <img
                  src={item.menuItem && (item.menuItem as any).imageUrl ? (item.menuItem as any).imageUrl : FALLBACK_IMG}
                  alt={item.menuItem.name}
                  className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-lg border flex-shrink-0"
                  onError={e => (e.currentTarget.src = FALLBACK_IMG)}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-800 truncate text-sm sm:text-base">{item.menuItem.name}</div>
                  <div className="text-xs text-gray-500">Qty: {item.quantity}</div>
                </div>
                {/* Only show comment button if not already commented */}
                {!(commentedItems.includes(item.menuItem._id)) && (
                  <button
                    className="flex items-center gap-1 text-blue-500 hover:text-blue-700 focus:outline-none bg-blue-50 px-2 sm:px-3 py-1 rounded-full font-semibold text-xs sm:text-sm shadow flex-shrink-0"
                    onClick={() => {
                      setSelectedMenuItem(item.menuItem);
                      setCommentModalOpen(true);
                    }}
                    title="Comment on this dish"
                    style={{ minHeight: 32 }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.8l-4.28 1.07A1 1 0 013 19.13l1.07-4.28A9.77 9.77 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    <span className="hidden sm:inline">Comment</span>
                    <span className="sm:hidden">Rate</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
          {selectedMenuItem && commentModalOpen && (
            <CommentModal
              key={selectedMenuItem?._id || selectedMenuItem?.id || 'modal'}
              open={commentModalOpen}
              onClose={() => setCommentModalOpen(false)}
              menuItem={selectedMenuItem}
              mode="submit"
              onCommented={() => {
                setCommentedItems(prev => [...prev, selectedMenuItem._id]);
                setCommentModalOpen(false);
              }}
            />
          )}
        </div>
      )}
      {/* Feedback Section - Responsive */}
      <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 lg:p-7 max-w-lg w-full mb-8 border border-blue-100 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl sm:text-3xl">📱</span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-blue-600 text-center">How was your QR Ordering Experience?</h2>
        </div>
        <p className="text-gray-700 text-center text-sm sm:text-base md:text-lg mb-4 px-2">
          We'd love to know what you think about our <span className="font-semibold text-blue-500">QR-based ordering system</span>!<br />
          Was it easy, fast, and fun? Any suggestions to make it better?<br />
          <span className="italic text-gray-500">Your feedback helps us improve for everyone!</span>
        </p>
        <div className="w-full flex flex-col items-center">
          {/* Only one feedback type, visually highlighted */}
          <div className="w-full max-w-xs mb-4">
            <button
              type="button"
              className={`w-full py-2 sm:py-3 px-3 sm:px-4 rounded-full font-bold text-base sm:text-lg border-2 flex items-center justify-center gap-2 sm:gap-3 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gradient-to-r from-blue-400 to-blue-600 text-white shadow-lg ${category === 'tech' ? 'ring-2 ring-blue-400 scale-105' : ''}`}
              onClick={() => handleCategorySelect('tech')}
              disabled={feedbackSent}
              style={{ minHeight: 44 }}
            >
              <span className="inline-block text-xl sm:text-2xl">📲</span>
              <span className="hidden sm:inline">QR Ordering Experience</span>
              <span className="sm:hidden">QR Experience</span>
            </button>
          </div>
          <input
            type="text"
            value={feedback}
            onChange={handleFeedbackChange}
            placeholder="Type your feedback about the QR process..."
            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 mb-3 text-sm sm:text-base shadow-sm"
            disabled={feedbackSent}
            style={{ minHeight: 44 }}
          />
          <button
            onClick={handleSendFeedback}
            className="w-full bg-gradient-to-r from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 rounded-full transition duration-200 shadow-lg text-base sm:text-lg disabled:opacity-50"
            disabled={feedback.trim() === "" || feedbackSent || !category}
            style={{ minHeight: 44 }}
          >
            <span className="inline-block text-lg sm:text-xl">💬</span> <span className="hidden sm:inline">Send Feedback</span>
            <span className="sm:hidden">Send</span>
          </button>
          {feedbackSent && (
            <div className="text-green-600 mt-3 font-semibold text-sm sm:text-base">Thank you for your feedback! 🙏</div>
          )}
          {feedbackError && (
            <div className="text-red-600 mt-3 font-semibold text-sm sm:text-base">{feedbackError}</div>
          )}
        </div>
      </div>
      {/* Order More Button */}
      <div className="mt-8 mb-8 flex flex-col items-center px-4">
        <div className="text-base sm:text-lg text-gray-700 font-semibold mb-2 flex items-center gap-2"><span>🔄</span>Want to order more?</div>
        <button
          onClick={handleOrderMore}
          className="bg-gradient-to-r from-pink-500 to-yellow-400 hover:from-pink-600 hover:to-yellow-500 text-white font-bold py-2 sm:py-3 px-6 sm:px-8 rounded-full shadow-lg text-base sm:text-lg transition-all duration-200 focus:outline-none"
          style={{ minHeight: 44 }}
        >
          <span className="inline-block text-lg sm:text-xl">➕</span> <span className="hidden sm:inline">Order Again</span>
          <span className="sm:hidden">Order More</span>
        </button>
        <div className="mt-2 text-xs sm:text-sm text-gray-500 text-center">Scan the QR code on your table to start a new order.</div>
      </div>
    </div>
  );
};

export default OrderStatusPage; 
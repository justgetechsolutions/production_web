import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, MessageSquare } from 'react-feather';
import { toast } from 'react-toastify';
import apiClient from '../utils/api-client';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  orderItem?: {
    name: string;
    price: number;
  };
}

interface ChatbotProps {
  restaurantId: string;
  onAddToCart?: (itemName: string) => void;
  cart?: Array<{
    menuItem: {
      _id: string;
      name: string;
      price: number;
    };
    quantity: number;
  }>;
}

const Chatbot: React.FC<ChatbotProps> = ({ restaurantId, onAddToCart, cart = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! 🤖 Ask me anything about our menu, get recommendations, or place orders directly! What would you like to know?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userInput = inputValue.trim().toLowerCase();
    
    // Handle cart-related queries locally
    if (userInput.includes('cart') || userInput.includes('show my cart') || userInput.includes('view cart')) {
      const userMessage: Message = {
        id: Date.now().toString(),
        text: inputValue.trim(),
        isUser: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
      setInputValue('');
      handleCartQuery();
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await apiClient.post('/api/chatbot/chat', {
        message: userMessage.text,
        restaurantId
      });

      const botResponse = response.data.response;
      
      // Check if this is an order response
      const orderMatch = botResponse.match(/ORDER:\s*(.+?)\s*-\s*₹(\d+)/);
      let orderItem = undefined;
      let displayText = botResponse;
      
      if (orderMatch) {
        orderItem = {
          name: orderMatch[1].trim(),
          price: parseInt(orderMatch[2])
        };
        // Remove the ORDER: prefix for display
        displayText = botResponse.replace(/ORDER:\s*(.+?)\s*-\s*₹(\d+)/, '').trim();
        if (!displayText) {
          displayText = `I found "${orderItem.name}" for you! Would you like to add it to your cart?`;
        }
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: displayText,
        isUser: false,
        timestamp: new Date(),
        orderItem
      };

      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm having trouble connecting right now. Please try again in a moment!",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleAddToCart = (itemName: string) => {
    if (onAddToCart) {
      onAddToCart(itemName);
      toast.success(`✅ ${itemName} added to your cart!`);
      
      // Add a confirmation message
      const confirmMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: `Great! I've added ${itemName} to your cart. You can view your cart in the bottom-right corner.`,
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, confirmMessage]);
    }
  };

  const handleCartQuery = () => {
    if (cart.length === 0) {
      const cartMessage: Message = {
        id: (Date.now() + 3).toString(),
        text: "Your cart is empty! Try asking me about our menu items or say 'Order [item name]' to add something.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, cartMessage]);
    } else {
      const total = cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
      const cartMessage: Message = {
        id: (Date.now() + 3).toString(),
        text: `You have ${cart.length} items in your cart totaling ₹${total}. You can view and manage your cart in the bottom-right corner, or continue ordering more items!`,
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, cartMessage]);
    }
  };

  const LoadingDots = () => (
    <div className="flex space-x-1">
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
    </div>
  );

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-40 bg-white/80 backdrop-blur-xl border border-white/60 shadow-2xl rounded-full p-4 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none group"
        style={{ 
          boxShadow: '0 12px 32px 0 rgba(31,38,135,0.18)', 
          backdropFilter: 'blur(16px)',
          minHeight: 64,
          minWidth: 64
        }}
        title="Chat with AI Assistant"
      >
        <span className="text-xl font-semibold text-gray-700">🤖</span>
        {/* Tooltip */}
        <div className="absolute right-full mr-3 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          Ask me anything
        </div>
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-start p-4 lg:p-6">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Chat Container */}
          <div className="relative w-full max-w-sm lg:max-w-md bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 overflow-hidden"
               style={{ 
                 boxShadow: '0 20px 60px 0 rgba(31,38,135,0.15)',
                 backdropFilter: 'blur(20px)',
                 maxHeight: '80vh'
               }}>
            
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-500 via-yellow-400 to-green-400 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-full p-2">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">🤖 Ask me anything!</h3>
                    <p className="text-white/80 text-sm">About the menu, recommendations, or place orders</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="bg-white/20 rounded-full p-2 hover:bg-white/30 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Cart Summary */}
            {cart.length > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-3 border-b border-gray-200/50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-700">🛒 Your Cart ({cart.length} items)</h4>
                  <span className="text-sm font-bold text-green-600">
                    ₹{cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0)}
                  </span>
                </div>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {cart.slice(0, 3).map((item, index) => (
                    <div key={index} className="flex justify-between text-xs text-gray-600">
                      <span>{item.menuItem.name} × {item.quantity}</span>
                      <span>₹{item.menuItem.price * item.quantity}</span>
                    </div>
                  ))}
                  {cart.length > 3 && (
                    <div className="text-xs text-gray-500 italic">
                      +{cart.length - 3} more items...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-96">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-sm px-4 py-3 rounded-2xl shadow-sm ${
                      message.isUser
                        ? 'bg-gradient-to-r from-pink-500 to-yellow-400 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.text}</p>
                    
                    {/* Order Button */}
                    {!message.isUser && message.orderItem && (
                      <div className="mt-3">
                        <div className="bg-white/80 rounded-lg p-2 mb-2">
                          <p className="text-xs text-gray-600 font-medium">{message.orderItem.name}</p>
                          <p className="text-sm font-bold text-green-600">₹{message.orderItem.price}</p>
                        </div>
                        <button
                          onClick={() => handleAddToCart(message.orderItem!.name)}
                          className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-sm"
                        >
                          🛒 Add to Cart
                        </button>
                      </div>
                    )}
                    
                    <p className={`text-xs mt-1 ${message.isUser ? 'text-white/70' : 'text-gray-500'}`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-800 px-4 py-3 rounded-2xl shadow-sm">
                    <LoadingDots />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200/50">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="🤖 Ask me anything..."
                  className="flex-1 px-4 py-3 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className="bg-gradient-to-r from-pink-500 to-yellow-400 text-white p-3 rounded-full shadow-lg hover:from-pink-600 hover:to-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <Send size={18} />
                </button>
              </div>
              
              {/* Quick Suggestions */}
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  'What\'s good for kids?', 
                  'Show me spicy items', 
                  'Best sellers',
                  'Order Paneer Tikka',
                  'Add cold drinks',
                  cart.length > 0 ? 'Show my cart' : 'View cart'
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      if (suggestion.includes('cart')) {
                        setInputValue(suggestion);
                        setTimeout(() => {
                          const userMessage: Message = {
                            id: Date.now().toString(),
                            text: suggestion,
                            isUser: true,
                            timestamp: new Date()
                          };
                          setMessages(prev => [...prev, userMessage]);
                          handleCartQuery();
                        }, 100);
                      } else {
                        setInputValue(suggestion);
                      }
                    }}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot; 
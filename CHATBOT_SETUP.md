# 🤖 MenuBot Chatbot Setup Guide

## Overview
The MenuBot chatbot is a Gemini API-powered assistant that helps customers navigate the restaurant menu, get recommendations, and place orders.

## Features
- ✅ **Menu Assistance**: Ask about menu items, get recommendations
- ✅ **Smart Ordering**: Automatically add items to cart via chat
- ✅ **Sentiment Analysis**: Automatically detect and log customer feedback
- ✅ **Responsive UI**: Matches existing design with soft shadows and gradients
- ✅ **Real-time Chat**: Live conversation with typing indicators

## Setup Instructions

### 1. Backend Setup

#### Install Dependencies
```bash
cd server
npm install @google/generative-ai
```

#### Environment Variables
Add to your `server/.env` file:
```env
# Gemini API Key (Required)
GEMINI_API_KEY=your_gemini_api_key_here

# Other existing variables...
MONGODB_URI=mongodb://localhost:27017/restaurant_app
JWT_SECRET=your_jwt_secret_here
PORT=5000
```

#### Get Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key and add it to your `.env` file

### 2. Frontend Setup

The chatbot component is already integrated into the OrderPage. No additional setup required.

### 3. API Endpoints

The chatbot provides these endpoints:

- `POST /api/chatbot/chat` - Main chat endpoint
- `GET /api/chatbot/history` - Get chat history (session-based)
- `POST /api/chatbot/add-to-cart` - Add item to cart via chatbot

### 4. Usage Examples

#### Customer Questions
- "What's good for kids?"
- "Show me spicy items under ₹150"
- "What's the best-selling dish today?"
- "I want to order Paneer Tikka"
- "Add cold drinks to my cart"

#### Feedback Detection
The chatbot automatically detects feedback messages containing keywords like:
- service, slow, fast, good, bad, terrible, amazing
- cold, hot, fresh, stale, rude, friendly, clean, dirty

## UI Features

### Floating Button
- Positioned in bottom-left corner (avoiding cart button)
- Gradient styling matching existing UI
- Smooth hover animations

### Chat Panel
- Slide-in animation from bottom-left
- Gradient header with bot icon
- Message bubbles with timestamps
- Typing indicators during responses
- Quick suggestion buttons
- Responsive design for mobile/desktop

### Integration
- Seamlessly integrates with existing cart system
- Automatic item detection and addition
- Toast notifications for cart actions
- Non-blocking UI interactions

## Technical Details

### Backend Architecture
- **Controller**: `server/controllers/chatbotController.js`
- **Routes**: `server/routes/chatbotRoutes.js`
- **Models**: Uses existing `MenuItem` and `Feedback` models
- **AI**: Google Gemini Pro model for responses

### Frontend Architecture
- **Component**: `client/src/components/Chatbot.tsx`
- **Integration**: Embedded in `client/src/pages/OrderPage.tsx`
- **Styling**: Tailwind CSS with custom gradients
- **State**: React hooks for chat history and UI state

### Prompt Engineering
The chatbot uses context-aware prompts:
1. **Menu Assistance**: Provides full menu context to Gemini
2. **Sentiment Analysis**: Analyzes feedback for sentiment classification
3. **Order Integration**: Detects ordering intent and triggers cart actions

## Testing

### Manual Testing
1. Start the server: `cd server && npm start`
2. Start the client: `cd client && npm start`
3. Navigate to a restaurant menu page
4. Click the chat button (bottom-left)
5. Try various questions and ordering requests

### Example Test Cases
```javascript
// Menu questions
"What's good for kids?"
"Show me spicy items"
"Best sellers"

// Ordering
"Add cold drinks to my cart"
"I want to order Paneer Tikka"

// Feedback
"Service was slow today"
"Food was amazing!"
```

## Troubleshooting

### Common Issues

1. **"I'm having trouble connecting"**
   - Check if `GEMINI_API_KEY` is set in `.env`
   - Verify the API key is valid
   - Check server logs for errors

2. **Chatbot not appearing**
   - Ensure the component is imported in OrderPage
   - Check browser console for errors
   - Verify the restaurantId is being passed

3. **Items not adding to cart**
   - Check if `onAddToCart` function is properly implemented
   - Verify menu item names match exactly
   - Check browser console for errors

### Debug Mode
Add this to your `.env` for detailed logging:
```env
DEBUG=chatbot:*
```

## Future Enhancements

- [ ] Persistent chat history in database
- [ ] Multi-language support
- [ ] Voice input/output
- [ ] Advanced order customization
- [ ] Integration with payment systems
- [ ] Analytics dashboard for chat insights

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review server logs for error details
3. Verify all environment variables are set correctly
4. Test with a simple message first 
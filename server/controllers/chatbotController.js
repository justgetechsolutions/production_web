const { GoogleGenerativeAI } = require('@google/generative-ai');
const MenuItem = require('../models/MenuItem');
const Feedback = require('../models/Feedback');

// Use the provided API key directly
const GEMINI_API_KEY = 'AIzaSyCcld-BhUy5kZ3rHdsOo857jI2wK-JCAgg';

// Initialize Gemini AI with the provided key
let genAI;
try {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  console.log('✅ Gemini AI initialized successfully with provided API key');
} catch (error) {
  console.error('❌ Failed to initialize Gemini AI:', error.message);
}

const chatbotController = {
  // Main chat endpoint
  async chat(req, res) {
    try {
      const { message, restaurantId } = req.body;
      
      if (!message || !restaurantId) {
        return res.status(400).json({ error: 'Message and restaurantId are required' });
      }

      // Check if Gemini AI is initialized
      if (!genAI) {
        return res.status(500).json({ 
          response: "I'm having trouble with my AI service. Please check the configuration.",
          error: "Gemini AI not initialized"
        });
      }

      // Fetch menu data for the restaurant
      const menuItems = await MenuItem.find({ restaurantId }).select('name description price category tags');
      
      // Construct menu context
      const menuContext = menuItems.map(item => ({
        name: item.name,
        description: item.description || '',
        price: item.price,
        category: item.category || '',
        tags: item.tags || []
      }));

      // Determine if this is a feedback message
      const feedbackKeywords = ['service', 'slow', 'fast', 'good', 'bad', 'terrible', 'amazing', 'cold', 'hot', 'fresh', 'stale', 'rude', 'friendly', 'clean', 'dirty'];
      const isFeedback = feedbackKeywords.some(keyword => 
        message.toLowerCase().includes(keyword)
      );

      let prompt;
      if (isFeedback) {
        // Sentiment analysis prompt
        prompt = `You are a sentiment analysis assistant. Analyze the following customer feedback and classify it as Positive, Neutral, or Negative. Respond with only the classification.

Customer feedback: "${message}"

Classification:`;
      } else {
               // Menu assistance prompt
       prompt = `You are MenuBot, a friendly assistant helping customers in a restaurant.

Here is today's menu:
${menuContext.map(item => `- ${item.name}: ${item.description} (₹${item.price}) [${item.category}] ${item.tags.join(', ')}`).join('\n')}

User asked: "${message}"

Respond in a helpful, short, and friendly tone. Suggest menu items, help with choices, or offer to place an order. Keep responses under 100 words. If suggesting items, mention the price.

IMPORTANT: If the user wants to order something, respond with the exact format:
"ORDER: [item_name] - ₹[price]"

For example:
- If they say "I want to order Paneer Tikka", respond: "ORDER: Paneer Tikka - ₹180"
- If they say "Add cold drinks to cart", respond: "ORDER: Cold Drinks - ₹60"

This helps me add items to their cart automatically.`;
      }

      // Generate response using Gemini with fallback models
      let text;
      const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
      
      for (const modelName of models) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          const response = await result.response;
          text = response.text();
          console.log(`✅ Successfully used model: ${modelName}`);
          break;
        } catch (modelError) {
          console.log(`❌ Model ${modelName} failed:`, modelError.message);
          if (modelName === models[models.length - 1]) {
            throw modelError; // Re-throw if all models fail
          }
        }
      }

      // If it's feedback, save the sentiment
      if (isFeedback) {
        const sentiment = text.trim().toLowerCase();
        if (['positive', 'negative', 'neutral'].includes(sentiment)) {
          await Feedback.create({
            restaurantId,
            message,
            sentiment,
            timestamp: new Date()
          });
        }
      }

      res.json({ 
        response: text,
        isFeedback,
        sentiment: isFeedback ? text.trim().toLowerCase() : null
      });

    } catch (error) {
      console.error('Chatbot error:', error);
      
      // Check if it's an API key error
      if (error.message && error.message.includes('API key not valid')) {
        res.status(500).json({ 
          response: "I'm having trouble with my AI service. Please check the API configuration.",
          error: "Invalid API key - please check the API key configuration"
        });
      } else if (error.message && error.message.includes('not found for API version')) {
        res.status(500).json({ 
          response: "I'm having trouble with my AI model. Please try again in a moment.",
          error: "Model not found - please check the model configuration"
        });
      } else {
        res.status(500).json({ 
          response: "I'm having trouble connecting right now. Please try again in a moment!",
          error: error.message 
        });
      }
    }
  },

  // Get chat history (session-based)
  async getChatHistory(req, res) {
    try {
      // For now, return empty array - in production you'd store this in session/DB
      res.json({ messages: [] });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Add item to cart based on chatbot suggestion
  async addToCart(req, res) {
    try {
      const { itemName, restaurantId } = req.body;
      
      const menuItem = await MenuItem.findOne({ 
        name: { $regex: new RegExp(itemName, 'i') },
        restaurantId 
      });

      if (!menuItem) {
        return res.status(404).json({ error: 'Item not found' });
      }

      res.json({ 
        success: true, 
        item: {
          id: menuItem._id,
          name: menuItem.name,
          price: menuItem.price
        }
      });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = chatbotController; 
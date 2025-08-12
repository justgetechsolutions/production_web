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

      // Determine if this is a feedback message (more specific detection)
      const feedbackKeywords = ['service', 'slow', 'fast', 'bad', 'terrible', 'amazing', 'cold', 'hot', 'fresh', 'stale', 'rude', 'friendly', 'clean', 'dirty'];
      const feedbackPhrases = ['how is the service', 'service is', 'food is cold', 'food is hot', 'rude staff', 'friendly staff'];
      
      const isFeedback = feedbackKeywords.some(keyword => 
        message.toLowerCase().includes(keyword)
      ) || feedbackPhrases.some(phrase => 
        message.toLowerCase().includes(phrase)
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

SPECIFIC GUIDELINES:
- For "What's good for kids?" - suggest mild, non-spicy items that kids typically enjoy
- For "Show me spicy items" - list items with spicy tags or descriptions
- For "Best sellers" - suggest popular items or items with higher ratings
- For "Order [item]" - respond with "ORDER: [item_name] - ₹[price]"
- For "Add [item]" - respond with "ORDER: [item_name] - ₹[price]"

IMPORTANT: If the user wants to order something, respond with the exact format:
"ORDER: [item_name] - ₹[price]"

For example:
- If they say "I want to order Paneer Tikka", respond: "ORDER: Paneer Tikka - ₹180"
- If they say "Add cold drinks to cart", respond: "ORDER: Cold Drinks - ₹60"

This helps me add items to their cart automatically.`;
      }

      // Generate response using Gemini with fallback models
      let text;
      let aiFailed = false;
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
            aiFailed = true;
          }
        }
      }
      
      // If AI failed, use fallback response
      if (aiFailed || !text) {
        try {
          text = generateFallbackResponse(message, menuContext);
          console.log(`✅ Using fallback response for: ${message}`);
        } catch (fallbackError) {
          console.error('Fallback response error:', fallbackError);
          text = "I'm here to help! You can ask me about our menu, get recommendations, or place orders. What would you like to know?";
        }
      }

      // If it's feedback, save it
      if (isFeedback) {
        await Feedback.create({
          restaurantId,
          message,
          category: 'food' // Default to 'food' for restaurant feedback
        });
      }

      // Ensure we always have a response
      if (!text || text.trim() === '') {
        text = "I'm here to help! You can ask me about our menu, get recommendations, or place orders. What would you like to know?";
      }

      res.json({ 
        response: text,
        isFeedback
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

// Fallback response generator for when AI models fail
function generateFallbackResponse(message, menuContext) {
  try {
    const lowerMessage = message.toLowerCase();
    
    // Handle specific default questions
    if (lowerMessage.includes("what's good for kids") || lowerMessage.includes("good for kids")) {
      const kidsItems = menuContext.filter(item => {
        try {
          const tags = item.tags || [];
          const description = item.description || '';
          const category = item.category || '';
          const name = item.name || '';
          
          return !tags.some(tag => tag.toLowerCase().includes('spicy')) &&
                 !description.toLowerCase().includes('spicy') &&
                 (category.toLowerCase().includes('drinks') || 
                  category.toLowerCase().includes('dessert') ||
                  name.toLowerCase().includes('paneer') ||
                  name.toLowerCase().includes('chicken'));
        } catch (e) {
          return false;
        }
      });
      
      if (kidsItems.length > 0) {
        const suggestions = kidsItems.slice(0, 3).map(item => `${item.name} (₹${item.price})`).join(', ');
        return `Great choices for kids! I recommend: ${suggestions}. These are mild and kid-friendly options.`;
      }
      return "For kids, I'd recommend our mild dishes like Paneer Tikka, Butter Chicken, or any of our soft drinks. They're all kid-friendly!";
    }
  
  if (lowerMessage.includes("spicy items") || lowerMessage.includes("spicy")) {
    const spicyItems = menuContext.filter(item => 
      item.tags.some(tag => tag.toLowerCase().includes('spicy')) ||
      item.description.toLowerCase().includes('spicy') ||
      item.name.toLowerCase().includes('chilli') ||
      item.name.toLowerCase().includes('hot')
    );
    
    if (spicyItems.length > 0) {
      const suggestions = spicyItems.slice(0, 3).map(item => `${item.name} (₹${item.price})`).join(', ');
      return `Here are some spicy options: ${suggestions}. These pack some heat! 🔥`;
    }
    return "Our spicy options include Chilli Chicken, Hot Wings, and Spicy Paneer. Perfect if you love some heat! 🔥";
  }
  
  if (lowerMessage.includes("best sellers") || lowerMessage.includes("popular")) {
    const popularItems = menuContext.slice(0, 3).map(item => `${item.name} (₹${item.price})`).join(', ');
    return `Our most popular items are: ${popularItems}. These are customer favorites!`;
  }
  
  if (lowerMessage.includes("order") || lowerMessage.includes("add")) {
    // Try to find the item in the menu
    const itemName = message.replace(/order|add|to cart/gi, '').trim();
    const foundItem = menuContext.find(item => 
      item.name.toLowerCase().includes(itemName.toLowerCase()) ||
      itemName.toLowerCase().includes(item.name.toLowerCase())
    );
    
    if (foundItem) {
      return `ORDER: ${foundItem.name} - ₹${foundItem.price}`;
    }
  }
  
  // Generic fallback
  const randomItems = menuContext.slice(0, 2).map(item => `${item.name} (₹${item.price})`).join(' and ');
  return `I'd be happy to help! You can try our ${randomItems}, or ask me about specific categories like spicy items, kids' options, or best sellers.`;
  } catch (error) {
    console.error('Error in generateFallbackResponse:', error);
    return "I'm here to help! You can ask me about our menu, get recommendations, or place orders. What would you like to know?";
  }
}

module.exports = chatbotController; 
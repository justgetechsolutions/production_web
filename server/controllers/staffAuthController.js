const Staff = require('../models/Staff');
const jwt = require('jsonwebtoken');

const isProd = process.env.NODE_ENV === 'production';
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && !isProd) {
  JWT_SECRET = 'dev-secret';
  console.warn('[staffAuth] JWT_SECRET missing; using development fallback secret');
}

exports.staffLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find staff member by email
    const staff = await Staff.findOne({ email, isActive: true });
    if (!staff) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    // Verify password
    const isPasswordValid = await staff.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    // Update last login
    staff.lastLogin = new Date();
    await staff.save();

    // Generate JWT token with role information
    const token = jwt.sign(
      { 
        staffId: staff._id, 
        email: staff.email, 
        role: staff.role,
        restaurantId: staff.restaurantId,
        name: staff.name
      }, 
      JWT_SECRET, 
      { expiresIn: '8h' }
    );

    // Set cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('staffToken', token, { 
      httpOnly: true, 
      sameSite: isProduction ? 'none' : 'lax', 
      secure: isProduction,
      maxAge: 8 * 60 * 60 * 1000 // 8 hours
    });

    res.json({ 
      message: 'Login successful',
      staff: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        restaurantId: staff.restaurantId
      }
    });

  } catch (err) {
    console.error('Staff login error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.staffLogout = async (req, res) => {
  try {
    res.clearCookie('staffToken');
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getStaffProfile = async (req, res) => {
  try {
    const staff = await Staff.findById(req.staffId).select('-password');
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

// Middleware to verify staff token
exports.verifyStaffToken = async (req, res, next) => {
  try {
    const token = req.cookies.staffToken;
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.staffId = decoded.staffId;
    req.staffRole = decoded.role;
    req.restaurantId = decoded.restaurantId;
    
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Middleware to check if staff has specific role
exports.requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.staffRole) {
      return res.status(401).json({ error: 'Access denied.' });
    }
    
    if (Array.isArray(roles)) {
      if (!roles.includes(req.staffRole)) {
        return res.status(403).json({ error: 'Insufficient permissions.' });
      }
    } else {
      if (req.staffRole !== roles) {
        return res.status(403).json({ error: 'Insufficient permissions.' });
      }
    }
    
    next();
  };
}; 
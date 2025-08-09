const Staff = require('../models/Staff');

exports.getStaff = async (req, res) => {
  try {
    const staff = await Staff.find({ restaurantId: req.restaurantId }).select('-password');
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createStaff = async (req, res) => {
  try {
    const { name, email, phone, role, password } = req.body;
    
    // Check if staff with this email already exists
    const existingStaff = await Staff.findOne({ email });
    if (existingStaff) {
      return res.status(400).json({ error: 'Staff with this email already exists' });
    }

    // Generate default password if not provided
    const defaultPassword = password || 'kitchen123';
    
    const staff = await Staff.create({ 
      restaurantId: req.restaurantId, 
      name, 
      email, 
      phone, 
      role: role || 'kitchen',
      password: defaultPassword
    });

    // Return staff without password
    const staffResponse = staff.toObject();
    delete staffResponse.password;
    
    res.status(201).json(staffResponse);
  } catch (err) {
    console.error('Create staff error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role, password, isActive } = req.body;
    
    const updateData = { name, email, phone, role, isActive };
    if (password) {
      updateData.password = password;
    }

    const staff = await Staff.findOneAndUpdate(
      { _id: id, restaurantId: req.restaurantId },
      updateData,
      { new: true }
    ).select('-password');

    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    res.json(staff);
  } catch (err) {
    console.error('Update staff error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await Staff.findOneAndDelete({ _id: id, restaurantId: req.restaurantId });
    if (!staff) return res.status(404).json({ error: 'Staff not found' });
    res.json({ message: 'Staff deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.resetStaffPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    const staff = await Staff.findOneAndUpdate(
      { _id: id, restaurantId: req.restaurantId },
      { password: newPassword || 'kitchen123' },
      { new: true }
    ).select('-password');

    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    res.json({ message: 'Password reset successfully', staff });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}; 
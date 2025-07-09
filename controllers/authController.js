const bcrypt = require('bcryptjs'); 
const User = require('../models/User');
const VerificationCode = require('../models/VerificationCode');
const { generateToken } = require('../utils/generateToken');
const { sendVerificationEmail, sendResetCodeEmail } = require('../utils/nodemailer');

// ===============================================
//           PUBLIC & USER AUTH FUNCTIONS
// ===============================================

// REGISTER (No changes needed)
exports.register = async (req, res) => {
  try {
    const { email } = req.body;
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }
    await User.create(req.body);
    const code = await VerificationCode.create(email);
    try {
        await sendVerificationEmail(email, code);
    } catch (emailError) {
        console.error('CRITICAL: User was created in DB but FAILED to send verification email.', emailError);
        return res.status(500).json({ error: 'User registered, but failed to send verification email. Please contact support.' });
    }
    res.status(201).json({ message: 'Registered successfully. Please check your email for a verification code.' });
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ error: 'Server error during registration process.' });
  }
};

// VERIFY (No changes needed)
exports.verify = async (req, res) => {
  try {
    const { email, code } = req.body;
    const validCode = await VerificationCode.find(email, code);
    if (!validCode) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }
    await User.setVerified(email);
    await VerificationCode.delete(email);
    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    console.error('Verification Error:', err);
    res.status(500).json({ error: 'Server error during verification.' });
  }
};

// LOGIN (✅ UPDATED TO INCLUDE FAVORITES)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // Step 1: Find the user to check their password
    const userWithPassword = await User.findByEmailWithPassword(email);
    
    if (!userWithPassword) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    
    const isMatch = await bcrypt.compare(password, userWithPassword.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    
    if (!userWithPassword.is_verified) {
      return res.status(403).json({ error: 'Please verify your email before logging in.' });
    }
    
    // --- ✅ THE FIX IS HERE ---
    // Step 2: Now that login is successful, get the full user profile
    // which includes the `favoriteBusinesses` array from your userModel.
    const userProfile = await User.findById(userWithPassword.id);

    // Step 3: Generate the token and send the complete profile
    const token = generateToken(userProfile);
    res.json({
      token,
      user: userProfile // This object now contains the favorites array
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
};

// FORGOT PASSWORD (No changes needed)
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findByEmail(email);
        if (user) {
            const code = await VerificationCode.create(email);
            await sendResetCodeEmail(email, code);
        }
        res.json({ message: 'If a user with that email exists, a reset code has been sent.' });
    } catch (err) {
        console.error('Forgot Password Error:', err);
        res.status(500).json({ error: 'Server error during password reset request.' });
    }
};

// RESET PASSWORD (No changes needed)
exports.resetPassword = async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;
        const validCode = await VerificationCode.find(email, code);
        if (!validCode) {
            return res.status(400).json({ error: 'Invalid or expired reset code.' });
        }
        await User.updatePassword(email, newPassword);
        await VerificationCode.delete(email);
        res.json({ message: 'Password has been reset successfully.' });
    } catch (err) {
        console.error('Reset Password Error:', err);
        res.status(500).json({ error: 'Server error during password reset.' });
    }
};

// GOOGLE LOGIN (✅ UPDATED TO INCLUDE FAVORITES)
exports.googleLogin = async (req, res) => {
    try {
        // Step 1: Find or create the Google user
        const user = await User.findOrCreateGoogleUser(req.body);
        
        // --- ✅ THE FIX IS HERE ---
        // Step 2: Get the complete profile for this user, including favorites
        const userProfile = await User.findById(user.id);
        
        // Step 3: Generate the token and send the complete profile
        const token = generateToken(userProfile);
        res.json({
            token,
            user: userProfile // This object now contains the favorites array
        });
    } catch (err) {
        console.error('Google Login Error:', err);
        res.status(500).json({ error: 'Server error during Google login.' });
    }
};


// ===============================================
//               ADMIN-ONLY FUNCTIONS
// ===============================================
// (No changes needed in any of the admin functions below)

// GET ALL USERS (For Admin)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll();
        res.json(users);
    } catch (err) {
        console.error('Get All Users Error:', err);
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
};

// Admin: Create a new user
exports.createUserAsAdmin = async (req, res) => {
    try {
        const { email, is_verified = false } = req.body;
        
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'User with this email already exists.' });
        }

        const userId = await User.create(req.body);

        if (is_verified) {
            await User.setVerified(email);
        }

        res.status(201).json({ message: 'User created successfully by admin.', userId });
    } catch (err) {
        console.error("Admin Create User Error:", err);
        res.status(500).json({ error: 'Failed to create user.' });
    }
};

// Admin: Update any user's details
exports.updateUserAsAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const success = await User.updateAsAdmin(id, req.body);

        if (!success) {
            return res.status(404).json({ error: 'User not found or no changes made.' });
        }
        res.json({ message: 'User updated successfully by admin.' });
    } catch (err) {
        console.error("Admin Update User Error:", err);
        res.status(500).json({ error: 'Failed to update user.' });
    }
};

// Admin: Delete any user
exports.deleteUserAsAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const success = await User.delete(id);
        if (!success) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json({ message: 'User deleted successfully.' });
    } catch (err) {
        console.error("Admin Delete User Error:", err);
        res.status(500).json({ error: 'Failed to delete user.' });
    }
};
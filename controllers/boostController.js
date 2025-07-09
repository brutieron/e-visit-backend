// controllers/boostController.js

const db = require('../config/db');

// Centralized constant for boost cost. Easy to change in the future.
const BOOST_COST_PER_DAY = 5;

/**
 * @desc    Activates or extends a business boost using EV-Coins.
 * @route   POST /api/boost
 * @access  Private (Business Role)
 */
exports.boostBusiness = async (req, res) => {
  // The frontend now sends 'days' to boost.
  const { businessId, days } = req.body;
  const userId = req.user.id;
  const daysToBoost = parseInt(days, 10);
  
  // --- UPDATED: Calculate the total cost based on the constant ---
  const totalCost = daysToBoost * BOOST_COST_PER_DAY;

  // Basic validation
  if (!businessId || !daysToBoost || daysToBoost < 1) {
    return res.status(400).json({ error: 'Invalid business ID or number of days provided.' });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Get user's coin balance and lock the row
    const [userRows] = await connection.query('SELECT coin_balance FROM users WHERE id = ? FOR UPDATE', [userId]);

    if (userRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'User not found.' });
    }
    const user = userRows[0];
    
    // --- UPDATED: Validate against the new totalCost ---
    if (user.coin_balance < totalCost) {
      await connection.rollback();
      return res.status(400).json({ error: 'Insufficient coin balance.' });
    }

    // 2. Check business ownership
    const [businessRows] = await connection.query(
      'SELECT id, is_boosted, boost_ends_at FROM businesses WHERE id = ? AND user_id = ?', 
      [businessId, userId]
    );
    if (businessRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Business not found or you do not own it.' });
    }
    const business = businessRows[0];
    
    // 3. Calculate new boost end date
    let newBoostEndDate;
    const now = new Date();
    if (business.is_boosted && business.boost_ends_at > now) {
      const currentEndDate = new Date(business.boost_ends_at);
      newBoostEndDate = new Date(currentEndDate.getTime() + daysToBoost * 24 * 60 * 60 * 1000);
    } else {
      newBoostEndDate = new Date(now.getTime() + daysToBoost * 24 * 60 * 60 * 1000);
    }

    // 4. Deduct the calculated cost from user's balance
    await connection.query('UPDATE users SET coin_balance = coin_balance - ? WHERE id = ?', [totalCost, userId]);

    // 5. Update the business boost status
    await connection.query(
      'UPDATE businesses SET is_boosted = TRUE, boost_ends_at = ? WHERE id = ?', 
      [newBoostEndDate, businessId]
    );

    await connection.commit();
    res.json({ message: `Successfully boosted your business for ${daysToBoost} day(s)!` });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error("Boost Failed:", err);
    res.status(500).json({ error: 'An internal error occurred while boosting your business.' });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * @desc    Cancels an active business boost. Does not refund coins.
 * @route   POST /api/boost/cancel
 * @access  Private (Business Role)
 */
exports.cancelBoost = async (req, res) => {
    const { businessId } = req.body;
    const userId = req.user.id;

    if (!businessId) {
        return res.status(400).json({ error: 'Business ID is required.' });
    }

    try {
        // Find the business, ensure the user owns it, and that it's currently boosted.
        const [businessRows] = await db.query(
            'SELECT id FROM businesses WHERE id = ? AND user_id = ? AND is_boosted = TRUE', 
            [businessId, userId]
        );

        if (businessRows.length === 0) {
            return res.status(404).json({ error: 'No active boost found for this business or you do not own it.' });
        }

        // Set the boost to inactive and clear the end date.
        // NOTE: Per standard practice, we DO NOT refund coins for early cancellation.
        await db.query(
            'UPDATE businesses SET is_boosted = FALSE, boost_ends_at = NULL WHERE id = ?',
            [businessId]
        );

        res.json({ message: 'Your business boost has been cancelled successfully.' });

    } catch (err) {
        console.error("Cancel Boost Failed:", err);
        res.status(500).json({ error: 'An internal error occurred while cancelling your boost.' });
    }
};


/**
 * @desc    Scheduled task to check and expire boosts. Run by a cron job.
 * @route   (Internal, not a public route)
 */
exports.checkExpiredBoosts = async () => {
  try {
    const [result] = await db.query(
      "UPDATE businesses SET is_boosted = FALSE, boost_ends_at = NULL WHERE is_boosted = TRUE AND boost_ends_at < NOW()"
    );
    if (result.changedRows > 0) {
      console.log(`Successfully expired ${result.changedRows} business boost(s).`);
    } else {
      console.log("No business boosts to expire.");
    }
  } catch (error) {
    console.error("Error checking for expired boosts:", error);
  }
};
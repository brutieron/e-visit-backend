const db = require('../config/db');
const { subDays, format } = require('date-fns');

exports.getAdminDashboardStats = async (req, res) => {
    try {
        const period = req.query.period || '30days'; // Default to last 30 days
        let startDate;

        if (period === '7days') {
            startDate = subDays(new Date(), 7);
        } else if (period === '90days') {
            startDate = subDays(new Date(), 90);
        } else {
            startDate = subDays(new Date(), 30);
        }

        const formattedStartDate = format(startDate, 'yyyy-MM-dd HH:mm:ss');
        
        // This where clause is now ONLY for the charts, not for the total counts.
        const whereClauseForCharts = `WHERE created_at >= ?`;

        // Parallel queries for efficiency.
        // We now fetch ALL necessary stats.
        const [
            totalUserCount,         // CORRECTED: All-time total users
            totalBusinessCount,     // CORRECTED: All-time total businesses
            totalCityCount,
            newCollaborationsCount,
            newContactsCount,       // ADDED: Count for contacts
            activeCategoriesCount,  // ADDED: Count for categories
            userGrowth,
            businessGrowth
        ] = await Promise.all([
            // --- STAT CARD QUERIES ---
            db.query("SELECT COUNT(*) as count FROM users"),
            db.query("SELECT COUNT(*) as count FROM businesses"),
            db.query("SELECT COUNT(*) as count FROM cities"),
            db.query("SELECT COUNT(*) as count FROM collaborations WHERE status = 'new'"),
            db.query("SELECT COUNT(*) as count FROM contacts"), // <-- ADDED THIS QUERY
            db.query("SELECT COUNT(*) as count FROM categories"), // <-- ADDED THIS QUERY

            // --- CHART QUERIES (These correctly use the time period) ---
            db.query(`SELECT DATE(created_at) as date, COUNT(*) as count FROM users ${whereClauseForCharts} GROUP BY DATE(created_at) ORDER BY date ASC`, [formattedStartDate]),
            db.query(`SELECT DATE(created_at) as date, COUNT(*) as count FROM businesses ${whereClauseForCharts} GROUP BY DATE(created_at) ORDER BY date ASC`, [formattedStartDate]),
        ]);

        // Assemble the complete stats object for the frontend
        const stats = {
            totalUsers: totalUserCount[0][0].count,
            totalBusinesses: totalBusinessCount[0][0].count,
            totalCities: totalCityCount[0][0].count,
            newCollaborations: newCollaborationsCount[0][0].count,
            newContacts: newContactsCount[0][0].count,           // <-- ADDED THIS PROPERTY
            activeCategories: activeCategoriesCount[0][0].count, // <-- ADDED THIS PROPERTY
            charts: {
                userGrowth: userGrowth[0],
                businessGrowth: businessGrowth[0],
            }
        };

        res.json(stats);

    } catch (err) {
        console.error("Get Admin Stats Error:", err);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics.' });
    }
};
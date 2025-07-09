const City = require('../models/City');

// GET ALL CITIES
// This can be a public route, as everyone needs to see the list of cities.
exports.getAllCities = async (req, res) => {
    try {
        const cities = await City.findAll();
        res.json(cities);
    } catch (err) {
        console.error("Get All Cities Error:", err);
        res.status(500).json({ error: 'Failed to fetch cities.' });
    }
};

// GET A SINGLE CITY (by slug, for public pages)
exports.getCityBySlug = async (req, res) => {
    try {
        const city = await City.findBySlug(req.params.slug);
        if (!city) {
            return res.status(404).json({ error: 'City not found.' });
        }
        res.json(city);
    } catch (err) {
        console.error("Get City by Slug Error:", err);
        res.status(500).json({ error: 'Failed to fetch city data.' });
    }
}


// ------------------ ADMIN-ONLY FUNCTIONS ------------------

// ADD A NEW CITY (Admin)
exports.addCity = async (req, res) => {
    try {
        const cityId = await City.create(req.body);
        res.status(201).json({ message: 'City added successfully', cityId });
    } catch (err) {
        // A more specific error for duplicate slugs
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'A city with this slug already exists.' });
        }
        console.error("Add City Error:", err);
        res.status(500).json({ error: 'Failed to add city.' });
    }
};

// EDIT A CITY (Admin)
exports.editCity = async (req, res) => {
    try {
        const { id } = req.params;
        const success = await City.update(id, req.body);
        if (!success) {
            return res.status(404).json({ error: 'City not found or no changes were made.' });
        }
        res.json({ message: 'City updated successfully.' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'A city with this slug already exists.' });
        }
        console.error("Edit City Error:", err);
        res.status(500).json({ error: 'Failed to update city.' });
    }
};

// DELETE A CITY (Admin)
exports.deleteCity = async (req, res) => {
    try {
        const { id } = req.params;
        const success = await City.delete(id);
        if (!success) {
            return res.status(404).json({ error: 'City not found.' });
        }
        res.json({ message: 'City deleted successfully.' });
    } catch (err) {
        console.error("Delete City Error:", err);
        res.status(500).json({ error: 'Failed to delete city.' });
    }
};
const db = require('../db');

const applyFilters = async (req, res) => {
  const { CustomerDate, EntryType, Party, Referencer, Category, GroupCategory, PaymentMode, Grade, CustomerField } = req.query;

  // Validate filters
  if (!CustomerDate) {
    return res.status(400).json({ error: 'CustomerDate is required' });
  }

  try {
    // Construct the query based on the filters
    let query = 'SELECT * FROM payment_entries WHERE created_at LIKE ?';
    const params = [`${CustomerDate}%`];

    if (EntryType) {
      query += ' AND receipt_type = ?';
      params.push(EntryType);
    }
    if (Party) {
      query += ' AND party = ?';
      params.push(Party);
    }
    if (Referencer) {
      query += ' AND reference_name = ?';
      params.push(Referencer);
    }
    if (Category) {
      query += ' AND category_name = ?';
      params.push(Category);
    }
    if (GroupCategory) {
      query += ' AND group_category = ?';
      params.push(GroupCategory);
    }
    if (PaymentMode) {
      query += ' AND payment_mode = ?';
      params.push(PaymentMode);
    }
    if (Grade) {
      query += ' AND grade = ?';
      params.push(Grade);
    }
    if (CustomerField) {
      query += ' AND customer_field = ?';
      params.push(CustomerField);
    }

    // Execute the query
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  applyFilters,
};
const db = require("../db");

// ✅ Add a new invoice (Sales, Sales Return, Purchase, Purchase Return)
exports.addInvoice = async (req, res) => {
    try {
        const { type, customer_or_supplier, invoice_date, discount_amount, percentage, round_off, items } = req.body;

        // Calculate total taxable amount
        let total_taxable = items.reduce((sum, item) => sum + parseFloat(item.taxable_amount), 0);

        // Calculate CGST, SGST, IGST (Assuming 18% GST)
        let total_cgst = (total_taxable * 9) / 100;
        let total_sgst = (total_taxable * 9) / 100;
        let total_igst = (total_taxable * 18) / 100;

        // Calculate total amount
        let total_amount = total_taxable + total_cgst + total_sgst - discount_amount + round_off;

        // Insert invoice into invoices table
        const [result] = await db.query(
            `INSERT INTO invoices (type, customer_or_supplier, invoice_date, total_taxable, cgst, sgst, igst, total_amount, discount_amount, percentage, round_off)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [type, customer_or_supplier, invoice_date, total_taxable, total_cgst, total_sgst, total_igst, total_amount, discount_amount, percentage, round_off]
        );

        const invoiceId = result.insertId; // Get inserted invoice ID

        // Insert items into invoice_items table
        for (let item of items) {
            await db.query(
                `INSERT INTO invoice_items (invoice_id, item_name, hsn_code, quantity_unit, rate_per_unit, tax_rate, taxable_amount)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [invoiceId, item.item_name, item.hsn_code, item.quantity_unit, item.rate_per_unit, item.tax_rate, item.taxable_amount]
            );
        }

        res.status(201).json({ message: "Invoice added successfully", invoiceId });
    } catch (error) {
        console.error("Error adding invoice:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// ✅ Get all invoices (Sales, Sales Return, Purchase, Purchase Return)

exports.getInvoices = async (req, res) => {
    try {
        const { type } = req.query;

        // Fetch invoices based on type (if provided)
        let sql = `SELECT * FROM invoices`;
        if (type) {
            sql += ` WHERE type = '${type}'`;
        }

        const [invoices] = await db.query(sql);
        res.status(200).json({ invoices });
    } catch (error) {
        console.error("Error fetching invoices:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// ✅ Get single invoice details (including items)
exports.getInvoiceById = async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch invoice details
        const [invoice] = await db.query(`SELECT * FROM invoices WHERE id = ?`, [id]);
        if (invoice.length === 0) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        // Fetch items for the invoice
        const [items] = await db.query(`SELECT * FROM invoice_items WHERE invoice_id = ?`, [id]);

        res.status(200).json({ invoice: invoice[0], items });
    } catch (error) {
        console.error("Error fetching invoice:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

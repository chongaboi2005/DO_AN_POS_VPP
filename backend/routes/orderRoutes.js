module.exports = function (app, db, io) {
    const queryAsync = (sql, params) => {
        return new Promise((resolve, reject) => {
            db.query(sql, params, (err, result) => err ? reject(err) : resolve(result));
        });
    };

    // GIAO DỊCH VÀ ĐƠN HÀNG
    app.get('/orders', (req, res) => {
        db.query("SELECT * FROM orders WHERE order_type = 'online' ORDER BY created_at DESC", (err, results) => res.json(results || []));
    });
    app.get('/transactions', (req, res) => {
        const { role, cashier_name } = req.query;
        let sql = "SELECT * FROM orders ORDER BY created_at DESC";
        let params = [];
        if (role === 'cashier') {
            sql = "SELECT * FROM orders WHERE order_type = 'online' OR (order_type = 'offline' AND cashier_name = ?) ORDER BY created_at DESC";
            params = [cashier_name];
        }
        db.query(sql, params, (err, results) => res.json(results || []));
    });
    app.get('/customer/orders', (req, res) => {
        if (!req.query.username) return res.status(400).json({ error: "Thiếu username" });
        db.query("SELECT * FROM orders WHERE customer_username = ? ORDER BY created_at DESC", [req.query.username], (err, results) => res.json(results || []));
    });
    app.get('/orders/:id/items', (req, res) => {
        db.query("SELECT * FROM order_items WHERE order_id = ?", [req.params.id], (err, results) => res.json(results || []));
    });

    // API TẠO ĐƠN HÀNG
    app.post('/orders', async (req, res) => {
        const { customer_name, customer_phone, customer_address, customer_username, username, cashier_name, voucher_code, amount_tendered, total_amount, discount_amount, shipping_fee, final_total, payment_method, order_type, status, items } = req.body;
        const orderStatus = status || 'pending';
        const orderId = Math.floor(10000000 + Math.random() * 90000000).toString();
        db.getConnection((err, conn) => {
            if (err) return res.status(500).json({ error: "Lỗi kết nối máy chủ cơ sở dữ liệu!" });
            conn.beginTransaction(async (transactionErr) => {
                if (transactionErr) {
                    conn.release();
                    return res.status(500).json({ error: "Không thể khởi tạo giao dịch!" });
                }
                const connQueryAsync = (sql, params) => new Promise((resolve, reject) => {
                    conn.query(sql, params, (err, result) => err ? reject(err) : resolve(result));
                });
                try {
                    if (items && items.length > 0) {
                        for (let item of items) {
                            const qty = item.quantity || item.qty;
                            const updateQuery = "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?";
                            const result = await connQueryAsync(updateQuery, [qty, item.id, qty]);
                            if (result.affectedRows === 0) {
                                throw new Error(`Rất tiếc! Sản phẩm [${item.name}] đã hết!`);
                            }
                        }
                    }
                    const sqlOrder = `INSERT INTO orders (id, customer_name, customer_phone, customer_address, customer_username, username, cashier_name, voucher_code, amount_tendered, total_amount, discount_amount, shipping_fee, final_total, payment_method, order_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                    await connQueryAsync(sqlOrder, [orderId, customer_name, customer_phone, customer_address, customer_username || null, username || null, cashier_name || '', voucher_code || '', amount_tendered || final_total, total_amount, discount_amount, shipping_fee, final_total, payment_method, order_type, orderStatus]);
                    if (items && items.length > 0) {
                        const sqlItems = `INSERT INTO order_items (order_id, product_name, barcode, quantity, price) VALUES ?`;
                        const itemValues = items.map(item => [orderId, item.name, item.barcode || null, item.quantity || item.qty, item.price]);
                        await connQueryAsync(sqlItems, [itemValues]);
                    }
                    conn.commit((commitErr) => {
                        if (commitErr) {
                            return conn.rollback(() => {
                                conn.release();
                                res.status(500).json({ error: "Lỗi lưu dữ liệu hóa đơn!" });
                            });
                        }
                        conn.release();
                        if (order_type === 'online') {
                            io.emit('new_order', { id: orderId, customer_name, customer_phone, customer_address, customer_username, username, final_total, order_type, payment_method, status: orderStatus, created_at: new Date() });
                        }
                        res.json({ message: 'Lưu đơn hàng thành công!', orderId });
                    });
                } catch (error) {
                    conn.rollback(() => {
                        conn.release();
                        res.status(400).json({ error: error.message || "Đã xảy ra lỗi khi tạo đơn hàng!" });
                    });
                }
            });
        });
    });

    // API CẬP NHẬT TRẠNG THÁI & HỦY ĐƠN HÀNG
    app.put('/orders/:id/status', async (req, res) => {
        const { status, cashier_name, username } = req.body;
        const orderId = req.params.id;
        db.getConnection((err, conn) => {
            if (err) return res.status(500).json({ error: "Lỗi kết nối máy chủ!" });
            conn.beginTransaction(async (transactionErr) => {
                if (transactionErr) {
                    conn.release();
                    return res.status(500).json({ error: "Lỗi tạo transaction!" });
                }
                const connQueryAsync = (sql, params) => new Promise((resolve, reject) => {
                    conn.query(sql, params, (err, result) => err ? reject(err) : resolve(result));
                });
                try {
                    let sql = cashier_name ? 'UPDATE orders SET status = ?, cashier_name = ?, username = ? WHERE id = ?' : 'UPDATE orders SET status = ? WHERE id = ?';
                    let params = cashier_name ? [status, cashier_name, username, orderId] : [status, orderId];
                    await connQueryAsync(sql, params);
                    if (status === 'cancelled') {
                        const items = await connQueryAsync("SELECT * FROM order_items WHERE order_id = ?", [orderId]);
                        if (items && items.length > 0) {
                            for (let item of items) {
                                await connQueryAsync("UPDATE products SET stock = stock + ? WHERE barcode = ? OR name = ?", [item.quantity, item.barcode, item.product_name]);
                            }
                        }
                    }
                    conn.commit((commitErr) => {
                        if (commitErr) {
                            return conn.rollback(() => {
                                conn.release();
                                res.status(500).json({ error: "Lỗi cập nhật!" });
                            });
                        }
                        conn.release();
                        io.emit('order_updated', { id: orderId, status, cashier_name, username });
                        res.json({ message: 'Cập nhật trạng thái thành công!' });
                    });
                } catch (error) {
                    conn.rollback(() => {
                        conn.release();
                        res.status(500).json({ error: error.message });
                    });
                }
            });
        });
    });

    // NHẬP KHO
    app.get('/imports', (req, res) => {
        db.query("SELECT * FROM inventory_imports ORDER BY created_at DESC", (err, results) => res.json(results || []));
    });
    app.get('/imports/:id/items', (req, res) => {
        db.query("SELECT * FROM inventory_import_items WHERE import_id = ?", [req.params.id], (err, results) => res.json(results || []));
    });
    app.post('/imports', async (req, res) => {
        const { username, creator_name, supplier_name, items } = req.body;
        if (!items || items.length === 0) return res.status(400).json({ error: "Phiếu nhập rỗng!" });
        const total_quantity = items.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0);
        const importId = Math.floor(10000000 + Math.random() * 90000000).toString();
        db.getConnection((err, conn) => {
            if (err) return res.status(500).json({ error: "Lỗi kết nối database!" });
            conn.beginTransaction(async (transactionErr) => {
                if (transactionErr) {
                    conn.release();
                    return res.status(500).json({ error: "Lỗi tạo transaction!" });
                }
                const connQueryAsync = (sql, params) => new Promise((resolve, reject) => {
                    conn.query(sql, params, (err, result) => err ? reject(err) : resolve(result));
                });
                try {
                    await connQueryAsync("INSERT INTO inventory_imports (id, username, creator_name, supplier_name, total_quantity) VALUES (?, ?, ?, ?, ?)", [importId, username, creator_name, supplier_name || 'Xưởng sản xuất', total_quantity]);
                    const sqlItems = "INSERT INTO inventory_import_items (import_id, barcode, product_name, quantity) VALUES ?";
                    const itemValues = items.map(item => [importId, item.barcode || null, item.product_name, parseInt(item.quantity)]);
                    await connQueryAsync(sqlItems, [itemValues]);
                    for (let item of items) {
                        await connQueryAsync("UPDATE products SET stock = stock + ? WHERE barcode = ? OR name = ?", [parseInt(item.quantity), item.barcode, item.product_name]);
                    }
                    conn.commit((commitErr) => {
                        if (commitErr) {
                            return conn.rollback(() => {
                                conn.release();
                                res.status(500).json({ error: "Lỗi commit kho!" });
                            });
                        }
                        conn.release();
                        res.json({ message: "Nhập kho thành công!", importId });
                    });
                } catch (error) {
                    conn.rollback(() => {
                        conn.release();
                        res.status(500).json({ error: error.message });
                    });
                }
            });
        });
    });

    // THỐNG KÊ VÀ THÔNG TIN CỬA HÀNG
    app.get('/statistics', (req, res) => {
        db.query("SELECT * FROM orders WHERE status != 'cancelled'", (err, orders) => {
            db.query("SELECT oi.product_name, oi.quantity, oi.price, o.created_at FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE o.status != 'cancelled'", (err, items) => {
                res.json({ orders: orders || [], items: items || [] });
            });
        });
    });
    app.get('/api/store-info', (req, res) => {
        db.query("SELECT * FROM store_info WHERE id = 1", (err, results) => res.json(results[0] || {}));
    });
    app.put('/api/store-info', (req, res) => {
        const { name, address, hotline, email, operating_hours } = req.body;
        db.query("INSERT INTO store_info (id, name, address, hotline, email, operating_hours) VALUES (1, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), address=VALUES(address), hotline=VALUES(hotline), email=VALUES(email), operating_hours=VALUES(operating_hours)",
            [name, address, hotline, email, operating_hours], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true });
            });
    });
};
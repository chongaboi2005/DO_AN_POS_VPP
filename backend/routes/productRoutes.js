const fs = require("fs");
const path = require("path");
module.exports = function (app, db, uploadProduct, uploadBlog) {
    const FEATURED_FILE = path.join(__dirname, "../featured_products.json");
    //UPLOAD ẢNH SẢN PHẨM
    app.post("/upload", uploadProduct.single("image"), (req, res) => {
        if (!req.file)
            return res.status(400).json({ error: "Không tìm thấy file ảnh!" });
        res.json({ imageUrl: `/products/${req.file.filename}` });
    });

    //DANH MỤC SẢN PHẨM
    app.get("/categories", (req, res) => {
        db.query("SELECT * FROM categories", (err, results) => {
            if (err) return res.status(500).json({ message: "Lỗi lấy danh mục" });
            res.json(results);
        });
    });
    app.get("/products", (req, res) => {
        const sql = `
            SELECT p.*,
                COALESCE((SELECT SUM(oi.quantity)
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                WHERE oi.product_name = p.name AND o.status != 'cancelled'), 0) AS sold
            FROM products p
            WHERE p.status = 'active'
        `;
        db.query(sql, (err, results) => {
            if (err) return res.status(500).json({ message: "Lỗi lấy sản phẩm" });
            res.json(results);
        });
    });
    app.post("/products", (req, res) => {
        const { barcode, name, price, image_url, category_id, description, stock } =
            req.body;
        if (!name || price === undefined || price < 0)
            return res
                .status(400)
                .json({ error: "Tên và giá sản phẩm không hợp lệ!" });
        const sql =
            "INSERT INTO products (barcode, name, price, image_url, category_id, description, stock) VALUES (?, ?, ?, ?, ?, ?, ?)";
        db.query(
            sql,
            [
                barcode || "",
                name,
                price,
                image_url,
                category_id,
                description || "",
                stock || 0,
            ],
            (err, result) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: "Thêm sản phẩm thành công!", id: result.insertId });
            },
        );
    });
    app.put("/products/:id", (req, res) => {
        const { barcode, name, price, image_url, category_id, description, stock } =
            req.body;
        let sql =
            "UPDATE products SET barcode=?, name=?, image_url=?, category_id=?, description=?, stock=? WHERE id=?";
        let params = [
            barcode || "",
            name,
            image_url,
            category_id,
            description || "",
            stock,
            req.params.id,
        ];
        if (price !== undefined) {
            sql =
                "UPDATE products SET barcode=?, name=?, price=?, image_url=?, category_id=?, description=?, stock=? WHERE id=?";
            params = [
                barcode || "",
                name,
                price,
                image_url,
                category_id,
                description || "",
                stock,
                req.params.id,
            ];
        }
        db.query(sql, params, (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Cập nhật sản phẩm thành công!" });
        });
    });
    app.delete("/products/:id", (req, res) => {
        db.query(
            "SELECT image_url FROM products WHERE id = ?",
            [req.params.id],
            (err, results) => {
                if (err) return res.status(500).json({ error: err.message });
                const imageUrl = results[0]?.image_url;
                db.query(
                    "UPDATE products SET status = 'inactive', image_url = '' WHERE id = ?",
                    [req.params.id],
                    (updateErr) => {
                        if (updateErr)
                            return res.status(500).json({ error: updateErr.message });
                        if (imageUrl) {
                            const filePath = path.join(
                                __dirname,
                                "../../frontend/public",
                                imageUrl,
                            );
                            if (fs.existsSync(filePath)) {
                                fs.unlinkSync(filePath);
                            }
                        }
                        res.json({ message: "Đã ngừng kinh doanh!" });
                    }
                );
            }
        );
    });

    //QUẢN LÝ BLOG
    app.get("/blogs", (req, res) => {
        db.query("SELECT * FROM blogs ORDER BY id DESC", (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        });
    });
    app.post("/blogs", uploadBlog.single("image"), (req, res) => {
        const image_url = req.file ? `/blogs/${req.file.filename}` : "";
        db.query(
            "INSERT INTO blogs (title, description, image_url) VALUES (?, ?, ?)",
            [req.body.title, req.body.description, image_url],
            (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true });
            },
        );
    });
    app.put("/blogs/:id", uploadBlog.single("image"), (req, res) => {
        if (req.file) {
            db.query(
                "UPDATE blogs SET title=?, description=?, image_url=? WHERE id=?",
                [
                    req.body.title,
                    req.body.description,
                    `/blogs/${req.file.filename}`,
                    req.params.id,
                ],
                (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true });
                },
            );
        } else {
            db.query(
                "UPDATE blogs SET title=?, description=? WHERE id=?",
                [req.body.title, req.body.description, req.params.id],
                (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true });
                },
            );
        }
    });
    app.delete("/blogs/:id", (req, res) => {
        db.query(
            "SELECT image_url FROM blogs WHERE id = ?",
            [req.params.id],
            (err, results) => {
                if (err) return res.status(500).json({ error: err.message });
                const imageUrl = results[0]?.image_url;
                db.query(
                    "DELETE FROM blogs WHERE id = ?",
                    [req.params.id],
                    (deleteErr) => {
                        if (deleteErr)
                            return res
                                .status(500)
                                .json({ success: false, error: deleteErr.message });
                        if (imageUrl) {
                            const filePath = path.join(
                                __dirname,
                                "../../frontend/public",
                                imageUrl,
                            );
                            if (fs.existsSync(filePath)) {
                                fs.unlinkSync(filePath);
                            }
                        }
                        res.json({ success: true });
                    },
                );
            },
        );
    });

    //QUẢN LÝ VOUCHER
    app.get("/vouchers", (req, res) => {
        db.query("SELECT * FROM vouchers WHERE status = 'active'", (err, results) =>
            res.json(results || []),
        );
    });
    app.post("/vouchers", (req, res) => {
        const {
            code,
            type,
            category_id,
            min_order,
            discount_type,
            discount_value,
            max_discount,
            description,
        } = req.body;
        db.query(
            "INSERT INTO vouchers (code, type, category_id, min_order, discount_type, discount_value, max_discount, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
                code.toUpperCase(),
                type,
                category_id || null,
                min_order ? parseInt(min_order) : 0.00,
                discount_type,
                parseInt(discount_value),
                max_discount ? parseInt(max_discount) : null,
                description,
            ],
            (err) => {
                if (err)
                    return res.status(400).json({ error: "Mã giảm giá này đã tồn tại!" });
                res.json({ message: "Thêm thành công!" });
            },
        );
    });
    app.put("/vouchers/:id", (req, res) => {
        const {
            code,
            type,
            category_id,
            min_order,
            discount_type,
            discount_value,
            max_discount,
            description,
        } = req.body;
        db.query(
            "UPDATE vouchers SET code=?, type=?, category_id=?, min_order=?, discount_type=?, discount_value=?, max_discount=?, description=? WHERE id=?",
            [
                code,
                type,
                category_id || null,
                min_order,
                discount_type,
                discount_value,
                max_discount || null,
                description,
                req.params.id,
            ],
            (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true });
            },
        );
    });
    app.delete("/vouchers/:id", (req, res) => {
        db.query("UPDATE vouchers SET status = 'inactive' WHERE id = ?", [req.params.id], (err) =>
            res.json({ message: "Đã ngừng áp dụng mã giảm giá!" }),
        );
    });

    //SẢN PHẨM NỔI BẬT
    app.get("/api/featured-products", (req, res) => {
        if (fs.existsSync(FEATURED_FILE)) {
            const data = fs.readFileSync(FEATURED_FILE, "utf8");
            return res.json(JSON.parse(data));
        }
        res.json([]);
    });
    app.post("/api/featured-products", (req, res) => {
        fs.writeFileSync(
            FEATURED_FILE,
            JSON.stringify(req.body.featured, null, 2),
            "utf8",
        );
        res.json({ success: true, message: "Đã lưu!" });
    });
};

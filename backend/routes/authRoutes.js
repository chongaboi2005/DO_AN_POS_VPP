module.exports = function (app, db, nodemailer, io) {
    // ĐĂNG KÝ/ĐĂNG NHẬP
    app.post('/register', (req, res) => {
        const emailRegex = /^(?!.*\.\.)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (email && !emailRegex.test(email)) {
            return res.status(400).json({ error: "Email sai định dạng!" });
        }
        const { displayName, username, email, password } = req.body;
        const sql = `INSERT INTO users (display_name, username, email, password) VALUES (?, ?, ?, SHA2(?, 256))`;
        db.query(sql, [displayName, username, email, password], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    if (err.message.includes('email')) {
                        return res.status(400).json({ message: "Email đã được dùng cho tài khoản khác!" });
                    }
                    return res.status(400).json({ message: "Tên đăng nhập này đã có người dùng!" });
                }
                return res.status(500).json({ message: "Lỗi máy chủ: " + err.message });
            }
            return res.status(200).json({ message: "Đăng ký thành công!" });
        });
    });
    app.post('/login', (req, res) => {
        const { username, password } = req.body;
        db.query("SELECT * FROM users WHERE username = ? AND password = SHA2(?, 256)", [username, password], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length > 0) {
                const user = results[0];
                if (user.status === 'locked') return res.status(403).json({ error: "Tài khoản bị khóa!" });
                res.json({ message: "Đăng nhập thành công!", user: { display_name: user.display_name, role: user.role, username: user.username } });
            } else {
                res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu!" });
            }
        });
    });
    app.post('/api/forgot-password', (req, res) => {
        const { email } = req.body;
        const emailRegex = /^(?!.*\.\.)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (email && !emailRegex.test(email)) {
            return res.status(400).json({ error: "Email sai định dạng!" });
        }
        db.query("SELECT * FROM users WHERE email = ?", [email], (err, users) => {
            if (err) return res.status(500).json({ error: "Lỗi máy chủ!" });
            if (users.length === 0) return res.status(404).json({ error: "Email chưa đăng ký trong hệ thống!" });
            const username = users[0].username;
            const newPassword = Math.random().toString(36).slice(-8);
            db.query("UPDATE users SET password = SHA2(?, 256) WHERE email = ?", [newPassword, email], (updateErr) => {
                if (updateErr) return res.status(500).json({ error: "Không thể cập nhật mật khẩu!" });
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    }
                });
                const mailOptions = {
                    from: '"Hệ thống QUEEN STATIONERY" <no-reply@queenstationery.com>',
                    to: email,
                    subject: 'Khôi phục mật khẩu tài khoản QUEEN STATIONERY',
                    html: `
                        <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                            <div style="text-align: center; margin-bottom: 20px;">
                                <h2 style="color: #1e3a8a; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px;">QUEEN STATIONERY</h2>
                                <p style="color: #6b7280; font-size: 14px; margin-top: 5px;">Hệ thống mua sắm văn phòng phẩm trực tuyến</p>
                            </div>
                            
                            <hr style="border: 0; border-top: 2px solid #eff6ff; margin: 20px 0;">
                            
                            <p style="font-size: 16px; color: #374151;">Kính chào Quý khách,</p>
                            <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">Chúng tôi vừa nhận được yêu cầu khôi phục mật khẩu cho tài khoản liên kết với địa chỉ email này. Dưới đây là thông tin đăng nhập mới của Quý khách:</p>
                            
                            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #2563eb;">
                                <p style="margin: 0 0 12px 0; font-size: 15px; color: #4b5563;">Tên đăng nhập: <strong style="color: #1e3a8a; font-size: 16px;">${username}</strong></p>
                                <p style="margin: 0; font-size: 15px; color: #4b5563;">Mật khẩu mới: <strong style="color: #dc2626; font-size: 18px; padding: 4px 10px; background: #fee2e2; border-radius: 4px; letter-spacing: 2px;">${newPassword}</strong></p>
                            </div>

                            <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">
                                <span style="font-size: 16px;">⚠️</span> <strong>Lưu ý bảo mật:</strong> Để đảm bảo an toàn, Quý khách vui lòng tiến hành <strong>đổi lại mật khẩu cá nhân</strong> ngay sau khi đăng nhập thành công.
                            </p>
                            
                            <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin-top: 20px;">
                                Nếu Quý khách không thực hiện yêu cầu này, vui lòng bỏ qua email hoặc liên hệ trực tiếp qua Hotline <strong>(+8428) 39733381</strong> để được hỗ trợ.
                            </p>
                            
                            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0 20px 0;">
                            
                            <div style="text-align: center; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                                <p style="margin: 0 0 5px 0;">Đây là email gửi tự động từ hệ thống, Quý khách vui lòng không phản hồi email này.</p>
                                <p style="margin: 0;">Trân trọng, <strong>Đội ngũ QUEEN STATIONERY</strong>.</p>
                            </div>
                        </div>
                    `
                };
                transporter.sendMail(mailOptions, (mailErr, info) => {
                    if (mailErr) {
                        console.error("Lỗi gửi mail:", mailErr);
                        return res.status(500).json({ error: "Lỗi mạng, không thể gửi email!" });
                    }
                    res.json({ message: "Đã gửi! Vui lòng kiểm tra hộp thư!" });
                });
            });
        });
    });

    // API ĐỔI MẬT KHẨU
    app.put('/api/change-password', (req, res) => {
        const { username, old_password, new_password } = req.body;
        db.query("SELECT * FROM users WHERE username = ? AND password = SHA2(?, 256)", [username, old_password], (err, results) => {
            if (err) return res.status(500).json({ error: "Lỗi máy chủ!" });
            if (results.length === 0) return res.status(400).json({ error: "Mật khẩu cũ không chính xác!" });
            db.query("UPDATE users SET password = SHA2(?, 256) WHERE username = ?", [new_password, username], (updateErr) => {
                if (updateErr) return res.status(500).json({ error: "Không thể đổi mật khẩu!" });
                res.json({ message: "Đổi mật khẩu thành công!" });
            });
        });
    });

    //QUẢN LÝ NHÂN VIÊN
    app.get('/employees', (req, res) => {
        db.query("SELECT display_name, username, password, role, phone, status FROM users WHERE role != 'customer' AND status != 'inactive'", (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        });
    });
    app.post('/employees', (req, res) => {
        const emailRegex = /^(?!.*\.\.)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (email && !emailRegex.test(email)) {
            return res.status(400).json({ error: "Email sai định dạng!" });
        }
        const { display_name, username, password, role, email, phone, gender, date_of_birth, country } = req.body;
        const finalEmail = email && email.trim() !== '' ? email : null;
        db.query("INSERT INTO users (display_name, username, password, email, phone, gender, date_of_birth, country, role) VALUES (?, ?, SHA2(?, 256), ?, ?, ?, ?, ?, ?)",
            [display_name, username, password, finalEmail, phone, gender, date_of_birth, country || 'Việt Nam', role],
            (err) => {
                if (err) {
                    const errMsg = err.message.toLowerCase();
                    if (err.code === 'ER_DUP_ENTRY' || errMsg.includes('duplicate')) {
                        return res.status(400).json({ error: "Tên đăng nhập đã bị trùng!" });
                    }
                    return res.status(500).json({ error: `Lỗi hệ thống: ${err.message}` });
                }
                res.json({ success: true });
            }
        );
    });
    app.put('/employees/:username', (req, res) => {
        const { display_name, username, role, phone, status } = req.body;
        const oldUsername = req.params.username;
        db.query("UPDATE users SET display_name=?, username=?, role=?, phone=?, status=? WHERE username=?",
            [display_name, username, role, phone, status, oldUsername],
            (err) => {
                if (err) {
                    const errMsg = err.message.toLowerCase();
                    if (err.code === 'ER_DUP_ENTRY' || errMsg.includes('duplicate')) {
                        return res.status(400).json({ error: "Tên đăng nhập đã bị trùng!" });
                    }
                    return res.status(500).json({ error: `Lỗi cập nhật: ${err.message}` });
                }
                if (oldUsername !== username && io) {
                    io.emit('username_changed', { oldUsername, newUsername: username });
                }

                res.json({ success: true });
            }
        );
    });
    app.delete('/employees/:username', (req, res) => {
        db.query("UPDATE users SET status='inactive' WHERE username=?", [req.params.username], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });

    //THÔNG TIN CÁ NHÂN
    app.get('/api/users/:username', (req, res) => {
        db.query("SELECT display_name, username, role, email, phone, gender, date_of_birth, country FROM users WHERE username = ?",
            [req.params.username], (err, results) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(results[0] || {});
            });
    });
    app.put('/api/users/:username', (req, res) => {
        const emailRegex = /^(?!.*\.\.)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (email && !emailRegex.test(email)) {
            return res.status(400).json({ error: "Email sai định dạng!" });
        }
        const { display_name, email, phone, gender, date_of_birth, country, old_password, new_password } = req.body;
        if (new_password && new_password.trim() !== '') {
            db.query("SELECT * FROM users WHERE username=? AND password=SHA2(?, 256)", [req.params.username, old_password], (err, results) => {
                if (err) return res.status(500).json({ error: err.message });
                if (results.length === 0) return res.status(400).json({ error: "Mật khẩu cũ không chính xác!" });
                db.query("UPDATE users SET display_name=?, email=?, phone=?, gender=?, date_of_birth=?, country=?, password=SHA2(?, 256) WHERE username=?",
                    [display_name, email, phone, gender, date_of_birth, country, new_password, req.params.username],
                    (err) => {
                        if (err) return res.status(500).json({ error: err.message });
                        res.json({ success: true });
                    }
                );
            });
        } else {
            db.query("UPDATE users SET display_name=?, email=?, phone=?, gender=?, date_of_birth=?, country=? WHERE username=?",
                [display_name, email, phone, gender, date_of_birth, country, req.params.username],
                (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true });
                }
            );
        }
    });

    //CHẤM CÔNG
    app.get('/api/attendance/:username', (req, res) => {
        const username = req.params.username;
        db.query("SELECT * FROM attendance WHERE username=? AND work_date=CURDATE()", [username], (err, todayRecord) => {
            const sqlStats = `SELECT
                    SUM(CASE WHEN work_date = CURDATE() THEN daily_wage ELSE 0 END) as day_total,
                    SUM(CASE WHEN YEARWEEK(work_date, 1) = YEARWEEK(CURDATE(), 1) THEN daily_wage ELSE 0 END) as week_total,
                    SUM(CASE WHEN MONTH(work_date) = MONTH(CURDATE()) AND YEAR(work_date) = YEAR(CURDATE()) THEN daily_wage ELSE 0 END) as month_total
                FROM attendance WHERE username=? AND shift_status != 'working'`;
            db.query(sqlStats, [username], (err, stats) => {
                db.query("SELECT * FROM attendance WHERE username=? ORDER BY work_date DESC LIMIT 10", [username], (err, history) => {
                    res.json({
                        today: todayRecord ? todayRecord[0] : null,
                        stats: stats ? stats[0] : { day_total: 0, week_total: 0, month_total: 0 },
                        history: history || []
                    });
                });
            });
        });
    });
    app.post('/api/attendance/check-in', (req, res) => {
        db.query("INSERT INTO attendance (username, work_date, check_in, shift_status) VALUES (?, CURDATE(), NOW(), 'working')",
            [req.body.username], (err) => {
                if (err) return res.status(400).json({ error: "Hôm nay nhân viên này đã được chấm công rồi!" });
                res.json({ success: true });
            });
    });
    app.put('/api/attendance/check-out', (req, res) => {
        const { username, shift_status } = req.body;
        let wage = 0;
        if (shift_status === 'full') wage = 300000;
        else if (shift_status === 'half') wage = 150000;
        db.query("UPDATE attendance SET check_out=NOW(), shift_status=?, daily_wage=? WHERE username=? AND work_date=CURDATE()",
            [shift_status, wage, username], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true });
            });
    });
};
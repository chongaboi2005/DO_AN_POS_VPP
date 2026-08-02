const express = require('express');
require('dotenv').config();
const http = require('http');
const {Server} = require('socket.io');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/products', express.static(path.join(__dirname, '../pos-vpp/public/products')));
app.use('/blogs', express.static(path.join(__dirname, '../pos-vpp/public/blogs')));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

io.on('connection', (socket) => {
    socket.on('update_cart', (newCart) => {
        socket.broadcast.emit('sync_cart', newCart);
    });
});

const db = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'queen_stationery',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.getConnection((err, connection) => {
    if (err) {
        console.error("Không thể kết nối CSDL:", err.message);
    } else {
        connection.release();
    }
});

const storageProduct = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../frontend/public/products');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const uploadProduct = multer({ storage: storageProduct });

const storageBlog = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../frontend/public/blogs');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const uploadBlog = multer({ storage: storageBlog });

require('./routes/authRoutes')(app, db, nodemailer, io);
require('./routes/productRoutes')(app, db, uploadProduct, uploadBlog);
require('./routes/orderRoutes')(app, db, io);

server.listen(5000, '0.0.0.0', () => {
    console.log("Server started on port 5000");
});
import React from 'react';

export default function Footer() {
    return (
        <footer className="footer" id="bot">
            <div className="footer-grid">
                <div className="footer-section">
                    <h4 className="footer-title">QUEEN STATIONERY</h4>
                    <p>📍 Địa chỉ: 96 Đ. Lương Trúc Đàm, P. Hiệp Tân, Q. Tân Phú, TP.HCM</p>
                    <p>📞 Hotline liên hệ: (+8428) 39733381</p>
                    <p>✉️ Email: info@queenstationery.com.vn</p>
                </div>
                <div className="footer-section" style={{ pointerEvents: 'none' }}>
                    <h4 className="footer-title">Hỗ trợ khách hàng</h4>
                    <p> ➤ Thời gian làm việc: 8h00 - 22h00</p>
                    <p> ➤ Giao hàng tận nơi nội thành TP.HCM</p>
                    <p> ➤ Hỗ trợ kiểm tra hàng trước khi nhận</p>
                    <p> ➤ Cam kết hàng chính hãng 100%</p>
                </div>
                <div className="footer-section" style={{ pointerEvents: 'none' }}>
                    <h4 className="footer-title">Phương thức thanh toán</h4>
                    <p> ➤ Tiền mặt</p>
                    <p> ➤ Chuyển khoản</p>
                </div>
            </div>
            <div className="footer-bottom">
                ©CÔNG TY TNHH SX-TM VĂN PHÒNG PHẨM TRẦN VĨNH PHÁT
            </div>
        </footer>
    );
}
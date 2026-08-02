import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../component/Layout';
import { CartContext } from '../context/CartContext';
import './Cart.css';

const PROVINCES = [
    "TP. Hồ Chí Minh", "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu", "Bắc Ninh", "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước", "Bình Thuận", "Cà Mau", "Cần Thơ", "Cao Bằng", "Đà Nẵng", "Đắk Lắk", "Đắk Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang", "Hà Nam", "Hà Nội", "Hà Tĩnh", "Hải Dương", "Hải Phòng", "Hậu Giang", "Hòa Bình", "Hưng Yên", "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu", "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Long An", "Nam Định", "Nghệ An", "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên", "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sóc Trăng", "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên", "Thanh Hóa", "Thừa Thiên Huế", "Tiền Giang", "Trà Vinh", "Tuyên Quang", "Vĩnh Long", "Vĩnh Phúc", "Yên Bái"
];

export default function Cart() {
    const { cart, updateQuantity, removeFromCart, cartTotal, clearCart, showToast } = useContext(CartContext);
    const navigate = useNavigate();
    const safeCartTotal = typeof cartTotal === 'function' ? cartTotal() : (Number(cartTotal) || 0);
    const [activeTab, setActiveTab] = useState('cart');
    const [myOrders, setMyOrders] = useState([]);
    const [dbVouchers, setDbVouchers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [appliedVoucher, setAppliedVoucher] = useState(null);

    const [customerName, setCustomerName] = useState(() => sessionStorage.getItem('temp_name') || '');
    const [customerPhone, setCustomerPhone] = useState(() => sessionStorage.getItem('temp_phone') || '');
    const [customerAddress, setCustomerAddress] = useState(() => sessionStorage.getItem('temp_address') || '');
    const [customerProvince, setCustomerProvince] = useState(() => sessionStorage.getItem('temp_province') || '');
    const [paymentMethod, setPaymentMethod] = useState(() => sessionStorage.getItem('temp_payment') || 'cod');
    const [showProvinceDropdown, setShowProvinceDropdown] = useState(false);

    const [showQRModal, setShowQRModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderItems, setOrderItems] = useState([]);
    const [cancelOrderId, setCancelOrderId] = useState(null);

    useEffect(() => {
        if (cart.length === 0) {
            setCustomerName('');
            setCustomerPhone('');
            setCustomerAddress('');
            setCustomerProvince('');
            setPaymentMethod('cod');
            sessionStorage.removeItem('temp_name');
            sessionStorage.removeItem('temp_phone');
            sessionStorage.removeItem('temp_address');
            sessionStorage.removeItem('temp_province');
            sessionStorage.removeItem('temp_payment');
        } else {
            sessionStorage.setItem('temp_name', customerName);
            sessionStorage.setItem('temp_phone', customerPhone);
            sessionStorage.setItem('temp_address', customerAddress);
            sessionStorage.setItem('temp_province', customerProvince);
            sessionStorage.setItem('temp_payment', paymentMethod);
        }
    }, [customerName, customerPhone, customerAddress, customerProvince, paymentMethod, cart.length]);

    useEffect(() => {
        if (selectedOrder || showQRModal || isModalOpen || cancelOrderId) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
    }, [selectedOrder, showQRModal, isModalOpen, cancelOrderId]);

    useEffect(() => {
        window.scrollTo(0, 0);
        fetch(`http://${window.location.hostname}:5000/vouchers`)
            .then(res => res.json())
            .then(data => setDbVouchers(data))
            .catch(err => console.error("Lỗi lấy voucher:", err));
    }, []);

    useEffect(() => {
        if (activeTab === 'history') {
            const username = sessionStorage.getItem('username');
            const role = sessionStorage.getItem('role');
            if (username && username !== 'undefined' && username !== 'null' && role === 'customer') {
                const API_BASE = `http://${window.location.hostname}:5000`;
                fetch(`${API_BASE}/customer/orders?username=${encodeURIComponent(username)}`)
                    .then(res => res.json())
                    .then(data => setMyOrders(data))
                    .catch(err => console.error("Lỗi lấy lịch sử GD:", err));
            } else {
                setMyOrders([]);
            }
        }
    }, [activeTab]);

    useEffect(() => {
        if (appliedVoucher) {
            if (safeCartTotal < appliedVoucher.min_order) {
                setAppliedVoucher(null);
                if (cart.length > 0) {
                    showToast(`Mã giảm giá đã bị gỡ do đơn hàng không đủ ${Number(appliedVoucher.min_order).toLocaleString('vi-VN')}đ!`, "error");
                }
            }
        }
    }, [safeCartTotal, appliedVoucher, cart]);

    const handleApplyVoucher = (code) => {
        if (cart.length === 0) {
            showToast('Vui lòng thêm sản phẩm vào giỏ hàng trước khi áp dụng mã!', 'error');
            return;
        }

        if (!PROVINCES.includes(customerProvince)) {
            showToast('Vui lòng chọn Tỉnh/Thành phố nhận hàng trước!', 'error');
            return;
        }

        const validVoucher = dbVouchers.find(v => v.code === code.toUpperCase() && v.type === 'online');

        if (validVoucher) {
            if (validVoucher.discount_type !== 'ship') {
                showToast('Đơn hàng Online chỉ hỗ trợ áp dụng mã Giảm phí vận chuyển!', 'error');
                return;
            }

            if (safeCartTotal < validVoucher.min_order) {
                showToast(`Đơn hàng chưa đủ ${validVoucher.min_order.toLocaleString('vi-VN')}đ để áp dụng mã này!`, 'error');
                return;
            }
            setAppliedVoucher(validVoucher);
            setIsModalOpen(false);
            showToast(`Áp dụng mã ${code} thành công!`, 'success');
        } else {
            showToast('Mã không hợp lệ hoặc chỉ áp dụng tại quầy POS!', 'error');
        }
    };

    const shippingFee = PROVINCES.includes(customerProvince)
        ? (customerProvince === 'TP. Hồ Chí Minh' ? 30000 : 50000)
        : 0;

    const calculateDiscount = () => {
        if (!appliedVoucher) return 0;
        if (safeCartTotal < appliedVoucher.min_order) return 0;

        if (appliedVoucher.discount_type === 'ship') {
            return Math.min(appliedVoucher.discount_value, shippingFee);
        }
        return 0;
    };

    const discountAmount = calculateDiscount();
    const finalTotal = safeCartTotal + shippingFee - discountAmount;

    const handleCheckout = (e) => {
        const user = sessionStorage.getItem('displayName');
        const role = sessionStorage.getItem('role');

        if (!user || user === 'undefined' || user === 'null' || role !== 'customer') {
            showToast("Vui lòng đăng nhập tài khoản trước khi thanh toán!", "error");
            sessionStorage.setItem('redirect_after_login', '/cart');
            navigate('/login');
            return;
        }

        if (!customerName || !customerPhone || !customerAddress) {
            showToast("Vui lòng nhập đầy đủ thông tin chi tiết!", "error");
            return;
        }

        if (!PROVINCES.includes(customerProvince)) {
            showToast("Vui lòng tìm và chọn Tỉnh/Thành phố từ danh sách!", "error");
            return;
        }

        if (paymentMethod === 'transfer') {
            setShowQRModal(true);
        } else {
            completeOrder(e);
        }
    };

    const completeOrder = async (e) => {
        const currentCustomerUser = sessionStorage.getItem('username') || '';

        const fullAddress = `${customerAddress.trim()}, ${customerProvince}`;

        const orderData = {
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_address: fullAddress,
            customer_username: currentCustomerUser,
            username: '',
            cashier_name: '',
            voucher_code: appliedVoucher ? appliedVoucher.code : '',
            amount_tendered: finalTotal,
            total_amount: safeCartTotal,
            discount_amount: discountAmount,
            shipping_fee: shippingFee,
            final_total: finalTotal,
            payment_method: paymentMethod,
            order_type: 'online',
            items: cart
        };

        try {
            const res = await fetch(`http://${window.location.hostname}:5000/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Không thể đặt hàng!");
            }

            setAppliedVoucher(null);
            setCustomerName('');
            setCustomerPhone('');
            setCustomerAddress('');
            setCustomerProvince('');
            showToast("Đã đặt hàng thành công!", "success");
            clearCart();
            sessionStorage.removeItem('temp_name');
            sessionStorage.removeItem('temp_phone');
            sessionStorage.removeItem('temp_address');
            sessionStorage.removeItem('temp_province');
            sessionStorage.removeItem('temp_payment');
            setActiveTab('history');

        } catch (err) {
            console.error("Lỗi lưu đơn hàng DB:", err);
            showToast(err.message || "Lỗi hệ thống khi đặt hàng!", "error");
        }
    };

    const handleViewDetail = async (order) => {
        setSelectedOrder(order);
        setOrderItems([]);
        try {
            const API_BASE = `http://${window.location.hostname}:5000`;
            const res = await fetch(`${API_BASE}/orders/${order.id}/items`);
            const items = await res.json();
            setOrderItems(items);
        } catch (error) {
            console.error("Lỗi lấy chi tiết:", error);
        }
    };

    const handleCancelOrderClick = (orderId) => {
        setCancelOrderId(orderId);
    };

    const confirmCancelOrder = () => {
        if (!cancelOrderId) return;

        const API_BASE = `http://${window.location.hostname}:5000`;
        fetch(`${API_BASE}/orders/${cancelOrderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: 'cancelled',
                cashier_name: 'Khách hàng'
            })
        })
            .then(res => res.json())
            .then(data => {
                showToast("Đã hủy đơn hàng!", "success");
                setMyOrders(prev => prev.map(o => o.id === cancelOrderId ? { ...o, status: 'cancelled' } : o));
                setCancelOrderId(null);
            })
            .catch(err => {
                console.error("Lỗi hủy đơn:", err);
                showToast("Lỗi hệ thống khi hủy đơn!", "error");
                setCancelOrderId(null);
            });
    };

    return (
        <Layout>
            <main className="main-layout" style={{ minHeight: '60vh', paddingTop: '10px' }}>
                <div className="cart-page-header">
                    <span className={`cart-tab-title ${activeTab === 'cart' ? 'active' : ''}`} onClick={() => setActiveTab('cart')}>
                        Giỏ Hàng
                    </span>
                    <span className={`cart-tab-title ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
                        Lịch Sử Giao Dịch
                    </span>
                </div>

                {activeTab === 'cart' && (
                    <>
                        {cart.length === 0 ? (
                            <div className="empty-cart-message">
                                <p>Không có sản phẩm nào trong giỏ hàng của bạn!</p>
                                <button className="view-more-btn" onClick={() => navigate('/')} style={{ marginTop: '20px' }}>Tiếp tục mua sắm</button>
                            </div>
                        ) : (
                            <div className="cart-container">
                                <div className="cart-items">
                                    {cart.map(item => (
                                        <div key={item.id} className="cart-item">
                                            <img src={item.image_url} alt={item.name} className="cart-item-img" />
                                            <div className="cart-item-info">
                                                <h4 className="cart-item-title">{item.name}</h4>
                                                <div className="cart-item-price">{Number(item.price).toLocaleString('vi-VN')}đ</div>
                                                <button className="remove-btn" onClick={() => removeFromCart(item.id)}>Xóa</button>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginLeft: '15px' }}>
                                                <div className="qty-controls" style={{ marginLeft: '0' }}>
                                                    <button className="qty-btn" onClick={() => updateQuantity(item.id, -1)}>−</button>

                                                    <input
                                                        type="number"
                                                        className="qty-number-input"
                                                        value={item.quantity}
                                                        min="1"
                                                        onFocus={(e) => e.target.select()}
                                                        onWheel={(e) => e.target.blur()}
                                                        onKeyDown={(e) => ['e', 'E', '+', '-', '.', ','].includes(e.key) && e.preventDefault()}
                                                        onChange={(e) => {
                                                            if (e.target.value === '') {
                                                                updateQuantity(item.id, 1 - item.quantity);
                                                            } else {
                                                                const newQty = parseInt(e.target.value, 10);
                                                                if (!isNaN(newQty) && newQty >= 1) {
                                                                    updateQuantity(item.id, newQty - item.quantity);
                                                                }
                                                            }
                                                        }}
                                                    />

                                                    <button className="qty-btn" onClick={() => updateQuantity(item.id, 1)}>+</button>
                                                </div>

                                                <span style={{ fontSize: '10pt', color: '#4b5563', marginTop: '10px', fontWeight: 'bold' }}>
                                                    Kho: {item.stock || 0}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="cart-summary">
                                    <h3 className="summary-title" style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '5px', marginBottom: '5px', fontSize: '13pt' }}>Thông tin đơn hàng</h3>

                                    <div style={{ marginBottom: '8px' }}>
                                        <h4 style={{ margin: '0 0 4px 0', color: '#1f2937', fontSize: '11pt' }}>1. Thông tin chi tiết</h4>
                                        <input type="text" placeholder="Họ và tên người nhận" className="checkout-input" value={customerName} onChange={e => setCustomerName(e.target.value)} style={{ padding: '6px 10px', marginBottom: '6px' }} />
                                        <input type="number" placeholder="Số điện thoại liên hệ" className="checkout-input" value={customerPhone} onWheel={(e) => e.target.blur()} onKeyDown={(e) => ['e', 'E', '+', '-', '.', ','].includes(e.key) && e.preventDefault()} onChange={e => setCustomerPhone(e.target.value)} style={{ padding: '6px 10px', marginBottom: '6px' }} />

                                        <div style={{ display: 'flex', gap: '10px', marginBottom: '0' }}>
                                            <input
                                                type="text"
                                                placeholder="Số nhà, đường, phường/xã..."
                                                className="checkout-input"
                                                value={customerAddress}
                                                onChange={e => setCustomerAddress(e.target.value)}
                                                style={{ padding: '6px 10px', marginBottom: '0', flex: 2 }}
                                            />

                                            <div style={{ position: 'relative', flex: 1.5 }}>
                                                <input
                                                    type="text"
                                                    className="checkout-input"
                                                    placeholder="Chọn Tỉnh/Thành..."
                                                    value={customerProvince}
                                                    onChange={e => {
                                                        setCustomerProvince(e.target.value);
                                                        setShowProvinceDropdown(true);
                                                    }}
                                                    onFocus={() => {
                                                        setShowProvinceDropdown(true);
                                                    }}
                                                    onBlur={() => setTimeout(() => setShowProvinceDropdown(false), 3000)}
                                                    style={{ padding: '6px 30px 6px 10px', marginBottom: '0', width: '100%', boxSizing: 'border-box' }}
                                                />
                                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9ca3af', fontSize: '10pt' }}>
                                                    ▼
                                                </span>
                                                {showProvinceDropdown && (
                                                    <ul className="province-dropdown">
                                                        {((PROVINCES.includes(customerProvince) || customerProvince.trim() === '')
                                                            ? PROVINCES
                                                            : PROVINCES.filter(p => p.toLowerCase().includes(customerProvince.toLowerCase()))
                                                        ).map(p => (
                                                            <li
                                                                key={p}
                                                                onMouseDown={(e) => e.preventDefault()}
                                                                onClick={() => {
                                                                    setCustomerProvince(p);
                                                                    setShowProvinceDropdown(false);
                                                                    if (document.activeElement) {
                                                                        document.activeElement.blur();
                                                                    }
                                                                }}
                                                            >
                                                                {p}
                                                            </li>
                                                        ))}
                                                        {customerProvince.trim() !== '' && !PROVINCES.includes(customerProvince) && PROVINCES.filter(p => p.toLowerCase().includes(customerProvince.toLowerCase())).length === 0 && (
                                                            <li className="no-result">Không tìm thấy tỉnh...</li>
                                                        )}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '5px' }}>
                                        <h4 style={{ margin: '0 0 4px 0', color: '#1f2937', fontSize: '11pt' }}>2. Hình thức thanh toán</h4>
                                        <div className="payment-options" style={{ gap: '4px' }}>
                                            <label style={{ fontSize: '11pt' }}>
                                                <input type="radio" name="pay" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
                                                Thanh toán khi nhận hàng (COD)
                                            </label>
                                            <label style={{ fontSize: '11pt' }}>
                                                <input type="radio" name="pay" value="transfer" checked={paymentMethod === 'transfer'} onChange={() => setPaymentMethod('transfer')} />
                                                Chuyển khoản (Quét QR)
                                            </label>
                                        </div>
                                    </div>

                                    <h4 style={{ margin: '0 0 6px 0', color: '#1f2937', borderTop: '1px solid #e5e7eb', paddingTop: '5px', fontSize: '11pt' }}>3. Tổng chi phí</h4>

                                    {!appliedVoucher ? (
                                        <button className="choose-voucher-btn" onClick={() => setIsModalOpen(true)}>
                                            Chọn Mã Giảm Giá
                                        </button>
                                    ) : (
                                        <div className="applied-voucher-display" style={{ padding: '5px 8px', marginBottom: '5px' }}>
                                            <span>Đã áp dụng: <b>{appliedVoucher.code}</b></span>
                                            <button className="remove-voucher-btn" onClick={() => setAppliedVoucher(null)}>Hủy</button>
                                        </div>
                                    )}

                                    <div className="summary-row" style={{ marginBottom: '4px', fontSize: '11pt' }}>
                                        <span>Tạm tính:</span>
                                        <span>{Number(safeCartTotal).toLocaleString('vi-VN')}đ</span>
                                    </div>

                                    {PROVINCES.includes(customerProvince) && (
                                        <div className="summary-row" style={{ marginBottom: '4px', fontSize: '11pt' }}>
                                            <span>
                                                Phí vận chuyển:
                                                {shippingFee === 50000 && <span style={{ fontSize: '9pt', color: '#d97706', display: 'block', fontStyle: 'italic' }}>(Phụ thu ngoại thành)</span>}
                                            </span>
                                            <span style={{ color: '#4b5563' }}>
                                                {Number(shippingFee).toLocaleString('vi-VN')}đ
                                            </span>
                                        </div>
                                    )}

                                    {discountAmount > 0 && (
                                        <div className="summary-row" style={{ color: '#10b981', fontWeight: 'bold', marginBottom: '4px', fontSize: '11pt' }}>
                                            <span>Mã giảm giá ({appliedVoucher.code}):</span>
                                            <span>- {Number(discountAmount).toLocaleString('vi-VN')}đ</span>
                                        </div>
                                    )}

                                    <div className="summary-total">
                                        <span>Tổng thanh toán:</span>
                                        <span>{Number(finalTotal).toLocaleString('vi-VN')}đ</span>
                                    </div>

                                    <button className="checkout-btn" onClick={(e) => handleCheckout(e)}>Xác Nhận Đặt Hàng</button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {cancelOrderId && (
                    <div className="global-modal-overlay" onClick={() => setCancelOrderId(null)}>
                        <div className="global-confirm-modal" onClick={e => e.stopPropagation()}>
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <h3 style={{ margin: '10px 0 5px 0', color: '#1f2937', fontSize: '13pt' }}>Xác nhận hủy đơn hàng?</h3>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                <button className="confirm-btn-no" onClick={() => setCancelOrderId(null)}>Hủy</button>
                                <button className="confirm-btn-yes" onClick={confirmCancelOrder}>Xác nhận</button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="history-table-wrapper">
                        <table className="history-table">
                            <thead>
                                <tr>
                                    <th>Mã Đơn</th>
                                    <th>Ngày đặt hàng</th>
                                    <th style={{ textAlign: 'left' }}>Thông tin khách hàng</th>
                                    <th>Tổng tiền</th>
                                    <th>Trạng thái</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(!sessionStorage.getItem('username') || sessionStorage.getItem('username') === 'null' || sessionStorage.getItem('role') !== 'customer') ? (
                                    <tr><td colSpan="6" className="empty-history-msg" style={{ padding: '30px 0' }}>Vui lòng đăng nhập để xem lịch sử!</td></tr>
                                ) : myOrders.length === 0 ? (
                                    <tr><td colSpan="6" className="empty-history-msg" style={{ padding: '30px 0' }}>Chưa có đơn hàng nào!</td></tr>
                                ) : (
                                    myOrders.map(t => (
                                        <tr key={t.id}>
                                            <td style={{ fontWeight: 'bold', fontSize: '11pt' }}>#{t.id}</td>
                                            <td style={{ fontSize: '10pt', color: '#4b5563' }}>
                                                {new Date(t.created_at).toLocaleString('vi-VN')}
                                            </td>
                                            <td style={{ textAlign: 'left' }}>
                                                <div style={{ fontWeight: 'bold', color: '#1f2937', fontSize: '11pt' }}>{t.customer_name}</div>
                                                <div style={{ fontSize: '10pt', color: '#4b5563' }}>SĐT: {t.customer_phone}</div>
                                                <div style={{ fontSize: '10pt', color: '#4b5563' }}>Địa chỉ: {t.customer_address}</div>
                                            </td>
                                            <td style={{ fontWeight: 'bold', color: '#dc2626', fontSize: '11pt' }}>
                                                {Number(t.final_total).toLocaleString('vi-VN')}đ
                                            </td>
                                            <td>
                                                {t.status === 'pending' && <span style={{ color: '#d97706', fontWeight: 'bold', fontSize: '11pt' }}>Chờ xác nhận</span>}
                                                {t.status === 'confirmed' && <span style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '11pt' }}>Đang vận chuyển</span>}
                                                {t.status === 'completed' && <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '11pt' }}>Đã giao</span>}
                                                {t.status === 'cancelled' && <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '11pt' }}>Đã hủy</span>}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {t.status !== 'cancelled' ? (
                                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center', fontSize: '11pt' }}>
                                                        <span className="text-view-detail" onClick={() => handleViewDetail(t)}>Chi tiết</span>
                                                        {t.status === 'pending' && (
                                                            <button className="customer-cancel-btn" onClick={() => handleCancelOrderClick(t.id)}>Hủy đơn</button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#9ca3af', fontStyle: 'italic' }}></span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>

            {showQRModal && (
                <div className="global-modal-overlay" onClick={() => setShowQRModal(false)}>
                    <div className="global-confirm-modal" style={{ textAlign: 'center', maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0, color: '#1e3a8a' }}>Quét mã Thanh toán</h3>

                        <img src="/QR_bank.jpg" alt="QR Code Ngân Hàng" style={{ width: '200px', height: 'auto', margin: '15px auto', display: 'block', objectFit: 'contain', borderRadius: '8px', border: '1px solid #e5e7eb' }} />

                        <p style={{ fontSize: '22pt', fontWeight: 'bold', color: '#dc2626', margin: '10px 0 0 0' }}>{Number(finalTotal).toLocaleString('vi-VN')} đ</p>

                        <p style={{ color: '#6b7280', fontSize: '11pt', marginTop: '10px', marginBottom: '20px' }}>
                            Vui lòng quét mã để chuyển khoản.
                        </p>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="global-btn-cancel" style={{ flex: 1 }} onClick={() => setShowQRModal(false)}>Hủy</button>
                            <button className="global-btn-confirm" style={{ flex: 1, backgroundColor: '#10b981', border: 'none' }} onClick={(e) => {
                                setShowQRModal(false);
                                completeOrder(e);
                            }}>Hoàn Tất Thanh Toán</button>
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="global-modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="voucher-modal" onClick={e => e.stopPropagation()}>

                        <div className="voucher-modal-header">
                            <h3 className="voucher-modal-title">Chọn Mã Giảm Giá</h3>
                            <button className="btn-close-modal" onClick={() => setIsModalOpen(false)}>×</button>
                        </div>

                        <div className="voucher-list-wrapper">
                            {dbVouchers.filter(v => v.type === 'online').length > 0 ? (
                                dbVouchers.filter(v => v.type === 'online').map(v => {
                                    const isEligible = cart.length > 0 && safeCartTotal >= v.min_order;
                                    return (
                                        <div key={v.id} className="voucher-card-item" style={{ opacity: isEligible ? 1 : 0.6 }}>
                                            <div className="voucher-card-info">
                                                <h4>{v.code}</h4>
                                                <div style={{ margin: '5px 0', fontSize: '11pt', color: '#4b5563' }} dangerouslySetInnerHTML={{ __html: v.description ? v.description.replace(/&nbsp;/g, ' ') : '' }} />
                                                {v.min_order > 0 && <span style={{ fontSize: '9pt', color: '#d97706' }}>Đơn tối thiểu: {Number(v.min_order).toLocaleString('vi-VN')}đ</span>}
                                            </div>
                                            <button
                                                className={`voucher-apply-btn ${isEligible ? 'active' : 'disabled'}`}
                                                onClick={() => {
                                                    if (isEligible) handleApplyVoucher(v.code);
                                                }}
                                                disabled={!isEligible}
                                            >
                                                {isEligible ? 'Áp dụng' : 'Áp dụng'}
                                            </button>
                                        </div>
                                    );
                                })
                            ) : (
                                <div style={{ textAlign: 'center', color: '#6b7280', padding: '20px 0' }}>
                                    Hệ thống chưa có mã giảm giá Online nào.
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            )}

            {selectedOrder && (
                <div className="receipt-modal-overlay" onClick={() => setSelectedOrder(null)}>
                    <div className="receipt-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="receipt-paper">
                            <h2 style={{ textAlign: 'center', margin: '0 0 5px 0', fontSize: '16pt', fontWeight: 'bold' }}>QUEEN STATIONERY</h2>
                            <p style={{ textAlign: 'center', margin: '0 0 5px 0', fontSize: '11pt' }}>96 Đ. Lương Trúc Đàm, Tân Phú, TP.HCM</p>
                            <p style={{ textAlign: 'center', margin: '0 0 5px 0', fontSize: '11pt' }}>Hotline: (+8428) 39733381</p>
                            <div style={{ borderBottom: '2px dashed #000', margin: '15px 0' }}></div>

                            <p style={{ fontWeight: 'bold', fontSize: '13pt', textAlign: 'center', margin: '0 0 5px 0' }}>HÓA ĐƠN ĐẶT HÀNG</p>
                            <p style={{ textAlign: 'center', margin: '0 0 5px 0', fontSize: '11pt' }}>Mã đơn hàng: #{selectedOrder.id}</p>
                            <p style={{ textAlign: 'center', margin: '0 0 5px 0', fontSize: '11pt' }}>Ngày: {new Date(selectedOrder.created_at).toLocaleString('vi-VN')}</p>

                            <div style={{ borderBottom: '2px dashed #000', margin: '15px 0' }}></div>
                            <p style={{ textAlign: 'left', margin: '2px 0', fontSize: '11pt' }}>Khách hàng: {selectedOrder.customer_name}</p>
                            <p style={{ textAlign: 'left', margin: '2px 0', fontSize: '11pt' }}>SĐT: {selectedOrder.customer_phone}</p>
                            <p style={{ textAlign: 'left', margin: '2px 0', fontSize: '11pt' }}>Địa chỉ: {selectedOrder.customer_address}</p>

                            <div style={{ borderBottom: '2px dashed #000', margin: '15px 0' }}></div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', fontSize: '11pt' }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: '60%', textAlign: 'left', borderBottom: '2px dashed #000', padding: '5px 0', fontWeight: 'bold' }}>Tên sản phẩm</th>
                                        <th style={{ width: '15%', textAlign: 'center', borderBottom: '2px dashed #000', padding: '5px 0', fontWeight: 'bold' }}>SL</th>
                                        <th style={{ width: '25%', textAlign: 'right', borderBottom: '2px dashed #000', padding: '5px 0', fontWeight: 'bold' }}>Thành tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orderItems.map(item => {
                                        const q = parseInt(item.quantity) || 1;
                                        return (
                                            <tr key={item.id}>
                                                <td style={{ padding: '10px 0', borderBottom: 'none', verticalAlign: 'top', fontSize: '10pt' }}>{item.product_name}</td>
                                                <td style={{ padding: '10px 0', borderBottom: 'none', textAlign: 'center', verticalAlign: 'top', fontSize: '10pt' }}>{q}</td>
                                                <td style={{ padding: '10px 0', borderBottom: 'none', textAlign: 'right', verticalAlign: 'top', fontSize: '10pt' }}>{(Number(item.price) * q).toLocaleString('vi-VN')}đ</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            <div style={{ borderTop: '2px dashed #000', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '10pt', marginTop: '8px' }}>
                                <span style={{ width: '60%' }}>Tổng số tiền:</span>
                                <span style={{ width: '15%', textAlign: 'center' }}>{orderItems.reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0)}</span>
                                <span style={{ width: '25%', textAlign: 'right' }}>{Number(selectedOrder.total_amount).toLocaleString('vi-VN')}đ</span>
                            </div>
                            {selectedOrder.order_type === 'online' ? (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10pt', marginTop: '8px' }}>
                                        <span>Phí vận chuyển:</span>
                                        <span style={{ color: '#000' }}>
                                            {Number(selectedOrder.shipping_fee || 0).toLocaleString('vi-VN')}đ
                                        </span>
                                    </div>
                                    {selectedOrder.discount_amount > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10pt', marginTop: '8px' }}>
                                            <span>Mã giảm giá ({selectedOrder.voucher_code}):</span>
                                            <span>-{Number(selectedOrder.discount_amount).toLocaleString('vi-VN')}đ</span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    {selectedOrder.discount_amount > 0 && selectedOrder.voucher_code && (
                                        selectedOrder.voucher_code.split(',').map((vStr, index) => {
                                            const parts = vStr.split('|');
                                            const vCode = parts[0].trim();
                                            const vAmount = parts[1] ? parseInt(parts[1]) : null;

                                            return (
                                                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11pt', marginTop: '8px', color: '#10b981', fontWeight: 'bold' }}>
                                                    <span>Mã giảm giá ({vCode}):</span>
                                                    <span>{vAmount ? `-${Number(vAmount).toLocaleString('vi-VN')}đ` : `-(Cũ)`}</span>
                                                </div>
                                            );
                                        })
                                    )}
                                </>
                            )}

                            <div style={{ borderBottom: '2px dashed #000', margin: '15px 0' }}></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13pt', fontWeight: 'bold', margin: '15px 0' }}>
                                <span>TỔNG THANH TOÁN:</span><span>{Number(selectedOrder.final_total).toLocaleString('vi-VN')}đ</span>
                            </div>

                            <div style={{ textAlign: 'center', fontSize: '11pt', fontWeight: 'bold' }}>
                                Hình thức: {selectedOrder.payment_method === 'cod' ? 'Thanh toán khi nhận hàng' : 'Chuyển khoản'}
                            </div>
                            <div style={{ borderBottom: '2px dashed #000', margin: '15px 0' }}></div>
                            <div style={{ textAlign: 'center', fontStyle: 'italic', fontSize: '11pt' }}>
                                Cảm ơn quý khách và hẹn gặp lại!
                            </div>
                        </div>
                        <button className="receipt-close-btn" onClick={() => setSelectedOrder(null)}>← Quay lại</button>
                    </div>
                </div>
            )}
        </Layout>
    );
}
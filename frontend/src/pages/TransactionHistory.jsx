import React, { useEffect, useState } from 'react';
import './TransactionHistory.css';

export default function TransactionHistory() {
    const [transactions, setTransactions] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderItems, setOrderItems] = useState([]);

    const role = sessionStorage.getItem('role');
    const displayName = sessionStorage.getItem('displayName');

    useEffect(() => {
        const API_BASE = `http://${window.location.hostname}:5000`;
        fetch(`${API_BASE}/transactions?role=${role}&cashier_name=${encodeURIComponent(displayName)}`)
            .then(res => res.json())
            .then(data => setTransactions(data))
            .catch(err => console.error("Lỗi lấy lịch sử GD:", err));
    }, [role, displayName]);

    const filteredTrans = transactions.filter(t => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        const idMatch = t.id && t.id.toLowerCase().includes(term);
        const nameMatch = t.customer_name && t.customer_name.toLowerCase().includes(term);
        const phoneMatch = t.customer_phone && t.customer_phone.includes(term);
        const userMatch = t.customer_username && t.customer_username.toLowerCase().includes(term);
        const cashierMatch = t.cashier_name && t.cashier_name.toLowerCase().includes(term);
        const cashierUserMatch = t.username && t.username.toLowerCase().includes(term);
        const typeMatch = t.order_type === 'online' ? 'trực tuyến'.includes(term) : 'trực tiếp'.includes(term);
        const statusMatch = t.status === 'pending' ? 'chờ duyệt'.includes(term) : t.status === 'completed' ? 'hoàn tất'.includes(term) : 'đã hủy'.includes(term);
        const paymentStr = (t.payment_method === 'cash' || t.payment_method === 'cod') ? 'tiền mặt' : 'chuyển khoản';
        const paymentMatch = paymentStr.includes(term);
        const dateMatch = new Date(t.created_at).toLocaleString('vi-VN').includes(term);
        const moneyMatch = t.final_total.toString().includes(term);
        return idMatch || nameMatch || phoneMatch || userMatch || cashierMatch || cashierUserMatch || typeMatch || statusMatch || paymentMatch || dateMatch || moneyMatch;
    });

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

    useEffect(() => {
        if (selectedOrder) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [selectedOrder]);

    const getPaymentMethodText = (order) => {
        if (order.order_type === 'online') {
            return order.payment_method === 'cod' ? 'Thanh toán khi nhận hàng' : 'Chuyển khoảN';
        } else {
            return order.payment_method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản / Quẹt thẻ';
        }
    };

    return (
        <div className="history-container">
            <h2 className="history-title">Tra cứu Lịch sử & Khách hàng</h2>

            <div className="history-search-bar">
                <input
                    type="text"
                    className="global-search-input"
                    placeholder="Tìm kiếm thông tin giao dịch..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="history-table-wrapper">
                <table className="history-table">
                    <thead>
                        <tr>
                            <th>Mã Đơn</th>
                            <th>Thời gian</th>
                            <th style={{ textAlign: 'left' }}>Thông tin khách hàng</th>
                            <th>Hình thức</th>
                            <th>Thanh toán</th>
                            <th>Thực hiện</th>
                            {role === 'admin' && <th>TK Thực hiện</th>}
                            <th style={{ textAlign: 'center' }}>Tổng tiền</th>
                            <th style={{ textAlign: 'center' }}>Trạng thái</th>
                            <th style={{ textAlign: 'center' }}>Hóa đơn</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTrans.length === 0 ? (
                            <tr><td colSpan={role === 'admin' ? "10" : "9"} style={{ textAlign: 'center', padding: '20px', color: '#6b7280', fontSize: '12pt', fontStyle: 'italic' }}>Không tìm thấy giao dịch nào phù hợp!</td></tr>
                        ) : (
                            filteredTrans.map(t => (
                                <tr key={t.id}>
                                    <td style={{ fontSize: '11pt', fontWeight: 'bold' }}>#{t.id}</td>
                                    <td style={{ fontSize: '10pt', color: '#4b5563' }}>
                                        {new Date(t.created_at).toLocaleString('vi-VN')}
                                    </td>
                                    <td style={{ textAlign: 'left' }}>
                                        <div style={{ fontWeight: 'bold', color: '#1f2937', fontSize: '11pt' }}>{t.customer_name || 'Khách vãng lai'}</div>
                                        <div style={{ fontSize: '10pt', color: '#4b5563' }}>SĐT: {t.customer_phone || ''}</div>
                                        {t.customer_username && <div style={{ fontSize: '10pt', color: '#6b7280' }}>TK: {t.customer_username}</div>}
                                    </td>
                                    <td style={{ fontSize: '11pt', fontWeight: 'bold', color: t.order_type === 'online' ? '#2563eb' : '#10b981' }}>
                                        {t.order_type === 'online' ? 'Trực tuyến' : 'Trực tiếp'}
                                    </td>
                                    <td style={{ fontSize: '11pt', fontWeight: 'bold', color: '#4b5563' }}>
                                        {t.payment_method === 'cash' || t.payment_method === 'cod' ? 'Tiền mặt' : 'Chuyển khoản'}
                                    </td>
                                    <td style={{ fontSize: '11pt', fontWeight: 'bold', color: '#4b5563' }}>
                                        {t.cashier_name || ''}
                                    </td>
                                    {role === 'admin' && (
                                        <td style={{ fontSize: '11pt', color: '#4b5563', textAlign: 'center' }}>
                                            {t.cashier_name && t.username ? `@${t.username}` : ''}
                                        </td>
                                    )}
                                    <td style={{ fontSize: '11pt', textAlign: 'center', fontWeight: 'bold', color: '#dc2626' }}>
                                        {Number(t.final_total).toLocaleString('vi-VN')}đ
                                    </td>
                                    <td style={{ fontSize: '11pt', textAlign: 'center' }}>
                                        {t.status === 'pending' && <span style={{ color: '#d97706', fontWeight: 'bold' }}>Chờ duyệt</span>}
                                        {t.status === 'confirmed' && <span style={{ color: '#2563eb', fontWeight: 'bold' }}>Đang giao</span>}
                                        {t.status === 'completed' && <span style={{ color: '#10b981', fontWeight: 'bold' }}>Hoàn tất</span>}
                                        {t.status === 'cancelled' && <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Đã hủy</span>}
                                    </td>

                                    <td style={{ fontSize: '11pt', textAlign: 'center' }}>
                                        {t.status === 'completed' ? (
                                            <span className="text-view-detail" onClick={() => handleViewDetail(t)}>
                                                Chi tiết
                                            </span>
                                        ) : (
                                            <span></span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {selectedOrder && (
                <div className="receipt-modal-overlay" onClick={() => setSelectedOrder(null)}>
                    <div className="receipt-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="receipt-paper">
                            <h2 style={{ textAlign: 'center', margin: '0 0 5px 0', fontSize: '16pt', fontWeight: 'bold' }}>QUEEN STATIONERY</h2>
                            <p style={{ textAlign: 'center', margin: '0 0 5px 0', fontSize: '11pt' }}>96 Đ. Lương Trúc Đàm, Tân Phú, TP.HCM</p>
                            <p style={{ textAlign: 'center', margin: '0 0 5px 0', fontSize: '11pt' }}>Hotline: (+8428) 39733381</p>
                            <div style={{ borderBottom: '2px dashed #000', margin: '15px 0' }}></div>

                            <p style={{ fontWeight: 'bold', fontSize: '13pt', textAlign: 'center', margin: '0 0 5px 0' }}>
                                {selectedOrder.order_type === 'online' ? 'HÓA ĐƠN ĐẶT HÀNG' : 'HÓA ĐƠN BÁN LẺ'}
                            </p>
                            <p style={{ textAlign: 'center', margin: '0 0 5px 0', fontSize: '11pt' }}>Mã đơn hàng: #{selectedOrder.id}</p>
                            <p style={{ textAlign: 'center', margin: '0 0 5px 0', fontSize: '11pt' }}>Ngày: {new Date(selectedOrder.created_at).toLocaleString('vi-VN')}</p>

                            {selectedOrder.order_type === 'online' ? (
                                <>
                                    <div style={{ borderBottom: '2px dashed #000', margin: '15px 0' }}></div>
                                    <p style={{ textAlign: 'left', margin: '2px 0', fontSize: '11pt' }}>Khách hàng: {selectedOrder.customer_name}</p>
                                    <p style={{ textAlign: 'left', margin: '2px 0', fontSize: '11pt' }}>SĐT: {selectedOrder.customer_phone}</p>
                                    <p style={{ textAlign: 'left', margin: '2px 0', fontSize: '11pt' }}>Địa chỉ: {selectedOrder.customer_address}</p>
                                </>
                            ) : (
                                <>
                                    <p style={{ textAlign: 'center', margin: '0 0 5px 0', fontSize: '11pt' }}>Thu ngân: {selectedOrder.cashier_name || 'Nhân viên'}</p>
                                    {((selectedOrder.customer_name && selectedOrder.customer_name !== 'Khách vãng lai') || (selectedOrder.customer_phone && selectedOrder.customer_phone.trim() !== '')) && (
                                        <>
                                            <div style={{ borderBottom: '2px dashed #000', margin: '15px 0' }}></div>
                                            <p style={{ textAlign: 'left', margin: '2px 0', fontSize: '11pt' }}>Khách hàng: {selectedOrder.customer_name}</p>
                                            <p style={{ textAlign: 'left', margin: '2px 0', fontSize: '11pt' }}>SĐT: {selectedOrder.customer_phone}</p>
                                        </>
                                    )}
                                </>
                            )}

                            <div style={{ borderBottom: '2px dashed #000', margin: '15px 0' }}></div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', fontSize: '11pt' }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: '55%', textAlign: 'left', borderBottom: '2px dashed #000', padding: '5px 0', fontWeight: 'bold' }}>Tên sản phẩm</th>
                                        <th style={{ width: '15%', textAlign: 'center', borderBottom: '2px dashed #000', padding: '5px 0', fontWeight: 'bold' }}>SL</th>
                                        <th style={{ width: '30%', textAlign: 'right', borderBottom: '2px dashed #000', padding: '5px 0', fontWeight: 'bold' }}>Thành tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orderItems.map(item => {
                                        const q = parseInt(item.quantity) || 1;
                                        return (
                                            <tr key={item.id}>
                                                <td style={{ padding: '10px 0', borderBottom: 'none', verticalAlign: 'top', fontSize: '10pt' }}>{item.product_name}</td>
                                                <td style={{ padding: '10px 0', borderBottom: 'none', textAlign: 'center', verticalAlign: 'top', fontSize: '10pt' }}>{q}</td>
                                                <td style={{ padding: '10px 0', borderBottom: 'none', textAlign: 'right', verticalAlign: 'top', fontSize: '10pt' }}>{Number(item.price * q).toLocaleString('vi-VN')}đ</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            <div style={{ borderTop: '2px dashed #000', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '10pt', marginTop: '8px' }}>
                                <span style={{ width: '55%' }}>Tổng số tiền:</span>
                                <span style={{ width: '15%', textAlign: 'center' }}>{orderItems.reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0)}</span>
                                <span style={{ width: '30%', textAlign: 'right' }}>{Number(selectedOrder.total_amount).toLocaleString('vi-VN')}đ</span>
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
                                        (() => {
                                            const isNewFormat = selectedOrder.voucher_code.includes('|');

                                            if (isNewFormat) {
                                                return selectedOrder.voucher_code.split(',').map((vStr, index) => {
                                                    const parts = vStr.split('|');
                                                    const vCode = parts[0].trim();
                                                    const vAmount = parts[1] ? parseInt(parts[1]) : 0;

                                                    return (
                                                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10pt', marginTop: '8px' }}>
                                                            <span>Mã giảm giá ({vCode}):</span>
                                                            <span>-{Number(vAmount).toLocaleString('vi-VN')}đ</span>
                                                        </div>
                                                    );
                                                });
                                            } else {
                                                return (
                                                    <>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10pt', marginTop: '8px' }}>
                                                            <span>Mã giảm giá áp dụng:</span>
                                                            <span>{selectedOrder.voucher_code}</span>
                                                        </div>
                                                    </>
                                                );
                                            }
                                        })()
                                    )}
                                </>
                            )}

                            <div style={{ borderBottom: '2px dashed #000', margin: '15px 0' }}></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13pt', fontWeight: 'bold', margin: '15px 0' }}>
                                <span>TỔNG THANH TOÁN:</span>
                                <span>{Number(selectedOrder.final_total).toLocaleString('vi-VN')}đ</span>
                            </div>

                            {selectedOrder.payment_method === 'cash' && (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10pt', marginTop: '15px' }}>
                                        <span>Khách đưa:</span>
                                        <span>{Number(selectedOrder.amount_tendered || selectedOrder.final_total).toLocaleString('vi-VN')}đ</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10pt', marginTop: '8px' }}>
                                        <span>Tiền thừa:</span>
                                        <span>{Number(Math.max(0, (selectedOrder.amount_tendered || selectedOrder.final_total) - selectedOrder.final_total)).toLocaleString('vi-VN')}đ</span>
                                    </div>
                                </>
                            )}

                            <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '11pt', fontWeight: 'bold' }}>
                                {selectedOrder.order_type === 'online' ? 'Hình thức: ' : 'Hình thức: '}
                                {getPaymentMethodText(selectedOrder)}
                            </div>

                            <div style={{ borderBottom: '2px dashed #000', margin: '15px 0' }}></div>
                            <div style={{ textAlign: 'center', fontStyle: 'italic', fontSize: '11pt', marginTop: '20px' }}>
                                Cảm ơn quý khách và hẹn gặp lại!
                            </div>
                        </div>

                        <button className="receipt-close-btn" onClick={() => setSelectedOrder(null)}>
                            ← Quay lại
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
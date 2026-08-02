import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import './OrderManagement.css';

export default function OrderManagement() {
    const [orders, setOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        const API_BASE = `http://${window.location.hostname}:5000`;

        fetch(`${API_BASE}/orders`)
            .then(res => res.json())
            .then(data => setOrders(data))
            .catch(err => console.error("Lỗi tải đơn hàng:", err));

        const socket = io(API_BASE);

        socket.on('new_order', (newOrder) => {
            setOrders(prevOrders => [newOrder, ...prevOrders]);
            showToast(`CÓ ĐƠN HÀNG MỚI! Khách hàng: ${newOrder.customer_name}`, 'success');
        });

        socket.on('order_updated', ({ id, status, cashier_name, username }) => {
            setOrders(prevOrders => prevOrders.map(order =>
                order.id === id ? { ...order, status, cashier_name: cashier_name || order.cashier_name, username: username || order.username } : order
            ));
        });

        return () => socket.disconnect();
    }, []);

    const currentAdminName = sessionStorage.getItem('displayName') || 'Admin';
    const currentAdminUsername = sessionStorage.getItem('username') || '';
    const role = sessionStorage.getItem('role');

    const updateOrderStatus = (id, newStatus, successMessage) => {
        const API_BASE = `http://${window.location.hostname}:5000`;
        fetch(`${API_BASE}/orders/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: newStatus,
                cashier_name: currentAdminName,
                username: currentAdminUsername
            })
        })
            .then(res => res.json())
            .then(data => {
                showToast(successMessage, 'success');
            })
            .catch(err => {
                console.error("Lỗi cập nhật đơn:", err);
                showToast('Lỗi hệ thống khi cập nhật đơn!', 'error');
            });
    };

    const filteredOrders = orders.filter(order => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();

        const idMatch = order.id && order.id.toLowerCase().includes(term);
        const nameMatch = order.customer_name && order.customer_name.toLowerCase().includes(term);
        const phoneMatch = order.customer_phone && order.customer_phone.includes(term);
        const addressMatch = order.customer_address && order.customer_address.toLowerCase().includes(term);
        const userMatch = order.customer_username && order.customer_username.toLowerCase().includes(term);
        const cashierMatch = order.cashier_name && order.cashier_name.toLowerCase().includes(term);
        const cashierUserMatch = order.username && order.username.toLowerCase().includes(term);

        const statusMatch = order.status === 'pending' ? 'chờ duyệt'.includes(term)
            : order.status === 'confirmed' ? 'đang vận chuyển'.includes(term)
                : order.status === 'completed' ? 'hoàn tất'.includes(term)
                    : 'đã hủy'.includes(term);

        const moneyMatch = order.final_total && order.final_total.toString().includes(term);

        return idMatch || nameMatch || phoneMatch || addressMatch || userMatch || cashierMatch || cashierUserMatch || statusMatch || moneyMatch;
    });

    return (
        <div className="order-mgmt-container">
            {toast && (
                <div className={`global-toast toast-${toast.type}`}>
                    {toast.message}
                </div>
            )}

            <h2 className="order-mgmt-title">Danh Sách Đơn Hàng Online</h2>

            <div style={{ display: 'flex', marginBottom: '20px', marginLeft: '20px' }}>
                <input
                    type="text"
                    className="global-search-input"
                    placeholder="Tìm kiếm đơn hàng..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="order-table-wrapper">
                <table className="order-table">
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'center' }}>Mã đơn hàng</th>
                            <th>Khách hàng</th>
                            <th>Thông tin giao hàng</th>
                            <th style={{ textAlign: 'center' }}>Tổng thanh toán</th>
                            <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Thực hiện</th>
                            {role === 'admin' && <th style={{ textAlign: 'center' }}>TK Thực hiện</th>}
                            <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Trạng thái</th>
                            <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.length === 0 ? (
                            <tr><td colSpan={role === 'admin' ? "8" : "7"} className="empty-order-msg">Không tìm thấy đơn hàng nào phù hợp!</td></tr>
                        ) : (
                            filteredOrders.map(order => (
                                <tr key={order.id} style={{ backgroundColor: order.status === 'pending' ? '#eff6ff' : '#ffffff' }}>
                                    <td className="col-order-id">#{order.id}</td>
                                    <td>
                                        <div className="col-customer-name">{order.customer_name}</div>
                                        <div className="col-customer-sub">Tài khoản: {order.customer_username || ''}</div>
                                    </td>
                                    <td>
                                        <div className="col-contact-info">SĐT: {order.customer_phone}</div>
                                        <div className="col-contact-info">Địa chỉ: {order.customer_address}</div>
                                    </td>
                                    <td className="col-total-money" style={{ textAlign: 'center', fontSize: '11pt', fontWeight: 'bold', color: '#dc2626' }}>
                                        {Number(order.final_total).toLocaleString('vi-VN')}đ
                                    </td>

                                    <td style={{ textAlign: 'center', fontSize: '11pt', fontWeight: 'bold', color: '#4b5563', whiteSpace: 'nowrap' }}>
                                        {order.cashier_name || ''}
                                    </td>

                                    {role === 'admin' && (
                                        <td style={{ fontSize: '11pt', color: '#4b5563', textAlign: 'center' }}>
                                            {order.cashier_name && order.username ? `@${order.username}` : ''}
                                        </td>
                                    )}

                                    <td className="col-center" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                        {order.status === 'pending' && <span className="badge-status-pending">Chờ duyệt</span>}
                                        {order.status === 'confirmed' && <span className="badge-status-confirmed">Đang vận chuyển</span>}
                                        {order.status === 'completed' && <span className="badge-status-completed">Hoàn tất</span>}
                                        {order.status === 'cancelled' && <span className="badge-status-cancelled">Đã hủy</span>}
                                    </td>

                                    <td className="col-center" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                        {order.status === 'pending' ? (
                                            <div className="action-buttons">
                                                <button className="btn-confirm-order" onClick={() => updateOrderStatus(order.id, 'confirmed', 'Đã xác nhận đơn hàng!')}>
                                                    Duyệt
                                                </button>
                                                <button className="btn-cancel-order" onClick={() => updateOrderStatus(order.id, 'cancelled', 'Đã hủy đơn hàng!')}>
                                                    Hủy
                                                </button>
                                            </div>
                                        ) : order.status === 'confirmed' ? (
                                            order.cashier_name === currentAdminName ? (
                                                <div className="action-buttons">
                                                    <button className="btn-complete-order" onClick={() => updateOrderStatus(order.id, 'completed', 'Đã hoàn tất đơn hàng!')}>
                                                        Đã giao
                                                    </button>
                                                    <button className="btn-cancel-order" onClick={() => updateOrderStatus(order.id, 'cancelled', 'Đã hủy đơn hàng!')}>
                                                        Hủy
                                                    </button>
                                                </div>
                                            ) : (
                                                <button className="btn-disabled" disabled title={`Đơn hàng đang được xử lý bởi ${order.cashier_name}`}>
                                                    Đang xử lý
                                                </button>
                                            )
                                        ) : (
                                            <button className="btn-disabled" disabled>
                                                {order.status === 'completed' ? 'Đã xong' : 'Đã hủy'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
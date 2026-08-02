import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { io } from 'socket.io-client';
import './Admin.css';

export default function Admin() {
    const navigate = useNavigate();
    const location = useLocation();
    const [role, setRole] = useState(sessionStorage.getItem('role'));
    const [displayName, setDisplayName] = useState(sessionStorage.getItem('displayName'));
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [hasPendingOrders, setHasPendingOrders] = useState(false);

    useEffect(() => {
        const userRole = sessionStorage.getItem('role');
        const userName = sessionStorage.getItem('displayName');
        if (!userRole) {
            navigate('/login', { replace: true });
        } else {
            const normalizedRole = userRole.toLowerCase().trim();
            if (normalizedRole === 'customer') {
                navigate('/', { replace: true });
            } else {
                setRole(normalizedRole);
                setDisplayName(userName);
            }
        }
    }, [navigate, location.pathname]);

    useEffect(() => {
        if (!role || role === 'customer') return;
        const path = location.pathname;
        if (path === '/admin' || path === '/admin/') {
            if (role === 'admin') navigate('/admin/dashboard', { replace: true });
            else if (role === 'cashier') navigate('/admin/pos', { replace: true });
            else if (role === 'storekeeper') navigate('/admin/inventory', { replace: true });
        }
        if (role === 'cashier' && !path.includes('/admin/pos') && !path.includes('/admin/transactions') && !path.includes('/admin/orderManagement') && !path.includes('/admin/settings')) {
            navigate('/admin/pos', { replace: true });
        }
        if (role === 'storekeeper' && !path.includes('/admin/inventory') && !path.includes('/admin/import') && !path.includes('/admin/settings')) {
            navigate('/admin/inventory', { replace: true });
        }
    }, [role, location.pathname, navigate]);

    useEffect(() => {
        if (role === 'admin' || role === 'cashier') {
            const API_BASE = `http://${window.location.hostname}:5000`;
            const fetchPendingOrders = () => {
                fetch(`${API_BASE}/orders`)
                    .then(res => res.json())
                    .then(data => {
                        const hasPending = data.some(order => order.status === 'pending');
                        setHasPendingOrders(hasPending);
                    })
                    .catch(err => console.error("Lỗi lấy đơn hàng Admin:", err));
            };

            fetchPendingOrders();

            const socket = io(API_BASE);

            socket.on('new_order', () => {
                setHasPendingOrders(true);
            });

            socket.on('order_updated', () => {
                fetchPendingOrders();
            });

            return () => socket.disconnect();
        }
    }, [role]);

    const handleLogout = () => {
        sessionStorage.removeItem('displayName');
        sessionStorage.removeItem('role');
        sessionStorage.removeItem('username');
        window.dispatchEvent(new Event('auth_changed'));
        navigate('/login');
    };

    if (!role || role === 'customer') return null;

    const getRoleName = () => {
        if (role === 'admin') return 'Quản lý';
        if (role === 'storekeeper') return 'Nhân viên Kho';
        if (role === 'cashier') return 'Nhân viên Thu ngân';
        return '';
    };

    const handleNavigate = (path) => {
        navigate(path);
        setIsMenuOpen(false);
    };

    const currentPath = location.pathname;

    const renderMenuContent = () => (
        <ul className="admin-menu">
            {(role === 'admin' || role === 'cashier') && (
                <>
                    <li className={`admin-menu-item ${currentPath.includes('/admin/pos') ? 'active' : ''}`} onClick={() => handleNavigate('/admin/pos')}>
                        Bán hàng tại quầy
                    </li>

                    <li className={`admin-menu-item ${currentPath.includes('/admin/orderManagement') ? 'active' : ''}`} onClick={() => handleNavigate('/admin/orderManagement')}>
                        <div className="menu-item-content">
                            <span>Xử lý Đơn hàng Online</span>
                            {hasPendingOrders && <span className="notification-dot"></span>}
                        </div>
                    </li>

                    <li className={`admin-menu-item ${currentPath.includes('/admin/transactions') ? 'active' : ''}`} onClick={() => handleNavigate('/admin/transactions')}>
                        Thông tin giao dịch
                    </li>
                </>
            )}
            {(role === 'admin' || role === 'storekeeper') && (
                <>
                    <li className={`admin-menu-item ${currentPath.includes('/admin/inventory') ? 'active' : ''}`} onClick={() => handleNavigate('/admin/inventory')}>
                        Quản lý Sản phẩm
                    </li>
                    <li className={`admin-menu-item ${currentPath.includes('/admin/import') ? 'active' : ''}`} onClick={() => handleNavigate('/admin/import')}>
                        Nhập kho
                    </li>
                </>
            )}
            {role === 'admin' && (
                <>
                    <li className={`admin-menu-item ${currentPath.includes('/admin/employees') ? 'active' : ''}`} onClick={() => handleNavigate('/admin/employees')}>
                        Quản lý Nhân viên
                    </li>
                    <li className={`admin-menu-item ${currentPath.includes('/admin/voucher-blog') ? 'active' : ''}`} onClick={() => handleNavigate('/admin/voucher-blog')}>
                        Quản lý Khuyến mãi & Blog
                    </li>
                    <li className={`admin-menu-item ${currentPath.includes('/admin/dashboard') ? 'active' : ''}`} onClick={() => handleNavigate('/admin/dashboard')}>
                        Thống kê Doanh thu
                    </li>
                </>
            )}
            <div className="admin-menu-bottom">
                <li className={`admin-menu-item ${currentPath.includes('/admin/settings') ? 'active' : ''}`} onClick={() => handleNavigate('/admin/settings')}>
                    Cài đặt
                </li>
            </div>
        </ul>
    );

    return (
        <div className="admin-layout-wrapper">
            <header className="admin-top-header">
                <div className="admin-top-left">
                    <button className="admin-hamburger" onClick={() => setIsMenuOpen(true)}>☰</button>
                    <div className="admin-logo-text" onClick={() => handleNavigate('/admin')} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src="/logo.jpg" alt="Logo" style={{ height: '50px', width: '50px', objectFit: 'contain' }} />
                        <span>QUEEN STATIONERY</span>
                    </div>
                </div>

                <div className="admin-top-right">
                    <span className="admin-greeting">{displayName} ({getRoleName()})</span>
                    <button className="admin-btn-logout" onClick={handleLogout}>
                        {role === 'admin' ? 'Đăng xuất' : 'Thoát ca làm'}
                    </button>
                </div>
            </header>
            <div className="admin-body">
                <aside className="desktop-sidebar">
                    {renderMenuContent()}
                </aside>
                {isMenuOpen && (
                    <div className="admin-drawer-overlay" onClick={() => setIsMenuOpen(false)}>
                        <div className="admin-drawer" onClick={e => e.stopPropagation()}>
                            <button className="admin-drawer-close" onClick={() => setIsMenuOpen(false)}>×</button>
                            <h3 className="admin-drawer-title">DANH MỤC</h3>
                            {renderMenuContent()}
                        </div>
                    </div>
                )}
                <main className="admin-main-area">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
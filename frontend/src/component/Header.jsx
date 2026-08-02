import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CartContext } from '../context/CartContext';

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const userMenuRef = useRef(null);
    const [searchInput, setSearchInput] = useState('');
    const { cartCount } = useContext(CartContext);

    const handleSearch = () => {
        if (searchInput.trim() !== '') {
            navigate(`/products?search=${encodeURIComponent(searchInput.trim())}`);
            setSearchInput('');
        }
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSearch();
    };

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const storedUser = sessionStorage.getItem('displayName');
        const storedRole = sessionStorage.getItem('role');

        if (storedUser && storedRole === 'customer') {
            setDisplayName(storedUser);
        } else {
            setDisplayName('');
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) setIsMenuOpen(false);
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setIsUserMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        sessionStorage.removeItem('displayName');
        sessionStorage.removeItem('role');
        sessionStorage.removeItem('username');
        setDisplayName('');
        setIsUserMenuOpen(false);
        window.dispatchEvent(new Event('auth_changed'));
        navigate('/');
    };

    const scrollToSection = (id) => {
        setIsMenuOpen(false);
        if (location.pathname !== '/') {
            navigate('/');
            setTimeout(() => {
                if (id === 'top') window.scrollTo({ top: 0, behavior: 'smooth' });
                else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } else {
            if (id === 'top') window.scrollTo({ top: 0, behavior: 'smooth' });
            else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <header className="header">
            <div className="header-inner">
                <div className="header-left">
                    <div className="menu-container" ref={menuRef}>
                        <button className="menu-toggle-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>☰</button>

                        {isMenuOpen && (
                            <div className="dropdown-menu">
                                <ul className="category-list">
                                    <li className="category-item" onClick={() => scrollToSection('top')}>Trang chủ</li>

                                    <li className="category-item parent-item" onClick={() => setIsSubMenuOpen(!isSubMenuOpen)}>
                                        Sản phẩm<span>{isSubMenuOpen ? '▲' : '▼'}</span>
                                    </li>

                                    {isSubMenuOpen && (
                                        <div className="sub-menu-container">
                                            <li className="category-item sub-item" onClick={() => { setIsMenuOpen(false); navigate('/products'); }}>
                                                Tất cả sản phẩm
                                            </li>
                                            <li className="category-item sub-item" onClick={() => scrollToSection('but-viet')}>Bút viết các loại</li>
                                            <li className="category-item sub-item" onClick={() => scrollToSection('dung-cu')}>Dụng cụ học tập</li>
                                            <li className="category-item sub-item" onClick={() => scrollToSection('nhan-vo')}>Nhãn - Vở học sinh</li>
                                        </div>
                                    )}
                                    <li className="category-item" onClick={() => { setIsMenuOpen(false); navigate('/vouchers'); }}>Khuyến mãi / Voucher</li>
                                    <li className="category-item" onClick={() => scrollToSection('blog')}>Blog</li>
                                    <li className="category-item" onClick={() => scrollToSection('bot')}>Liên hệ</li>
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className="logo" onClick={() => scrollToSection('top')} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src="/logo.jpg" alt="Logo" style={{ height: '45px', width: '50px', objectFit: 'contain' }} />
                        <span>QUEEN STATIONERY</span>
                    </div>
                </div>

                <div className="search-container">
                    <input type="text" placeholder="Tìm kiếm sản phẩm..." className="search-input" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={handleKeyDown} />
                    <button className="search-btn" onClick={handleSearch} title="Tìm kiếm">
                        <img src="/Search_Icon.svg" alt="Search" className="search-icon-img" />
                    </button>
                </div>

                <div className="header-actions">
                    {displayName ? (
                        <div className="user-menu-container" ref={userMenuRef}>
                            <button className="username-btn" onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}>
                                <img src="/icon-login.jpg" alt="user" className="header-icon" />
                                <span>{displayName} ▼</span>
                            </button>
                            {isUserMenuOpen && (
                                <div className="user-dropdown">
                                    <button className="dropdown-item-btn" onClick={() => { setIsUserMenuOpen(false); navigate('/change-password') }}>
                                        Đổi mật khẩu
                                    </button>
                                    <button className="logout-btn" onClick={handleLogout}>Đăng xuất</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <button className="login-btn" onClick={() => navigate('/login')}>
                            <img src="/icon-login.jpg" alt="login" className="header-icon" />
                            <span>Đăng nhập</span>
                        </button>
                    )}
                    <button className="cart-btn" onClick={() => navigate('/cart')}>
                        Giỏ hàng<span className="cart-badge">{cartCount}</span>
                    </button>
                </div>
            </div>
        </header>
    );
}
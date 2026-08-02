import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

export default function Login() {
    const navigate = useNavigate();
    const [view, setView] = useState('login');
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        displayName: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const [errors, setErrors] = useState({
        displayName: '',
        username: '',
        password: '',
        confirmPassword: '',
        email: ''
    });

    const [notification, setNotification] = useState({ text: '', type: '' });

    const [forgotData, setForgotData] = useState({ email: '' });
    const [isSendingMail, setIsSendingMail] = useState(false);

    const handleForgotChange = (e) => {
        setForgotData({ ...forgotData, [e.target.name]: e.target.value });
        setNotification({ text: '', type: '' });
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        const emailRegex = /^(?!.*\.\.)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/;
        
        if (!forgotData.email) {
            setNotification({ text: 'Vui lòng nhập email!', type: 'error' });
            return;
        } else if (!emailRegex.test(forgotData.email)) {
            setNotification({ text: 'Email phải có .com và không chứa (..) liên tiếp!', type: 'error' });
            return;
        }

        setIsSendingMail(true);
        try {
            const API_BASE = `http://${window.location.hostname}:5000`;
            const res = await fetch(`${API_BASE}/api/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotData.email })
            });

            const data = await res.json();
            if (res.ok) {
                setNotification({ text: data.message, type: 'success' });

                setTimeout(() => {
                    setView('login');
                    setNotification({ text: '', type: '' });
                    setForgotData({ email: '' });
                }, 3000);
            } else {
                setNotification({ text: data.error || 'Lỗi gửi mail!', type: 'error' });
            }
        } catch (error) {
            setNotification({ text: 'Không thể kết nối đến máy chủ!', type: 'error' });
        }
        setIsSendingMail(false);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setErrors({ ...errors, [e.target.name]: '' });
        setNotification({ text: '', type: '' });
    };

    const switchView = (newView) => {
        setView(newView);
        setFormData({ displayName: '', username: '', email: '', password: '', confirmPassword: '' });
        setForgotData({ email: '' });
        setErrors({ displayName: '', username: '', password: '', confirmPassword: '', email: '' });
        setNotification({ text: '', type: '' });
        setShowPassword(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        let isValid = true;
        let newErrors = { displayName: '', username: '', password: '', confirmPassword: '', email: '' };

        if (view === 'register' && formData.displayName.trim() === '') {
            newErrors.displayName = 'Vui lòng nhập tên hiển thị!';
            isValid = false;
        }

        if (formData.username.trim() === '') {
            newErrors.username = 'Vui lòng nhập tên đăng nhập!';
            isValid = false;
        }

        if (view === 'register') {
            const emailRegex = /^(?!.*\.\.)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (formData.email.trim() === '') {
                newErrors.email = 'Vui lòng nhập email!';
                isValid = false;
            } else if (!emailRegex.test(formData.email)) {
                newErrors.email = 'Email sai định dạng!';
                isValid = false;
            }
        }

        if (formData.password.trim() === '') {
            newErrors.password = 'Vui lòng nhập mật khẩu!';
            isValid = false;
        } else if (formData.password.length < 8) {
            newErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự!';
            isValid = false;
        }

        if (view === 'register') {
            if (formData.confirmPassword.trim() === '') {
                newErrors.confirmPassword = 'Vui lòng nhập lại mật khẩu!';
                isValid = false;
            } else if (formData.password !== formData.confirmPassword) {
                newErrors.confirmPassword = 'Mật khẩu nhập lại không khớp!';
                isValid = false;
            }
        }

        setErrors(newErrors);

        if (!isValid) {
            setTimeout(() => {
                setErrors({ displayName: '', username: '', password: '', confirmPassword: '', email: '' });
            }, 3000);
            return;
        }

        const API_BASE = `http://${window.location.hostname}:5000`;
        const url = view === 'login' ? `${API_BASE}/login` : `${API_BASE}/register`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await response.json();

            if (response.ok) {
                if (view === 'login') {
                    setNotification({ text: data.message, type: 'success' });
                    const rawRole = data.user.role || 'customer';
                    const userRole = rawRole.toLowerCase().trim();

                    sessionStorage.setItem('displayName', data.user.display_name);
                    sessionStorage.setItem('role', data.user.role);
                    sessionStorage.setItem('username', data.user.username);
                    window.dispatchEvent(new Event('auth_changed'));

                    setTimeout(() => {
                        if (data.user.role === 'customer') {
                            const redirectUrl = sessionStorage.getItem('redirect_after_login');
                            if (redirectUrl) {
                                sessionStorage.removeItem('redirect_after_login');
                                navigate(redirectUrl); // Quay thẳng về giỏ hàng
                            } else {
                                navigate('/'); // Nếu đăng nhập bình thường thì về trang chủ
                            }
                        } else if (userRole === 'admin') {
                            navigate('/admin/dashboard');
                        } else if (userRole === 'cashier') {
                            navigate('/admin/pos');
                        } else if (userRole === 'storekeeper') {
                            navigate('/admin/inventory');
                        } else {
                            navigate('/');
                        }
                    }, 1000);
                } else {
                    setNotification({ text: 'Đăng ký thành công!', type: 'success' });
                    setTimeout(() => {
                        setView('login');
                        setNotification({ text: '', type: '' });

                        setFormData(prev => ({
                            displayName: '',
                            username: prev.username,
                            email: '',
                            password: '',
                            confirmPassword: ''
                        }));
                        setErrors({ displayName: '', username: '', password: '', confirmPassword: '', email: '' });
                    }, 1000);
                }
            } else {
                setNotification({ text: data.error || data.message || 'Sai tên đăng nhập hoặc mật khẩu!', type: 'error' });
            }
        } catch (error) {
            setNotification({ text: 'Không thể kết nối đến máy chủ!', type: 'error' });
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2 className="login-title">
                    {view === 'login' && 'ĐĂNG NHẬP'}
                    {view === 'register' && 'ĐĂNG KÝ TÀI KHOẢN'}
                    {view === 'forgot' && 'KHÔI PHỤC MẬT KHẨU'}
                </h2>

                {notification.text && (
                    <div className={`notification-box ${notification.type === 'success' ? 'notification-success' : 'notification-error'}`}>
                        {notification.text}
                    </div>
                )}

                {view === 'forgot' ? (
                    <form onSubmit={handleForgotPassword} className="login-form">
                        <p style={{ fontSize: '11pt', color: '#4b5563', textAlign: 'center', margin: '0 0 5px 0' }}>
                            Nhập email để nhận lại mật khẩu mới.
                        </p>

                        <div className="input-group">
                            <input
                                type="email"
                                name="email"
                                placeholder="Email đã đăng ký"
                                value={forgotData.email}
                                className="login-input"
                                onChange={handleForgotChange}
                            />
                        </div>
                        <button
                            type="submit"
                            className="login-submit-btn"
                            disabled={isSendingMail || !forgotData.email.trim()}
                            style={{
                                opacity: (!forgotData.email.trim() || isSendingMail) ? 0.6 : 1,
                                cursor: (!forgotData.email.trim() || isSendingMail) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isSendingMail ? 'Đang gửi...' : 'Gửi thông tin'}
                        </button>
                        <div className="login-back-link" style={{ marginTop: '10px' }}>
                            <span onClick={() => switchView('login')}>← Quay lại đăng nhập</span>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleSubmit} className="login-form">

                        {view === 'register' && (
                            <>
                                <div className="input-group">
                                    <input type="text" name="displayName" placeholder="Tên hiển thị" value={formData.displayName} className={`login-input ${errors.displayName ? 'input-error' : ''}`} onChange={handleChange} />
                                    {errors.displayName && <span className="error-message">{errors.displayName}</span>}
                                </div>

                                <div className="input-group">
                                    <input type="email" name="email" placeholder="Email" value={formData.email} className={`login-input ${errors.email ? 'input-error' : ''}`} onChange={handleChange} />
                                    {errors.email && <span className="error-message">{errors.email}</span>}
                                </div>
                            </>
                        )}

                        <div className="input-group">
                            <input type="text" name="username" placeholder="Tên tài khoản" value={formData.username} className={`login-input ${errors.username ? 'input-error' : ''}`} onChange={handleChange} />
                            {errors.username && <span className="error-message">{errors.username}</span>}
                        </div>

                        <div className="input-group">
                            <input type={showPassword ? "text" : "password"} name="password" placeholder="Mật khẩu" value={formData.password} className={`login-input ${errors.password ? 'input-error' : ''}`} onChange={handleChange} />
                            {errors.password && <span className="error-message">{errors.password}</span>}
                        </div>

                        {view === 'register' && (
                            <div className="input-group">
                                <input type={showPassword ? "text" : "password"} name="confirmPassword" placeholder="Nhập lại mật khẩu" value={formData.confirmPassword} className={`login-input ${errors.confirmPassword ? 'input-error' : ''}`} onChange={handleChange} />
                                {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
                            </div>
                        )}

                        {view === 'login' && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '-5px 0 0 0' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10pt', color: '#4b5563', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                                        checked={showPassword}
                                        onChange={() => setShowPassword(!showPassword)}
                                    />
                                    Hiện mật khẩu
                                </label>
                                <span
                                    style={{ color: '#2563eb', fontSize: '10pt', cursor: 'pointer', fontWeight: 'bold' }}
                                    onClick={() => switchView('forgot')}
                                >
                                    Quên mật khẩu?
                                </span>
                            </div>
                        )}

                        {view === 'register' && (
                            <div style={{ display: 'flex', alignItems: 'center', margin: '-5px 0 0 0' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10pt', color: '#4b5563', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                                        checked={showPassword}
                                        onChange={() => setShowPassword(!showPassword)}
                                    />
                                    Hiện mật khẩu
                                </label>
                            </div>
                        )}

                        <button type="submit" className="login-submit-btn">
                            {view === 'login' ? 'Đăng Nhập' : 'Đăng Ký'}
                        </button>
                    </form>
                )}

                {view !== 'forgot' && (
                    <p className="login-toggle-text">
                        {view === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
                        <span className="login-toggle-link" onClick={() => switchView(view === 'login' ? 'register' : 'login')}>
                            {view === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}
                        </span>
                    </p>
                )}

                {view !== 'forgot' && (
                    <div className="login-back-link">
                        <span onClick={() => navigate('/')}>← Quay lại trang chủ</span>
                    </div>
                )}
            </div>
        </div>
    );
}
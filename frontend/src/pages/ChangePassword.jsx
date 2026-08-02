import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

export default function ChangePassword() {
    const navigate = useNavigate();
    const [pwData, setPwData] = useState({ old: '', new: '', confirm: '' });
    const [errors, setErrors] = useState({ old: '', new: '', confirm: '' });
    const [notification, setNotification] = useState({ text: '', type: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const handleChange = (e) => {
        setPwData({ ...pwData, [e.target.name]: e.target.value });
        setErrors({ ...errors, [e.target.name]: '' });
        setNotification({ text: '', type: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        let isValid = true;
        let newErrors = { old: '', new: '', confirm: '' };

        if (!pwData.old) {
            newErrors.old = 'Vui lòng nhập mật khẩu cũ!';
            isValid = false;
        }

        if (!pwData.new) {
            newErrors.new = 'Vui lòng nhập mật khẩu mới!';
            isValid = false;
        } else if (pwData.new.length < 8) {
            newErrors.new = 'Mật khẩu mới phải có ít nhất 8 ký tự!';
            isValid = false;
        }

        if (!pwData.confirm) {
            newErrors.confirm = 'Vui lòng xác nhận mật khẩu!';
            isValid = false;
        } else if (pwData.new !== pwData.confirm) {
            newErrors.confirm = 'Mật khẩu xác nhận không khớp!';
            isValid = false;
        }

        setErrors(newErrors);

        if (!isValid) {
            setTimeout(() => {
                setErrors({ old: '', new: '', confirm: '' });
            }, 2000);
            return;
        }

        setIsSubmitting(true);
        try {
            const API_BASE = `http://${window.location.hostname}:5000`;
            const username = sessionStorage.getItem('username');

            const res = await fetch(`${API_BASE}/api/change-password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, old_password: pwData.old, new_password: pwData.new })
            });
            const data = await res.json();

            if (res.ok) {
                setNotification({ text: 'Đổi mật khẩu thành công!', type: 'success' });
                setPwData({ old: '', new: '', confirm: '' });

                setTimeout(() => {
                    navigate('/');
                }, 1500);
            } else {
                if (data.error && data.error.includes("Mật khẩu cũ")) {
                    setErrors({ ...newErrors, old: data.error });

                    setTimeout(() => {
                        setErrors(prev => ({ ...prev, old: '' }));
                    }, 2000);
                } else {
                    setNotification({ text: data.error || 'Có lỗi xảy ra!', type: 'error' });
                }
            }
        } catch (error) {
            setNotification({ text: 'Lỗi kết nối máy chủ!', type: 'error' });
        }
        setIsSubmitting(false);
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2 className="login-title">ĐỔI MẬT KHẨU</h2>

                {notification.text && (
                    <div className={`notification-box ${notification.type === 'success' ? 'notification-success' : 'notification-error'}`}
                        style={{ padding: '5px', marginBottom: '10px', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold', color: notification.type === 'success' ? '#10b981' : '#ef4444' }}>
                        {notification.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="input-group">
                        <input
                            type="password"
                            name="old"
                            placeholder="Mật khẩu cũ"
                            value={pwData.old}
                            className={`login-input ${errors.old ? 'input-error' : ''}`}
                            onChange={handleChange}
                        />
                        {errors.old && <span className="error-message">{errors.old}</span>}
                    </div>

                    <div className="input-group">
                        <input
                            type="password"
                            name="new"
                            placeholder="Mật khẩu mới (từ 8 ký tự)"
                            value={pwData.new}
                            className={`login-input ${errors.new ? 'input-error' : ''}`}
                            onChange={handleChange}
                        />
                        {errors.new && <span className="error-message">{errors.new}</span>}
                    </div>

                    <div className="input-group">
                        <input
                            type="password"
                            name="confirm"
                            placeholder="Xác nhận mật khẩu mới"
                            value={pwData.confirm}
                            className={`login-input ${errors.confirm ? 'input-error' : ''}`}
                            onChange={handleChange}
                        />
                        {errors.confirm && <span className="error-message">{errors.confirm}</span>}
                    </div>

                    <button type="submit" className="login-submit-btn" disabled={isSubmitting}>
                        {isSubmitting ? 'Đang xử lý...' : 'Xác nhận'}
                    </button>
                </form>

                <div className="login-back-link" style={{ marginTop: '20px' }}>
                    <span onClick={() => navigate('/')}>← Quay lại trang chủ</span>
                </div>
            </div>
        </div>
    );
}
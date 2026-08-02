import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Settings.css';

export default function Settings() {
    const navigate = useNavigate();
    const role = sessionStorage.getItem('role');
    const username = sessionStorage.getItem('username');
    const API_BASE = `http://${window.location.hostname}:5000`;

    const [toast, setToast] = useState(null);
    const showToast = (msg, type) => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const [origUser, setOrigUser] = useState({});
    const [user, setUser] = useState({
        display_name: '', email: '', phone: '', gender: '', date_of_birth: '', country: '', old_password: '', new_password: '', username: '', role: ''
    });

    const [origStore, setOrigStore] = useState({});
    const [store, setStore] = useState({
        name: '', hotline: '', email: '', operating_hours: '', address: ''
    });
    const [userEmailError, setUserEmailError] = useState('');
    const [storeEmailError, setStoreEmailError] = useState('');

    useEffect(() => {
        const safeUsername = username ? username.trim() : '';
        if (!safeUsername) {
            alert("Phiên đăng nhập bị lỗi. Vui lòng đăng nhập lại!");
            sessionStorage.clear();
            navigate('/login');
            return;
        }

        fetch(`${API_BASE}/api/users/${safeUsername}`)
            .then(res => res.ok ? res.json() : {})
            .then(data => {
                let dob = '';
                if (data.date_of_birth) {
                    const d = new Date(data.date_of_birth);
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    dob = `${year}-${month}-${day}`;
                }

                const cleanData = {
                    display_name: data.display_name || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    gender: data.gender || '',
                    date_of_birth: dob,
                    country: data.country || '',
                    username: data.username || safeUsername,
                    role: data.role || role,
                    old_password: '',
                    new_password: ''
                };
                setOrigUser(cleanData);
                setUser(cleanData);
            })
            .catch(() => showToast("Không thể kết nối đến máy chủ!", "error"));

        if (role === 'admin') {
            fetch(`${API_BASE}/api/store-info`)
                .then(res => res.ok ? res.json() : {})
                .then(data => {
                    const cleanStore = {
                        name: data.name || '', hotline: data.hotline || '', email: data.email || '',
                        operating_hours: data.operating_hours || '', address: data.address || ''
                    };
                    setOrigStore(cleanStore);
                    setStore(cleanStore);
                });
        }
    }, [username, role, API_BASE, navigate]);

    const isUserChanged = JSON.stringify(origUser) !== JSON.stringify(user);
    const isStoreChanged = JSON.stringify(origStore) !== JSON.stringify(store);
    const [showPasswordError, setShowPasswordError] = useState(false);

    const handleUserChange = (e) => {
        setUser(prev => ({ ...prev, [e.target.name]: e.target.value }));
        if (e.target.name === 'new_password') setShowPasswordError(false);
    };

    const handleStoreChange = (e) => setStore(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleUpdateUser = () => {
        const emailRegex = /^(?!.*\.\.)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (user.email && !emailRegex.test(user.email)) {
            setUserEmailError("Email sai định dạng!");
            setTimeout(() => setUserEmailError(''), 3000);
            return;
        }
        if (user.new_password && user.new_password.length < 8) {
            setShowPasswordError(true);
            return;
        }

        if (user.new_password && !user.old_password) {
            return showToast("Vui lòng nhập mật khẩu hiện tại!", "error");
        }

        fetch(`${API_BASE}/api/users/${username}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(user)
        }).then(res => res.json()).then(data => {
            if (data.success) {
                showToast("Đã cập nhật thông tin cá nhân!", "success");
                setOrigUser({ ...user, old_password: '', new_password: '' });
                setUser({ ...user, old_password: '', new_password: '' });
                sessionStorage.setItem('displayName', user.display_name);
                window.dispatchEvent(new Event('auth_changed'));
                setShowPasswordError(false);
            } else {
                showToast(data.error || "Lỗi cập nhật", "error");
            }
        }).catch(() => showToast("Lỗi kết nối máy chủ", "error"));
    };

    const handleUpdateStore = () => {
        const emailRegex = /^(?!.*\.\.)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (store.email && !emailRegex.test(store.email)) {
            setStoreEmailError("Email sai định dạng!");
            setTimeout(() => setStoreEmailError(''), 3000);
            return;
        }
        fetch(`${API_BASE}/api/store-info`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(store)
        }).then(res => res.json()).then(data => {
            if (data.success) {
                showToast("Đã cập nhật thông tin Cửa hàng!", "success");
                setOrigStore(store);
            }
        }).catch(() => showToast("Lỗi kết nối máy chủ", "error"));
    };

    const getRoleName = (r) => {
        if (r === 'admin') return 'Quản lý (Admin)';
        if (r === 'cashier') return 'Nhân viên Thu ngân';
        if (r === 'storekeeper') return 'Nhân viên Thủ kho';
        return 'Nhân viên';
    };

    return (
        <div className="settings-container">
            {toast && <div className={"global-toast toast-" + toast.type} style={{ zIndex: 999 }}>{toast.msg}</div>}
            <div className="settings-header"><h2 className="settings-title">Cài đặt Hệ thống</h2></div>
            {role === 'admin' && (
                <div className="settings-card">
                    <div className="card-header-set">
                        <h3>Thông tin cửa hàng</h3>
                        <button className={`btn-update ${isStoreChanged ? 'active' : ''}`} disabled={!isStoreChanged} onClick={handleUpdateStore}>
                            Cập nhật
                        </button>
                    </div>
                    <div className="settings-grid">
                        <div className="set-group">
                            <label>Tên cửa hàng</label>
                            <input type="text" name="name" className="set-input" value={store.name || ''} onChange={handleStoreChange} />
                        </div>
                        <div className="set-group">
                            <label>Số điện thoại</label>
                            <input type="text" name="hotline" className="set-input" value={store.hotline || ''} onChange={handleStoreChange} />
                        </div>
                        <div className="set-group">
                            <label>Email liên hệ</label>
                            <input type="text" name="email" className={`set-input ${storeEmailError ? 'input-error' : ''}`} value={store.email || ''} onChange={e => { handleStoreChange(e); setStoreEmailError(''); }} />
                            {storeEmailError && <div className="error-text">{storeEmailError}</div>}
                        </div>
                        <div className="set-group">
                            <label>Giờ hoạt động</label>
                            <input type="text" name="operating_hours" className="set-input" placeholder="08:00 - 22:00" value={store.operating_hours || ''} onChange={handleStoreChange} />
                        </div>
                        <div className="set-group" style={{ gridColumn: '1 / -1' }}>
                            <label>Địa chỉ cửa hàng</label>
                            <input type="text" name="address" className="set-input" value={store.address || ''} onChange={handleStoreChange} />
                        </div>
                    </div>
                </div>
            )}
            <div className="settings-card">
                <div className="card-header-set">
                    <h3>Thông tin cá nhân</h3>
                    <button className={`btn-update ${isUserChanged ? 'active' : ''}`} disabled={!isUserChanged} onClick={handleUpdateUser}>
                        Cập nhật
                    </button>
                </div>
                <div className="settings-grid">

                    <div className="set-group">
                        <label>Tên đăng nhập</label>
                        <input type="text" className="set-input" value={user.username || ''} disabled title="Không thể đổi tên đăng nhập" />
                    </div>
                    <div className="set-group">
                        <label>Chức vụ</label>
                        <input type="text" className="set-input" value={getRoleName(user.role)} disabled title="Bạn không có quyền tự đổi chức vụ" />
                    </div>

                    <div className="set-group">
                        <label>Mật khẩu hiện tại</label>
                        <input type="password" name="old_password" className="set-input" placeholder="Nhập mật khẩu hiện tại" value={user.old_password || ''} onChange={handleUserChange} />
                    </div>
                    <div className="set-group">
                        <label>Mật khẩu mới</label>
                        <input
                            type="password" name="new_password"
                            className={`set-input ${showPasswordError ? 'input-error' : ''}`}
                            placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
                            value={user.new_password || ''} onChange={handleUserChange}
                        />
                        {showPasswordError && <div className="error-text">Mật khẩu mới phải có ít nhất 8 ký tự!</div>}
                    </div>

                    <div className="set-group">
                        <label>Họ và tên</label>
                        <input type="text" name="display_name" className="set-input" value={user.display_name || ''} onChange={handleUserChange} />
                    </div>
                    <div className="set-group">
                        <label>Giới tính</label>
                        <select name="gender" className="set-input" value={user.gender || ''} onChange={handleUserChange}>
                            <option value="">-- Chọn --</option>
                            <option value="male">Nam</option>
                            <option value="female">Nữ</option>
                            <option value="other">Khác</option>
                        </select>
                    </div>
                    <div className="set-group">
                        <label>Email cá nhân</label>
                        <input type="text" name="email" className={`set-input ${userEmailError ? 'input-error' : ''}`} value={user.email || ''} onChange={e => { handleUserChange(e); setUserEmailError(''); }} />
                        {userEmailError && <div className="error-text">{userEmailError}</div>}
                    </div>
                    <div className="set-group">
                        <label>Số điện thoại</label>
                        <input type="text" name="phone" className="set-input" value={user.phone || ''} onChange={e => setUser(prev => ({ ...prev, phone: e.target.value.replace(/[^0-9]/g, '') }))} />
                    </div>
                    <div className="set-group">
                        <label>Ngày sinh</label>
                        <input type="date" name="date_of_birth" className="set-input" value={user.date_of_birth || ''} onChange={handleUserChange} />
                    </div>
                    <div className="set-group">
                        <label>Quốc gia</label>
                        <input type="text" name="country" className="set-input" value={user.country || ''} onChange={handleUserChange} />
                    </div>
                </div>
            </div>

        </div>
    );
}
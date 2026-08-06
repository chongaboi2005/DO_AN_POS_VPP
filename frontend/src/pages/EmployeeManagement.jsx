import React, { useState, useEffect } from 'react';
import './EmployeeManagement.css';
import * as XLSX from 'xlsx';

export default function EmployeeManagement() {
    const [employees, setEmployees] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, usernameToDelete: null });
    const [toast, setToast] = useState(null);
    const [emailError, setEmailError] = useState('');
    const [resetConfirmDialog, setResetConfirmDialog] = useState({ isOpen: false, username: null, displayName: null });

    const [formData, setFormData] = useState({
        display_name: '', username: '', password: '', role: '',
        email: '', phone: '', gender: '', date_of_birth: '', country: 'Việt Nam',
        status: 'active', originalUsername: ''
    });

    const [isAttModalOpen, setIsAttModalOpen] = useState(false);
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [attData, setAttData] = useState({ today: null, stats: {}, history: [] });
    const [checkoutSelections, setCheckoutSelections] = useState({});
    const API_BASE = `http://${window.location.hostname}:5000`;
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchEmployees = async () => {
        try {
            const res = await fetch(`${API_BASE}/employees`);
            let emps = await res.json();

            emps = emps.filter(emp => emp.role !== 'admin');

            const empsWithAttendance = await Promise.all(emps.map(async (emp) => {
                const attRes = await fetch(`${API_BASE}/api/attendance/${emp.username}`);
                if (attRes.ok) {
                    const att = await attRes.json();
                    return { ...emp, attData: att };
                }
                return emp;
            }));

            setEmployees(empsWithAttendance);
        } catch (err) {
            console.error("Lỗi tải dữ liệu", err);
        }
    };

    useEffect(() => { fetchEmployees(); }, []);

    const handleOpenCreate = () => {
        setIsEdit(false); setShowPassword(false);
        setFormData({ display_name: '', username: '', password: '', role: '', email: '', phone: '', gender: '', date_of_birth: '', country: 'Việt Nam', status: 'active', originalUsername: '' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (emp) => {
        setIsEdit(true); setShowPassword(false);
        setFormData({ ...emp, password: '', originalUsername: emp.username });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        const emailRegex = /^(?!.*\.\.)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (formData.email && !emailRegex.test(formData.email)) {
            setEmailError("Email sai định dạng!");
            setTimeout(() => setEmailError(''), 3000);
            return;
        }
        if (!isEdit) {
            if (!formData.username || !formData.password || !formData.display_name || !formData.role || !formData.gender || !formData.date_of_birth || !formData.phone || !formData.country) {
                return showToast("Vui lòng điền đầy đủ các thông định", "error");
            }
            if (formData.password.length < 8) return showToast("Mật khẩu phải từ 8 ký tự!", "error");
        } else {
            if (!formData.username) return showToast("Tên đăng nhập không được để trống!", "error");
        }
        const method = isEdit ? 'PUT' : 'POST';
        const url = isEdit ? `${API_BASE}/employees/${formData.originalUsername}` : `${API_BASE}/employees`;
        try {
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
            const data = await res.json();
            if (res.ok) {
                showToast(isEdit ? "Cập nhật thành công!" : "Đã thêm nhân viên!", "success");
                setIsModalOpen(false); fetchEmployees();
            } else showToast(data.error || "Lỗi cập nhật", "error");
        } catch (err) { showToast("Lỗi kết nối", "error"); }
    };

    const confirmDelete = async () => {
        try {
            const res = await fetch(`${API_BASE}/employees/${confirmDialog.usernameToDelete}`, { method: 'DELETE' });
            if (res.ok) { showToast("Đã xóa nhân viên!", "success"); fetchEmployees(); }
        } catch (err) { }
        setConfirmDialog({ isOpen: false, usernameToDelete: null });
    };

    const handleLock = async (emp) => {
        const newStatus = emp.status === 'active' ? 'locked' : 'active';
        try {
            await fetch(`${API_BASE}/employees/${emp.username}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...emp, status: newStatus })
            });
            showToast(`Đã ${newStatus === 'locked' ? 'khóa' : 'mở khóa'} tài khoản!`, "success"); fetchEmployees();
        } catch (err) { }
    };

    const handleResetPasswordClick = (username, displayName) => {
        setResetConfirmDialog({ isOpen: true, username, displayName });
    };

    const confirmResetPassword = async () => {
        const { username, displayName } = resetConfirmDialog;
        try {
            const res = await fetch(`${API_BASE}/api/employees/${username}/reset-password`, { method: 'PUT' });
            const data = await res.json();
            if (res.ok) {
                showToast(`Đã cấp lại mật khẩu cho ${displayName}!`, "success");
            } else {
                showToast(data.error || "Lỗi cấp lại mật khẩu!", "error");
            }
        } catch (err) {
            showToast("Lỗi kết nối", "error");
        }
        setResetConfirmDialog({ isOpen: false, username: null, displayName: null });
    };

    const handleSelectChange = (username, value) => {
        setCheckoutSelections(prev => ({ ...prev, [username]: value }));
    };

    const handleCheckIn = async (username) => {
        try {
            const res = await fetch(`${API_BASE}/api/attendance/check-in`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            const data = await res.json();
            if (res.ok) {
                showToast("Đã thực hiện chấm công!", "success");
                fetchEmployees();
            } else showToast(data.error, "error");
        } catch (err) { showToast("Lỗi kết nối", "error"); }
    };

    const handleCheckOut = async (username) => {
        const status = checkoutSelections[username] || 'full';
        try {
            const res = await fetch(`${API_BASE}/api/attendance/check-out`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, shift_status: status })
            });
            if (res.ok) {
                showToast("Đã chốt ca và tính lương!", "success");
                fetchEmployees();
            }
        } catch (err) { showToast("Lỗi kết nối", "error"); }
    };

    const openAttendance = (emp) => {
        setSelectedEmp(emp);
        fetch(`${API_BASE}/api/attendance/${emp.username}`)
            .then(res => res.json())
            .then(data => {
                setAttData(data);
                setIsAttModalOpen(true);
            });
    };

    const formatCurrency = (num) => (Number(num) || 0).toLocaleString('vi-VN');
    const formatTime = (isoString) => {
        if (!isoString) return '--:--';
        return new Date(isoString).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const handleExportExcel = () => {
        if (!selectedEmp || !attData || !attData.history) return;
        const summaryArray = [
            ["THÔNG TIN CÁ NHÂN", ""],
            ["Họ và tên nhân viên:", selectedEmp.display_name],
            ["Tên tài khoản:", selectedEmp.username],
            ["Chức vụ:", selectedEmp.role === 'cashier' ? 'Thu ngân' : 'Thủ kho'],
            ["", ""],
            ["TỔNG KẾT TIỀN LƯƠNG", ""],
            ["Thu nhập hôm nay (VNĐ):", attData.stats.day_total || 0],
            ["Thu nhập tuần này (VNĐ):", attData.stats.week_total || 0],
            ["Thu nhập tháng này (VNĐ):", attData.stats.month_total || 0]
        ];

        const historyData = attData.history.map((row, index) => {
            let statusText = '';
            if (row.shift_status === 'working') statusText = 'Đang làm...';
            else if (row.shift_status === 'full') statusText = 'Đủ ca';
            else if (row.shift_status === 'half') statusText = 'Nửa ca';
            else statusText = 'Tự ý nghỉ';

            return {
                "STT": index + 1,
                "Ngày làm việc": new Date(row.work_date).toLocaleDateString('vi-VN'),
                "Giờ vào ca": formatTime(row.check_in),
                "Giờ ra ca": formatTime(row.check_out),
                "Phân loại ca": statusText,
                "Tiền lương nhận được (VNĐ)": row.daily_wage || 0
            };
        });

        const wb = XLSX.utils.book_new();
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryArray);
        const wsHistory = XLSX.utils.json_to_sheet(historyData);

        wsSummary['!cols'] = [{ wch: 30 }, { wch: 25 }];
        wsHistory['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 25 }];

        XLSX.utils.book_append_sheet(wb, wsSummary, "Tổng Quan Lương");
        XLSX.utils.book_append_sheet(wb, wsHistory, "Lịch Sử Chấm Công");

        const dateStr = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
        XLSX.writeFile(wb, `Bang_Luong_${selectedEmp.username}_${dateStr}.xlsx`);

        showToast(`Đã xuất bảng lương của ${selectedEmp.display_name}!`, "success");
    };

    return (
        <div className="emp-container">
            {toast && <div className={"global-toast toast-" + toast.type}>{toast.message}</div>}

            <div className="emp-header">
                <h2 className="emp-title">Quản lý Tài khoản Nhân viên</h2>
                <button className="global-btn-add" onClick={handleOpenCreate}>+ Thêm Nhân Viên</button>
            </div>

            <div className="emp-table-wrapper">
                <table className="emp-table">
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left' }}>Họ và tên</th>
                            <th style={{ textAlign: 'left' }}>Tài khoản</th>
                            <th style={{ textAlign: 'center' }}>Số điện thoại</th>
                            <th style={{ textAlign: 'center' }}>Vai trò</th>
                            <th style={{ textAlign: 'center' }}>Trạng thái</th>
                            <th style={{ textAlign: 'center' }}>Chấm công</th>
                            <th style={{ textAlign: 'center' }}>Tiền lương</th>
                            <th style={{ textAlign: 'center' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {employees.map(emp => (
                            <tr key={emp.username}>
                                <td style={{ textAlign: 'left' }}><b style={{ color: '#1f2937', fontSize: '11pt' }}>{emp.display_name}</b></td>
                                <td style={{ textAlign: 'left', color: '#6b7280', fontSize: '11pt' }}>@{emp.username}</td>
                                <td style={{ textAlign: 'center', fontSize: '11pt' }}>{emp.phone || ''}</td>
                                <td style={{ textAlign: 'center', fontSize: '11pt' }}>
                                    {emp.role === 'admin' ? 'Quản lý' : emp.role === 'cashier' ? 'Thu ngân' : 'Thủ kho'}
                                </td>
                                <td style={{ textAlign: 'center', fontSize: '11pt' }}>
                                    <span className={`status-badge ${emp.status === 'active' ? 'status-active' : 'status-locked'}`}>
                                        {emp.status === 'active' ? 'Đang làm' : 'Đã khóa'}
                                    </span>
                                </td>

                                <td style={{ textAlign: 'center', fontSize: '11pt' }}>
                                    {!emp.attData?.today ? (
                                        <button className="att-btn-inline checkin" onClick={() => handleCheckIn(emp.username)}>Bắt đầu ca</button>
                                    ) : emp.attData.today.shift_status === 'working' ? (
                                        <div className="inline-att-box">
                                            <span style={{ fontSize: '9pt', color: '#d97706', fontStyle: 'italic' }}>Đang làm...</span>
                                            <div>
                                                <select
                                                    className="inline-select"
                                                    value={checkoutSelections[emp.username] || 'full'}
                                                    onChange={e => handleSelectChange(emp.username, e.target.value)}
                                                >
                                                    <option value="full">Đủ ca</option>
                                                    <option value="half">&gt;50% ca</option>
                                                    <option value="cancelled">Tự ý nghỉ</option>
                                                </select>
                                                <button className="att-btn-inline chotca" onClick={() => handleCheckOut(emp.username)}>Chốt</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '10pt' }}>Đã chốt ca</span>
                                    )}
                                </td>

                                <td style={{ textAlign: 'center' }}>
                                    <button className="action-btn btn-timekeep" onClick={() => openAttendance(emp)}>Xem</button>
                                </td>

                                <td style={{ textAlign: 'center' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '5px' }}>
                                        <button className="action-btn btn-edit" onClick={() => handleOpenEdit(emp)}>Sửa</button>

                                        {emp.role !== 'admin' && (
                                            <>
                                                <button className="action-btn btn-reset-pwd" onClick={() => handleResetPasswordClick(emp.username, emp.display_name)}>Cấp MK</button>
                                                <button className="action-btn btn-lock" onClick={() => handleLock(emp)}>
                                                    {emp.status === 'active' ? 'Khóa' : 'Mở'}
                                                </button>
                                                <button className="action-btn btn-delete" onClick={() => setConfirmDialog({ isOpen: true, usernameToDelete: emp.username })}>
                                                    Xóa
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {resetConfirmDialog.isOpen && (
                <div className="global-modal-overlay" onClick={() => setResetConfirmDialog({ isOpen: false, username: null, displayName: null })}>
                    <div className="global-confirm-modal" onClick={e => e.stopPropagation()}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: '10px 0 5px 0', color: '#1f2937', fontSize: '13pt' }}>Cấp lại mật khẩu?</h3>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button className="confirm-btn-no" onClick={() => setResetConfirmDialog({ isOpen: false, username: null, displayName: null })}>Hủy</button>
                            <button className="confirm-btn-yes" onClick={confirmResetPassword}>Xác nhận</button>
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="global-modal-overlay" onMouseDown={() => setIsModalOpen(false)}>
                    <div className="emp-modal-box" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: isEdit ? '500px' : '750px' }}>
                        <div className="global-modal-header">
                            <h3 className="global-modal-title">{isEdit ? 'Chỉnh sửa Quyền và Tài khoản' : 'Thêm Nhân viên mới'}</h3>
                            <button className="btn-close-modal" onClick={() => setIsModalOpen(false)}>×</button>
                        </div>
                        <div className="emp-modal-body">
                            {isEdit ? (
                                <>
                                    <div className="emp-form-group">
                                        <label>Họ và tên</label>
                                        <input type="text" className="emp-input" value={formData.display_name} disabled title="Họ tên cố định, không thể sửa ở đây" />
                                    </div>
                                    <div style={{ display: 'flex', gap: '15px' }}>
                                        <div className="emp-form-group" style={{ flex: 1 }}>
                                            <label>Tên đăng nhập</label>
                                            <input type="text" className="emp-input" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase() })} />
                                        </div>
                                        <div className="emp-form-group" style={{ flex: 1 }}>
                                            <label>Chức vụ</label>
                                            <select className="emp-input" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} disabled={employees.find(e => e.username === formData.originalUsername)?.role === 'admin'} >
                                                <option value="cashier">Nhân viên Thu ngân</option>
                                                <option value="storekeeper">Nhân viên Thủ kho</option>
                                            </select>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', gap: '15px' }}>
                                        <div className="emp-form-group" style={{ flex: 1 }}>
                                            <label>Tên đăng nhập</label>
                                            <input type="text" className="emp-input" placeholder="Ví dụ: nv00..." value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase() })} />
                                        </div>
                                        <div className="emp-form-group" style={{ flex: 1 }}>
                                            <label>Mật khẩu (Tối thiểu 8 ký tự)</label>
                                            <div className="pwd-wrapper">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    className="emp-input"
                                                    value={formData.password}
                                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                />
                                                <button
                                                    className="pwd-toggle"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                                >
                                                    <img
                                                        src="/icon-password.jpg"
                                                        alt="Toggle"
                                                        style={{ width: '22px', height: '22px', opacity: showPassword ? 1 : 0.4 }}
                                                    />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '15px' }}>
                                        <div className="emp-form-group" style={{ flex: 1 }}>
                                            <label>Chức vụ</label>
                                            <select className="emp-input" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                                <option value="">-- Chọn chức vụ--</option>
                                                <option value="cashier">Nhân viên Thu ngân</option>
                                                <option value="storekeeper">Nhân viên Thủ kho</option>
                                            </select>
                                        </div>
                                        <div className="emp-form-group" style={{ flex: 1 }}>
                                            <label>Họ và tên</label>
                                            <input type="text" className="emp-input" placeholder="Ví dụ: Nguyễn Văn A" value={formData.display_name} onChange={e => setFormData({ ...formData, display_name: e.target.value })} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '15px' }}>
                                        <div className="emp-form-group" style={{ flex: 1 }}>
                                            <label>Giới tính</label>
                                            <select className="emp-input" value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                                                <option value="">-- Chọn giới tính--</option>
                                                <option value="male">Nam</option>
                                                <option value="female">Nữ</option>
                                                <option value="other">Khác</option>
                                            </select>
                                        </div>
                                        <div className="emp-form-group" style={{ flex: 1 }}>
                                            <label>Ngày sinh</label>
                                            <input type="date" className="emp-input" value={formData.date_of_birth} onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '15px' }}>
                                        <div className="emp-form-group" style={{ flex: 1 }}>
                                            <label>Số điện thoại</label>
                                            <input type="text" className="emp-input" placeholder="Ví dụ: 0345678910" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9]/g, '') })} />
                                        </div>
                                        <div className="emp-form-group" style={{ flex: 1 }}>
                                            <label>Quốc gia</label>
                                            <input type="text" className="emp-input" placeholder="Ví dụ: Việt Nam" value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="emp-form-group">
                                        <label>Email cá nhân</label>
                                        <input
                                            type="text"
                                            className="emp-input"
                                            placeholder="Ví dụ: nguyenvana@gmail.com"
                                            value={formData.email}
                                            style={emailError ? { borderColor: '#ef4444', backgroundColor: '#fef2f2' } : {}}
                                            onChange={e => {
                                                setFormData({ ...formData, email: e.target.value });
                                                setEmailError('');
                                            }}
                                        />
                                        {emailError && <span style={{ color: '#ef4444', fontSize: '9pt', fontWeight: 'bold' }}>{emailError}</span>}
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="global-modal-footer">
                            <button className="global-btn-cancel" onClick={() => setIsModalOpen(false)}>Hủy</button>
                            <button className="global-btn-confirm" onClick={handleSave}>{isEdit ? 'Cập nhật' : 'Xác nhận'}</button>
                        </div>
                    </div>
                </div>
            )}

            {isAttModalOpen && selectedEmp && (
                <div className="global-modal-overlay" onMouseDown={() => setIsAttModalOpen(false)}>
                    <div className="emp-modal-box" style={{ maxWidth: '550px' }} onMouseDown={e => e.stopPropagation()}>
                        <div className="global-modal-header">
                            <h3 className="global-modal-title">Bảng lương: {selectedEmp.display_name}</h3>
                            <button className="btn-close-modal" onClick={() => setIsAttModalOpen(false)}>×</button>
                        </div>
                        <div className="emp-modal-body" style={{ padding: '10px' }}>

                            <div className="wage-cards">
                                <div className="wage-card">
                                    <h4>Hôm nay</h4>
                                    <p className="amount">{formatCurrency(attData.stats.day_total)}đ</p>
                                </div>
                                <div className="wage-card week">
                                    <h4>Tuần này</h4>
                                    <p className="amount">{formatCurrency(attData.stats.week_total)}đ</p>
                                </div>
                                <div className="wage-card month">
                                    <h4>Tháng này</h4>
                                    <p className="amount">{formatCurrency(attData.stats.month_total)}đ</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h4 style={{ margin: 0, color: '#374151' }}>Lịch sử làm việc</h4>
                                <button className="global-btn-add" style={{ marginRight: '0' }} onClick={handleExportExcel}>
                                    Xuất Excel
                                </button>
                            </div>

                            <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
                                <table className="att-history-table" style={{ tableLayout: 'fixed', marginBottom: 0 }}>
                                    <thead>
                                        <tr>
                                            <th>Ngày</th>
                                            <th>Vào</th>
                                            <th>Ra</th>
                                            <th>Loại ca</th>
                                            <th>Lương</th>
                                            <th style={{ width: '15px', padding: 0, borderBottom: '2px solid #e5e7eb' }}></th>
                                        </tr>
                                    </thead>
                                </table>
                                <div className="scrollable-tbody">
                                    <table className="att-history-table" style={{ tableLayout: 'fixed' }}>
                                        <tbody>
                                            {attData.history.length === 0 ? (<tr><td colSpan="5">Chưa có lịch sử</td></tr>) : attData.history.map(row => (
                                                <tr key={row.id}>
                                                    <td>{new Date(row.work_date).toLocaleDateString('vi-VN')}</td>
                                                    <td>{formatTime(row.check_in)}</td>
                                                    <td>{formatTime(row.check_out)}</td>
                                                    <td>
                                                        {row.shift_status === 'working' ? 'Đang làm...' : row.shift_status === 'full' ? 'Đủ ca' : row.shift_status === 'half' ? 'Nửa ca' : 'Tự ý nghỉ'}
                                                    </td>
                                                    <td style={{ fontWeight: 'bold', color: row.daily_wage > 0 ? '#10b981' : '#ef4444' }}>{formatCurrency(row.daily_wage)}đ</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="global-modal-footer">
                            <button className="global-btn-cancel" onClick={() => setIsAttModalOpen(false)}>Đóng</button>
                        </div>
                    </div>
                </div>
            )}

            {confirmDialog.isOpen && (
                <div className="global-modal-overlay" onClick={() => setConfirmDialog({ isOpen: false, usernameToDelete: null })}>
                    <div className="global-confirm-modal" onClick={e => e.stopPropagation()}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: '10px 0 5px 0', color: '#1f2937', fontSize: '13pt' }}>Xác nhận xóa nhân viên?</h3>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button className="confirm-btn-no" onClick={() => setConfirmDialog({ isOpen: false, usernameToDelete: null })}>Hủy</button>
                            <button className="confirm-btn-yes" onClick={confirmDelete}>Xác nhận</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
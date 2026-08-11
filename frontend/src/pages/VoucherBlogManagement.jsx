import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import './VoucherBlogManagement.css';

const quillModules = {
    toolbar: [
        ['bold', 'italic', 'underline'],
        [{ 'color': [] }],
        [{ 'align': [] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['clean']
    ]
};

export default function VoucherBlogManagement() {
    const [vouchers, setVouchers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeTab, setActiveTab] = useState('pos');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVoucherId, setEditingVoucherId] = useState(null);
    const [formData, setFormData] = useState({
        code: '', type: 'pos', discount_type: '', discount_value: '',
        min_order: '', max_discount: '', category_id: '', description: ''
    });

    const [blogs, setBlogs] = useState([]);
    const [isBlogModalOpen, setIsBlogModalOpen] = useState(false);
    const [editingBlogId, setEditingBlogId] = useState(null);
    const [blogForm, setBlogForm] = useState({ title: '', description: '' });
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, idToDelete: null, type: 'voucher' });
    const [toast, setToast] = useState(null);
    const API_BASE = `http://${window.location.hostname}:5000`;
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchVouchers = () => fetch(`${API_BASE}/vouchers`).then(res => res.json()).then(data => setVouchers(Array.isArray(data) ? data : [])).catch(() => setVouchers([]));
    const fetchCategories = () => fetch(`${API_BASE}/categories`).then(res => res.json()).then(data => setCategories(Array.isArray(data) ? data : [])).catch(() => setCategories([]));
    const fetchBlogs = () => fetch(`${API_BASE}/blogs`).then(res => res.json()).then(data => setBlogs(Array.isArray(data) ? data : [])).catch(() => setBlogs([]));

    useEffect(() => {
        fetchVouchers(); fetchCategories(); fetchBlogs();
    }, []);

    const handleOpenCreateVoucher = () => {
        setFormData({ code: '', type: activeTab === 'pos' ? 'pos' : 'online', discount_type: '', discount_value: '', min_order: '', max_discount: '', category_id: '', description: '' });
        setEditingVoucherId(null);
        setIsModalOpen(true);
    };

    const handleOpenEditVoucher = (v) => {
        setFormData({
            code: v.code,
            type: v.type,
            discount_type: v.discount_type,
            discount_value: Number(v.discount_value),
            min_order: Number(v.min_order),
            max_discount: v.max_discount ? Number(v.max_discount) : '',
            category_id: v.category_id || '',
            description: v.description
        });
        setEditingVoucherId(v.id);
        setIsModalOpen(true);
    };

    const handleSaveVoucher = async () => {
        if (!formData.code || !formData.discount_type || !formData.discount_value || !formData.description) {
            showToast("Vui lòng điền đầy đủ và chọn Hình thức giảm!", "error"); return;
        }
        const payload = {
            ...formData,
            discount_value: parseInt(formData.discount_value) || 0,
            min_order: parseInt(formData.min_order) || 0,
            max_discount: parseInt(formData.max_discount) || null
        };

        const method = editingVoucherId ? 'PUT' : 'POST';
        const url = editingVoucherId ? `${API_BASE}/vouchers/${editingVoucherId}` : `${API_BASE}/vouchers`;

        try {
            const res = await fetch(url, {
                method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                showToast(editingVoucherId ? "Cập nhật thành công!" : "Thêm thành công!", "success");
                setIsModalOpen(false); fetchVouchers();
            } else showToast(data.error, "error");
        } catch (error) { showToast("Lỗi hệ thống", "error"); }
    };

    const handleOpenCreateBlog = () => {
        setBlogForm({ title: '', description: '' });
        setSelectedFile(null); setPreviewUrl('');
        setEditingBlogId(null);
        setIsBlogModalOpen(true);
    };

    const handleOpenEditBlog = (b) => {
        setBlogForm({ title: b.title, description: b.description });
        setPreviewUrl(b.image_url || '');
        setSelectedFile(null);
        setEditingBlogId(b.id);
        setIsBlogModalOpen(true);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) { setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file)); }
    };

    const handleSaveBlog = async () => {
        if (!blogForm.title || !blogForm.description) {
            showToast("Điền đẩy đủ thông tin chi tiết!", "error"); return;
        }
        setIsUploading(true);
        const data = new FormData();
        data.append('title', blogForm.title);
        data.append('description', blogForm.description);
        if (selectedFile) data.append('image', selectedFile);

        const method = editingBlogId ? 'PUT' : 'POST';
        const url = editingBlogId ? `${API_BASE}/blogs/${editingBlogId}` : `${API_BASE}/blogs`;

        try {
            const res = await fetch(url, { method: method, body: data });
            if (res.ok) {
                showToast(editingBlogId ? "Cập nhật thành công!" : "Thêm thành công!", "success");
                setIsBlogModalOpen(false); fetchBlogs();
            } else showToast("Lỗi khi lưu bài!", "error");
        } catch (err) { showToast("Lỗi hệ thống!", "error"); }
        setIsUploading(false);
    };

    const handleDeleteClick = (id, type) => setConfirmDialog({ isOpen: true, idToDelete: id, type });

    const confirmDelete = async () => {
        const { idToDelete, type } = confirmDialog;
        setConfirmDialog({ isOpen: false, idToDelete: null, type: 'voucher' });
        try {
            if (type === 'blog') {
                await fetch(`${API_BASE}/blogs/${idToDelete}`, { method: 'DELETE' });
                showToast("Đã xóa bài viết!", "success"); fetchBlogs();
            } else {
                await fetch(`${API_BASE}/vouchers/${idToDelete}`, { method: 'DELETE' });
                showToast("Đã xóa mã giảm giá!", "success"); fetchVouchers();
            }
        } catch (error) { showToast("Lỗi hệ thống khi xóa!", "error"); }
    };

    const displayedVouchers = vouchers.filter(v => v.type === activeTab);

    return (
        <div className="vm-container">
            {toast && <div className={"global-toast toast-" + toast.type}>{toast.message}</div>}

            <div className="vm-header">
                <h2 className="vm-title">Quản lý Khuyến mãi & Blog</h2>
                <button className="global-btn-add" style={{ marginRight: '15px' }} onClick={() => activeTab === 'blog' ? handleOpenCreateBlog() : handleOpenCreateVoucher()}>
                    {activeTab === 'blog' ? '+ Thêm mới' : '+ Thêm mới'}
                </button>
            </div>

            <div className="vm-tabs">
                <div className={`vm-tab ${activeTab === 'pos' ? 'active' : ''}`} onClick={() => setActiveTab('pos')}>Mã tại quầy</div>
                <div className={`vm-tab ${activeTab === 'online' ? 'active' : ''}`} onClick={() => setActiveTab('online')}>Mã Đặt hàng</div>
                <div className={`vm-tab ${activeTab === 'blog' ? 'active' : ''}`} onClick={() => setActiveTab('blog')}>Blog</div>
            </div>

            <div className={activeTab === 'blog' ? "blog-grid" : "vm-grid"}>
                {activeTab === 'blog' ? (
                    blogs.map(b => (
                        <div key={b.id} className="blog-card" onClick={() => handleOpenEditBlog(b)}>
                            <button className="vm-delete-btn" style={{ zIndex: 10 }} onClick={(e) => { e.stopPropagation(); handleDeleteClick(b.id, 'blog'); }}>Xóa</button>
                            <div className="blog-img-wrapper">
                                <img src={b.image_url || 'https://via.placeholder.com/300x150?text=No+Image'} alt={b.title} className="blog-img" />
                            </div>
                            <div className="blog-content">
                                <h3 className="blog-title">{b.title}</h3>
                                <div className="blog-excerpt" dangerouslySetInnerHTML={{ __html: b.description ? b.description.replace(/&nbsp;/g, ' ') : 'Đang cập nhật nội dung...' }}></div>
                            </div>
                        </div>
                    ))
                ) : (
                    displayedVouchers.map(v => (
                        <div key={v.id} className={`vm-card ${v.type}`} onClick={() => handleOpenEditVoucher(v)}>
                            <button className="vm-delete-btn" onClick={(e) => { e.stopPropagation(); handleDeleteClick(v.id, 'voucher'); }}>Xóa</button>
                            <h3 className="vm-code">{v.code}</h3>
                            <p className="vm-value">
                                {v.discount_type === 'ship' ? `GIẢM ${Number(v.discount_value).toLocaleString('vi-VN')}đ PHÍ SHIP` :
                                    v.discount_type === 'fixed' ? `GIẢM ${Number(v.discount_value).toLocaleString('vi-VN')}đ` :
                                        `GIẢM ${Number(v.discount_value).toLocaleString('vi-VN')}%`}
                            </p>
                            <div className="vm-desc" dangerouslySetInnerHTML={{ __html: v.description ? v.description.replace(/&nbsp;/g, ' ') : 'Không có mô tả' }}></div>
                        </div>
                    ))
                )}
            </div>

            {isBlogModalOpen && (
                <div className="global-modal-overlay" onMouseDown={() => setIsBlogModalOpen(false)}>
                    <div className="vm-modal-box" onMouseDown={e => e.stopPropagation()}>

                        <div className="global-modal-header">
                            <h3 className="global-modal-title">{editingBlogId ? 'Cập nhật Blog' : 'Thêm Blog Mới'}</h3>
                            <button className="btn-close-modal" onClick={() => setIsBlogModalOpen(false)}>×</button>
                        </div>

                        <div className="vm-modal-body">
                            <div className="vm-form-group">
                                <label>Tiêu đề</label>
                                <input type="text" placeholder="Nhập tiêu đề bài viết..." value={blogForm.title} onChange={e => setBlogForm({ ...blogForm, title: e.target.value })} />
                            </div>

                            <div className="vm-form-group">
                                <label>Hình ảnh minh họa</label>

                                <div style={{ position: 'relative', width: '100%' }}>
                                    <input type="file" accept="image/*" onChange={handleImageChange} style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 2 }} />
                                    <div style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '11pt', background: '#ffffff', color: selectedFile ? '#1f2937' : '#9ca3af', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', boxSizing: 'border-box' }}>
                                        {selectedFile ? selectedFile.name : "Chọn ảnh bài viết..."}
                                    </div>
                                </div>
                                {previewUrl && (
                                    <div className="img-preview-box">
                                        <img src={previewUrl} alt="Preview" />
                                    </div>
                                )}
                            </div>

                            <div className="vm-form-group" style={{ marginBottom: '45px' }}>
                                <label>Mô tả chi tiết</label>
                                <ReactQuill
                                    theme="snow"
                                    modules={quillModules}
                                    placeholder="Nhập mô tả chi tiết cho bài viết..."
                                    value={blogForm.description || ''}
                                    onChange={value => setBlogForm({ ...blogForm, description: value })}
                                    style={{ height: '168px', background: '#ffffff' }}
                                />
                            </div>
                        </div>

                        <div className="global-modal-footer">
                            <button className="global-btn-cancel" onClick={() => setIsBlogModalOpen(false)}>Hủy</button>
                            <button className="global-btn-confirm" onClick={handleSaveBlog} disabled={isUploading}>
                                {isUploading ? 'Đợi ảnh...' : (editingBlogId ? 'Cập nhật' : 'Xác nhận')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="global-modal-overlay" onMouseDown={() => setIsModalOpen(false)}>
                    <div className="vm-modal-box" onMouseDown={e => e.stopPropagation()}>
                        <div className="global-modal-header">
                            <h3 className="global-modal-title">{editingVoucherId ? 'Cập nhật Mã Khuyến Mãi' : 'Tạo Mã Khuyến Mãi'}</h3>
                            <button className="btn-close-modal" onClick={() => setIsModalOpen(false)}>×</button>
                        </div>

                        <div className="vm-modal-body">
                            <div className="vm-form-group">
                                <label>Mã áp dụng</label>
                                <select value={formData.type} onChange={e => {
                                    const newType = e.target.value;
                                    setFormData({ ...formData, type: newType, discount_type: newType === 'online' ? 'ship' : 'percent' });
                                }}>
                                    <option value="pos">Tại quầy</option>
                                    <option value="online">Đặt hàng Website</option>
                                </select>
                            </div>

                            <div className="vm-form-group">
                                <label>Mã CODE</label>
                                <input type="text" placeholder="Ví dụ: SALE2026" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })} />
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div className="vm-form-group" style={{ flex: 1 }}>
                                    <label>Hình thức giảm</label>
                                    <select value={formData.discount_type} onChange={e => setFormData({ ...formData, discount_type: e.target.value })}>
                                        <option value="">-- Chọn hình thức giảm--</option>
                                        {formData.type === 'pos' ? (
                                            <><option value="percent">Giảm theo %</option>
                                                <option value="fixed">Giảm tiền trực tiếp</option></>
                                        ) : (
                                            <option value="ship">Giảm phí vận chuyển</option>
                                        )}
                                    </select>
                                </div>
                                <div className="vm-form-group" style={{ flex: 1 }}>
                                    <label>{formData.type === 'pos' && formData.discount_type !== 'fixed' ? 'Mức giảm theo %' : 'Số tiền giảm (VNĐ)'}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder={formData.type === 'pos' && formData.discount_type !== 'fixed' ? "Ví dụ: 10" : "Ví dụ: 50000"}
                                        value={formData.discount_value}
                                        onWheel={e => e.target.blur()}
                                        onKeyDown={(e) => ['e', 'E', '+', '-', '.', ','].includes(e.key) && e.preventDefault()}
                                        onChange={e => {
                                            let val = e.target.value;
                                            if (formData.type === 'pos' && formData.discount_type !== 'fixed' && Number(val) > 100) {
                                                e.target.style.borderColor = '#ef4444';
                                                e.target.style.boxShadow = '0 0 5px rgba(239, 68, 68, 0.5)';
                                                setTimeout(() => { if (e.target) { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; } }, 800);
                                                return;
                                            }
                                            e.target.style.borderColor = '#d1d5db';
                                            e.target.style.boxShadow = 'none';
                                            setFormData({ ...formData, discount_value: val });
                                        }}
                                        style={{ transition: 'all 0.3s ease' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div className="vm-form-group" style={{ flex: 1 }}>
                                    <label>Đơn tối thiểu (VNĐ)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="Ví dụ: 150000"
                                        value={formData.min_order}
                                        onWheel={e => e.target.blur()}
                                        onKeyDown={(e) => ['e', 'E', '+', '-', '.', ','].includes(e.key) && e.preventDefault()}
                                        onChange={e => setFormData({ ...formData, min_order: e.target.value })}
                                    />
                                </div>
                                {formData.type === 'pos' && formData.discount_type !== 'fixed' && (
                                    <div className="vm-form-group" style={{ flex: 1 }}>
                                        <label>Giảm Tối đa (VNĐ)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="Ví dụ: 30000"
                                            value={formData.max_discount}
                                            onWheel={e => e.target.blur()}
                                            onKeyDown={(e) => ['e', 'E', '+', '-', '.', ','].includes(e.key) && e.preventDefault()}
                                            onChange={e => setFormData({ ...formData, max_discount: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>

                            {formData.type === 'pos' && (
                                <div className="vm-form-group">
                                    <label>Danh mục áp dụng</label>
                                    <select value={formData.category_id || ''} onChange={e => setFormData({ ...formData, category_id: e.target.value })}>
                                        <option value="">-- Áp dụng cho tất cả danh mục --</option>
                                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                    </select>
                                </div>
                            )}

                            <div className="vm-form-group" style={{ marginBottom: '45px' }}>
                                <label>Mô tả chi tiết</label>
                                <ReactQuill
                                    theme="snow"
                                    modules={quillModules}
                                    placeholder="Nhập mô tả chi tiết cho mã giảm giá..."
                                    value={formData.description || ''}
                                    onChange={value => setFormData({ ...formData, description: value })}
                                    style={{ height: '48px', background: '#ffffff' }}
                                />
                            </div>
                        </div>

                        <div className="global-modal-footer">
                            <button className="global-btn-cancel" onClick={() => setIsModalOpen(false)}>Hủy</button>
                            <button className="global-btn-confirm" onClick={handleSaveVoucher}>
                                {editingVoucherId ? 'Cập nhật' : 'Xác nhận'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {confirmDialog.isOpen && (
                <div className="global-modal-overlay" onClick={() => setConfirmDialog({ isOpen: false, idToDelete: null, type: 'voucher' })}>
                    <div className="global-confirm-modal" onClick={e => e.stopPropagation()}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: '10px 0 5px 0', color: '#1f2937', fontSize: '13pt' }}>{confirmDialog.type === 'blog' ? 'Xác nhận xóa blog?' : 'Xác nhận xóa mã giảm giá?'}</h3>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button className="confirm-btn-no" onClick={() => setConfirmDialog({ isOpen: false, idToDelete: null, type: 'voucher' })}>Hủy</button>
                            <button className="confirm-btn-yes" onClick={confirmDelete}>Xác nhận</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
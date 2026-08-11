import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import './Inventory.css';

const quillModules = {
    toolbar: [
        ['bold', 'italic', 'underline'],
        [{ 'color': [] }],
        [{ 'align': [] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['clean']
    ]
};

export default function Inventory() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [deleteProductId, setDeleteProductId] = useState(null);
    const [toast, setToast] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);

    const role = sessionStorage.getItem('role');

    const [formData, setFormData] = useState({
        id: '', barcode: '', name: '', price: '', image_url: '', category_id: '', description: '', stock: 0
    });

    const API_BASE = `http://${window.location.hostname}:5000`;

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchData = () => {
        Promise.all([
            fetch(`${API_BASE}/products`).then(res => res.json()),
            fetch(`${API_BASE}/categories`).then(res => res.json())
        ]).then(([prodData, catData]) => {
            setProducts(prodData);
            setCategories(catData);
        }).catch(err => console.error("Lỗi lấy dữ liệu:", err));
    };

    useEffect(() => { fetchData(); }, []);

    const handleOpenModal = (product = null) => {
        if (product) {
            setIsEdit(true);
            setFormData({ ...product, price: Number(product.price) });
        } else {
            setIsEdit(false);
            setFormData({ id: '', barcode: '', name: '', price: '', image_url: '', category_id: '', description: '', stock: 0 });
        }
        setPreviewUrl('');
        setSelectedFile(null);
        setIsModalOpen(true);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const localUrl = URL.createObjectURL(file);
        setPreviewUrl(localUrl);
        setSelectedFile(file);
    };

    const handleSave = async () => {
        setIsUploading(true);
        let finalImageUrl = formData.image_url;
        if (selectedFile) {
            const uploadData = new FormData();
            uploadData.append('image', selectedFile);
            try {
                const resUpload = await fetch(`${API_BASE}/upload`, { method: 'POST', body: uploadData });
                const dataUpload = await resUpload.json();
                if (resUpload.ok) {
                    finalImageUrl = dataUpload.imageUrl;
                } else {
                    showToast("Lỗi tải ảnh: " + dataUpload.error, "error");
                    setIsUploading(false);
                    return;
                }
            } catch (err) {
                console.error(err);
                showToast("Lỗi hệ thống khi tải ảnh!", "error");
                setIsUploading(false);
                return;
            }
        }

        const url = isEdit ? `${API_BASE}/products/${formData.id}` : `${API_BASE}/products`;
        const method = isEdit ? 'PUT' : 'POST';

        const payload = { ...formData, image_url: finalImageUrl };
        if (role !== 'admin') delete payload.price;

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                showToast(isEdit ? "Cập nhật thành công!" : "Thêm sản phẩm thành công!", "success");
                setIsModalOpen(false);
                fetchData();
            } else {
                const err = await res.json();
                showToast("Điền đầy đủ thông tin chi tiết", "error");
            }
        } catch (error) {
            showToast("Lỗi hệ thống!", "error");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteClick = (id) => setDeleteProductId(id);

    const confirmDelete = async () => {
        if (!deleteProductId) return;
        try {
            const res = await fetch(`${API_BASE}/products/${deleteProductId}`, { method: 'DELETE' });
            if (res.ok) {
                showToast("Xóa sản phẩm thành công!", "success");
                fetchData();
                setDeleteProductId(null);
            }
        } catch (error) {
            showToast("Lỗi hệ thống khi xóa!", "error");
        }
    };

    const displayedProducts = products
        .filter(p => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            const catName = categories.find(c => c.id === p.category_id)?.name || '';
            return p.name.toLowerCase().includes(term) || (p.barcode && p.barcode.toLowerCase().includes(term)) || catName.toLowerCase().includes(term);
        })
        .sort((a, b) => {
            const aLowStock = a.stock <= 20;
            const bLowStock = b.stock <= 20;
            if (aLowStock && !bLowStock) return -1;
            if (!aLowStock && bLowStock) return 1;
            if (a.category_id < b.category_id) return -1;
            if (a.category_id > b.category_id) return 1;
            return a.id - b.id;
        });

    return (
        <div className="inventory-container">
            {toast && <div className={"global-toast toast-" + toast.type}>{toast.message}</div>}

            <div className="inventory-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="inventory-title">Quản lý Sản phẩm</h2>
                <div className="header-actions">
                    {role === 'admin' && (
                        <button className="global-btn-add" style={{ marginRight: '10px' }} onClick={() => handleOpenModal()}>+ Thêm Sản Phẩm Mới</button>
                    )}
                </div>
            </div>

            <div className="inventory-search-bar">
                <input
                    type="text"
                    className="global-search-input"
                    placeholder="Tìm kiếm sản phẩm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="inventory-table-wrapper">
                <table className="inv-table">
                    <thead>
                        <tr>
                            <th className="col-id">STT</th>
                            <th className="col-img">Hình ảnh</th>
                            <th className="col-barcode">Mã vạch</th>
                            <th className="col-name">Tên sản phẩm</th>
                            <th className="col-category">Danh mục</th>
                            <th className="col-price">Giá bán</th>
                            <th className="col-stock">Tồn kho</th>
                            <th className="col-action">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedProducts.length === 0 ? (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: '#6b7280', fontStyle: 'italic', fontSize: '12pt' }}>
                                    Không tìm thấy sản phẩm nào phù hợp!
                                </td>
                            </tr>
                        ) : (
                            displayedProducts.map((p, index) => (
                                <tr key={p.id} className={p.stock <= 20 ? 'row-danger' : ''}>
                                    <td className="col-id"><span className="text-id">{index + 1}</span></td>
                                    <td className="col-img"><img src={p.image_url} alt={p.name} className="inv-img" /></td>
                                    <td className="col-barcode"><span className="text-barcode">{p.barcode || '---'}</span></td>
                                    <td className="col-name"><span className="text-name">{p.name}</span></td>
                                    <td className="col-category"><span className="badge-category">{categories.find(c => c.id === p.category_id)?.name || p.category_id}</span></td>
                                    <td className="col-price"><span className="text-price">{Number(p.price).toLocaleString('vi-VN')}đ</span></td>
                                    <td className="col-stock">
                                        <span className={`text-stock ${p.stock <= 20 ? 'stock-danger' : 'stock-safe'}`}>{p.stock}</span>
                                        {p.stock === 0 ? (
                                            <span className="text-warning" style={{ color: '#dc2626' }}>Hết hàng</span>
                                        ) : p.stock <= 20 ? (
                                            <span className="text-warning">Sắp hết</span>
                                        ) : null}
                                    </td>
                                    <td className="col-action">
                                        <button className="inv-btn-edit" onClick={() => handleOpenModal(p)}>Sửa</button>
                                        <button className="inv-btn-delete" onClick={() => handleDeleteClick(p.id)}>Xóa</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="global-modal-overlay" onMouseDown={() => setIsModalOpen(false)}>
                    <div className="inv-modal" onMouseDown={e => e.stopPropagation()}>
                        <div className="global-modal-header">
                            <h3 className="global-modal-title">
                                {isEdit ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
                            </h3>
                            <button className="btn-close-modal" onClick={() => setIsModalOpen(false)}>×</button>
                        </div>

                        <div style={{ padding: '10px', overflowY: 'hidden', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', gap: '20px' }}>
                                <div style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        <label style={{ fontWeight: 'bold', fontSize: '10pt', color: '#4b5563' }}>Tên sản phẩm</label>
                                        <input className="inv-input" placeholder="Ví dụ: Bút bi 0.5mm..." value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                            <label style={{ fontWeight: 'bold', fontSize: '10pt', color: '#4b5563' }}>Mã vạch</label>
                                            <input type="text" className="inv-input" placeholder="Nhập số mã vạch..." value={formData.barcode} onChange={e => setFormData({ ...formData, barcode: e.target.value.replace(/[^0-9]/g, '') })} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                            <label style={{ fontWeight: 'bold', fontSize: '10pt', color: '#4b5563' }}>Danh mục</label>
                                            <select className="inv-input" value={formData.category_id} onChange={e => setFormData({ ...formData, category_id: e.target.value })}>
                                                <option value="">-- Chọn danh mục --</option>
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <label style={{ fontWeight: 'bold', fontSize: '10pt', color: '#4b5563' }}>Ảnh xem trước</label>
                                    <div style={{
                                        flex: 1, border: '2px dashed #d1d5db', borderRadius: '8px', background: '#f9fafb',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        height: '128px', maxHeight: '128px', padding: '4px', overflow: 'hidden'
                                    }}>
                                        {(previewUrl || formData.image_url) ? (
                                            <img src={previewUrl || formData.image_url} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px' }} />
                                        ) : (
                                            <span style={{ color: '#9ca3af', fontSize: '10pt' }}>Chưa có ảnh</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '20px' }}>
                                <div style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    {role === 'admin' && (
                                        <>
                                            <label style={{ fontWeight: 'bold', fontSize: '10pt', color: '#4b5563' }}>Giá bán (VND)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                className="inv-input"
                                                placeholder="Ví dụ: 10000"
                                                value={formData.price}
                                                onWheel={(e) => e.target.blur()}
                                                onKeyDown={(e) => ['e', 'E', '+', '-', '.', ','].includes(e.key) && e.preventDefault()}
                                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                                            />
                                        </>
                                    )}
                                </div>
                                <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <label style={{ fontWeight: 'bold', fontSize: '10pt', color: '#4b5563' }}>Tải Hình ảnh lên</label>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <div style={{ position: 'relative', width: '100%' }}>
                                            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 2 }} />
                                            <div style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '11pt', background: '#fff', color: selectedFile ? '#1f2937' : '#9ca3af', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', boxSizing: 'border-box' }}>
                                                {selectedFile ? selectedFile.name : "Chọn ảnh sản phẩm..."}
                                            </div>
                                        </div>
                                        {isUploading && <span style={{ color: '#2563eb', fontSize: '9pt', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Đang tải...</span>}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', height: '240px', marginBottom: '20px' }}>
                                <label style={{ fontWeight: 'bold', fontSize: '10pt', color: '#4b5563' }}>Mô tả sản phẩm</label>
                                <ReactQuill
                                    theme="snow"
                                    modules={quillModules}
                                    placeholder="Mô tả chi tiết sản phẩm..."
                                    value={formData.description || ''}
                                    onChange={value => setFormData({ ...formData, description: value })}
                                    style={{ height: '178px', background: '#ffffff' }}
                                />
                            </div>

                        </div>

                        <div className="global-modal-footer">
                            <button className="global-btn-cancel" onClick={() => setIsModalOpen(false)}>Hủy</button>
                            <button className="global-btn-confirm" onClick={handleSave} disabled={isUploading}>{isUploading ? 'Đợi ảnh...' : 'Xác nhận'}</button>
                        </div>
                    </div>
                </div>
            )}

            {deleteProductId && (
                <div className="global-modal-overlay" onClick={() => setDeleteProductId(null)}>
                    <div className="global-confirm-modal" onClick={e => e.stopPropagation()}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: '10px 0 5px 0', color: '#1f2937', fontSize: '13pt' }}>Xác nhận xóa sản phẩm?</h3>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button className="confirm-btn-no" onClick={() => setDeleteProductId(null)}>Hủy</button>
                            <button className="confirm-btn-yes" onClick={confirmDelete}>Xác nhận</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
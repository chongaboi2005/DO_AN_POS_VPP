import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Layout from '../component/Layout';
import { CartContext } from '../context/CartContext';
import './Detail.css';
import 'react-quill-new/dist/quill.snow.css';

export default function Detail() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { addToCart } = useContext(CartContext);
    const [item, setItem] = useState(null);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const currentType = location.pathname.split('/')[1];

    useEffect(() => {
        window.scrollTo(0, 0);

        let apiEndpoint = 'products';
        if (currentType === 'blog') apiEndpoint = 'blogs';
        if (currentType === 'voucher') apiEndpoint = 'vouchers';

        const API_BASE = `http://${window.location.hostname}:5000`;

        Promise.all([
            fetch(`${API_BASE}/${apiEndpoint}`).then(res => res.json()),
            fetch(`${API_BASE}/categories`).then(res => res.json()).catch(() => [])
        ])
            .then(([itemData, catData]) => {
                const foundItem = itemData.find(p => p.id.toString() === id);
                setItem(foundItem);
                if (Array.isArray(catData)) setCategories(catData);
                setLoading(false);
            })
            .catch(err => {
                console.error("Lỗi lấy dữ liệu:", err);
                setLoading(false);
            });
    }, [id, currentType]);

    if (!item) return (
        <Layout>
            <main className="main-layout" style={{ minHeight: '60vh' }}>
                <div className="empty-cart-message">
                    <p>Không tìm thấy thông tin chi tiết!</p>
                    <button className="view-more-btn" onClick={() => navigate(-1)} style={{ marginTop: '20px' }}>Quay lại</button>
                </div>
            </main>
        </Layout>
    );

    return (
        <Layout>
            <main className="main-layout" style={{ minHeight: '60vh', paddingTop: '40px' }}>

                {currentType === 'product' && (
                    <div className="product-detail-container animate-card">
                        <div className="product-detail-image-box">
                            <img src={item.image_url} alt={item.name} />
                        </div>
                        <div className="product-detail-info">
                            <h1 className="product-detail-title">{item.name}</h1>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', color: '#4b5563' }}>
                                <p style={{ margin: 0 }}>Mã vạch sản phẩm: {item.barcode}</p>
                                <p style={{ margin: 0, fontWeight: 'bold' }}>Đã bán: {item.sold || 0}</p>
                            </div>
                            <div className="product-detail-price" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{Number(item.price).toLocaleString('vi-VN')}đ</span>
                                <span style={{ fontSize: '14pt', color: '#4b5563' }}>
                                    Kho: {item.stock}
                                </span>
                            </div>

                            <div className="product-detail-desc">
                                <h3>Mô tả sản phẩm:</h3>
                                {item.description ? (
                                    <div className="rich-text-description" dangerouslySetInnerHTML={{ __html: item.description.replace(/&nbsp;/g, ' ') }} />
                                ) : (
                                    <p>Sản phẩm đang được cập nhật mô tả chi tiết.</p>
                                )}
                            </div>

                            <button
                                className="product-detail-add-btn"
                                onClick={() => addToCart(item)}
                                disabled={item.stock <= 0}
                                style={{
                                    backgroundColor: item.stock <= 0 ? '#d1d5db' : '',
                                    cursor: item.stock <= 0 ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {item.stock > 0 ? 'Thêm vào giỏ hàng' : 'Hết hàng'}
                            </button>
                        </div>
                    </div>
                )}

                {currentType === 'blog' && (
                    <div className="blog-article-wrapper animate-card">
                        <img src={item.image_url} alt={item.title} className="blog-article-cover" />
                        <h1 className="blog-article-title">{item.title}</h1>
                        <div 
                            className="blog-article-content rich-text-description" 
                            dangerouslySetInnerHTML={{ __html: item.description ? item.description.replace(/&nbsp;/g, ' ') : '' }} 
                        />
                    </div>
                )}

                {currentType === 'voucher' && (
                    <div className="voucher-detail-container animate-card">
                        <div className="voucher-detail-image-box">
                            <div className="voucher-detail-icon">🎟️</div>
                        </div>

                        <div className="voucher-detail-info">
                            <h2 className="voucher-detail-title">THÔNG TIN KHUYẾN MÃI</h2>
                            <div className="voucher-detail-code">
                                {item.code}
                            </div>

                            <div className="voucher-detail-desc" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ fontSize: '13pt' }}>
                                    <strong>Mức giảm: </strong>
                                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>
                                        {item.discount_type === 'ship' ? `Giảm ${Number(item.discount_value).toLocaleString('vi-VN')}đ phí vận chuyển` :
                                            item.discount_type === 'fixed' ? `Giảm trực tiếp ${Number(item.discount_value).toLocaleString('vi-VN')}đ` :
                                                `Giảm ${Number(item.discount_value).toLocaleString('vi-VN')}%`}
                                    </span>
                                </div>
                                <div style={{ fontSize: '12pt', color: '#374151' }}>
                                    <strong>Áp dụng cho: </strong>
                                    {item.type === 'pos' ? 'Thanh toán trực tiếp tại quầy' : 'Đơn đặt hàng Website (Online)'}
                                </div>
                                <div style={{ fontSize: '12pt', color: '#374151' }}>
                                    <strong>Đơn hàng tối thiểu: </strong>
                                    <span style={{ color: '#1d4ed8', fontWeight: 'bold' }}>{item.min_order > 0 ? `${Number(item.min_order).toLocaleString('vi-VN')}đ` : 'Không yêu cầu'}</span>
                                </div>
                                {item.type === 'pos' && item.discount_type === 'percent' && item.max_discount > 0 && (
                                    <div style={{ fontSize: '12pt', color: '#374151' }}>
                                        <strong>Giảm tối đa: </strong>
                                        {Number(item.max_discount).toLocaleString('vi-VN')}đ
                                    </div>
                                )}
                                {item.type === 'pos' && (
                                    <div style={{ fontSize: '12pt', color: '#374151' }}>
                                        <strong>Danh mục áp dụng: </strong>
                                        {item.category_id
                                            ? (categories.find(c => c.id.toString() === item.category_id.toString())?.name || 'Tất cả danh mục')
                                            : 'Tất cả danh mục'}
                                    </div>
                                )}

                                <div style={{ fontSize: '12pt', color: '#374151', marginTop: '10px', paddingTop: '15px', borderTop: '1px dashed #d1d5db' }}>
                                    <strong>Mô tả chi tiết: </strong>
                                    <div className="rich-text-description" style={{ marginTop: '10px', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: item.description ? item.description.replace(/&nbsp;/g, ' ') : 'Không có mô tả thêm.' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="view" style={{ marginTop: '50px' }}>
                    <button className="view-more-btn" onClick={() => navigate(-1)}>← Quay lại</button>
                </div>
            </main>
        </Layout>
    );
}
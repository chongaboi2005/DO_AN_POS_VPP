import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import Layout from '../component/Layout';
import '../App.css';
import { CartContext } from '../context/CartContext';

const pageVisitedItems = {};

const useScrollReveal = (uniqueId) => {
    const location = useLocation();
    const currentKey = location.key || 'default';

    if (!pageVisitedItems[currentKey]) {
        pageVisitedItems[currentKey] = new Set();
    }
    const seenSet = pageVisitedItems[currentKey];

    const [hasAnimated] = useState(() => seenSet.has(uniqueId));

    const [isVisible, setIsVisible] = useState(hasAnimated);
    const ref = useRef();

    useEffect(() => {
        if (hasAnimated) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    seenSet.add(uniqueId);
                    observer.disconnect();
                }
            },
            { threshold: 0.05 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [hasAnimated, uniqueId, seenSet]);

    return [ref, isVisible, hasAnimated];
};

const ProductCardItem = ({ sp, index, addToCart }) => {
    const [ref, isVisible, hasAnimated] = useScrollReveal(`prod_${sp.id}`);
    const navigate = useNavigate();

    return (
        <div
            ref={ref}
            className={`product-card ${isVisible ? 'animate-card' : 'hidden-card'}`}
            style={hasAnimated ? { animation: 'none', opacity: 1 } : { animationDelay: '0.3s' }}
        >
            <div className="product-img-box" onClick={() => navigate(`/product/${sp.id}`)} style={{ cursor: 'pointer' }}>
                <img src={sp.image_url} alt={sp.name} className="product-real-image" />
            </div>
            <div className="product-info">
                <h4 className="product-name" onClick={() => navigate(`/product/${sp.id}`)} style={{ cursor: 'pointer' }}>
                    {sp.name}
                </h4>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div className="product-price" style={{ margin: 0 }}>
                        {Number(sp.price).toLocaleString('vi-VN')}đ
                    </div>
                    <div style={{ fontSize: '11pt', fontWeight: 'bold', color: '#4b5563' }}>
                        {Number(sp.stock).toLocaleString('vi-VN')}
                    </div>
                </div>

                <button
                    className="add-to-cart-btn"
                    onClick={() => addToCart(sp)}
                    disabled={sp.stock <= 0}
                    style={{
                        backgroundColor: sp.stock <= 0 ? '#d1d5db' : '',
                        color: sp.stock <= 0 ? '#ffffff' : '',
                        cursor: sp.stock <= 0 ? 'not-allowed' : 'pointer'
                    }}
                >
                    {sp.stock > 0 ? 'Thêm vào giỏ hàng' : 'Hết hàng'}
                </button>

                <button
                    className="view-detail-btn"
                    onClick={() => navigate(`/product/${sp.id}`)}
                >
                    Xem chi tiết
                </button>
            </div>
        </div>
    );
};

export default function Products() {
    const { categoryId } = useParams();
    const [searchParams] = useSearchParams();
    const searchQuery = searchParams.get('search');
    const navigate = useNavigate();
    const location = useLocation();
    const { addToCart } = useContext(CartContext);

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        const API_BASE = `http://${window.location.hostname}:5000`;
        Promise.all([
            fetch(`${API_BASE}/products`).then(res => res.json()),
            fetch(`${API_BASE}/categories`).then(res => res.json())
        ]).then(([prodData, catData]) => {
            setProducts(prodData);
            setCategories(catData);
            setIsLoading(false);
        }).catch(err => {
            console.error(err);
            setIsLoading(false);
        });
    }, [categoryId, searchQuery]);

    useEffect(() => {
        let timeoutId;
        const handleScroll = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                const key = `scrollPos_${location.key}`;
                sessionStorage.setItem(key, window.scrollY);
            }, 100);
        };
        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearTimeout(timeoutId);
        };
    }, [location.key]);

    useEffect(() => {
        if (!isLoading) {
            const key = `scrollPos_${location.key}`;
            const savedPosition = sessionStorage.getItem(key);
            setTimeout(() => {
                if (savedPosition) {
                    window.scrollTo(0, parseInt(savedPosition, 10));
                } else {
                    window.scrollTo(0, 0);
                }
            }, 0);
        }
    }, [isLoading, location.key]);

    let displayedProducts = products;
    let pageTitle = "Tất cả sản phẩm";

    if (searchQuery) {
        displayedProducts = products.filter(sp =>
            sp.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        pageTitle = `Kết quả tìm kiếm cho: "${searchQuery}"`;
    }
    else if (categoryId) {
        displayedProducts = products.filter(sp => sp.category_id === categoryId);
        const categoryInfo = categories.find(dm => dm.id === categoryId);
        if (categoryInfo) pageTitle = categoryInfo.name;
    }

    return (
        <Layout>
            <main className="main-layout" style={{ minHeight: '60vh', paddingTop: '40px' }}>
                <div className="category-header"><h2 className="area-title">{pageTitle}</h2></div>
                {displayedProducts.length > 0 ? (
                    <div className="product-grid">
                        {displayedProducts.map((sp, index) => (
                            <ProductCardItem key={sp.id} sp={sp} index={index} addToCart={addToCart} />
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', marginTop: '50px', fontSize: '14pt', color: '#6b7280' }}>
                        Không tìm thấy sản phẩm nào phù hợp!
                    </div>
                )}
                <div className="view" style={{ marginTop: '40px' }}>
                    <button className="view-more-btn" onClick={() => navigate(-1)}>← Quay Lại</button>
                </div>
            </main>
        </Layout>
    );
}
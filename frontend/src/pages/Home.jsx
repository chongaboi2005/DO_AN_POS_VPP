import React, { useState, useEffect, useRef, useContext } from 'react';
import './Home.css';
import Layout from '../component/Layout';
import { useNavigate, useLocation } from 'react-router-dom';
import { CartContext } from '../context/CartContext';

const BANNERS = ['/banner.jpg', '/banner2.jpg', '/banner3.jpg', '/banner4.jpg'];
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

const ProductCard = ({ product, index }) => {
    const [ref, isVisible, hasAnimated] = useScrollReveal(`home_prod_${product.id}`);
    const { addToCart } = useContext(CartContext);
    const navigate = useNavigate();

    return (
        <div
            ref={ref}
            className={`product-card ${isVisible ? 'animate-card' : 'hidden-card'}`}
            style={hasAnimated ? { animation: 'none', opacity: 1 } : { animationDelay: '0.3s' }}
        >
            <div className="product-img-box" onClick={() => navigate(`/product/${product.id}`)} style={{ cursor: 'pointer' }}>
                <img src={product.image_url} alt={product.name} className="product-real-image" />
            </div>
            <div className="product-info">
                <h4 className="product-name" onClick={() => navigate(`/product/${product.id}`)} style={{ cursor: 'pointer' }}>
                    {product.name}
                </h4>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div className="product-price" style={{ margin: 0 }}>
                        {Number(product.price || 0).toLocaleString('vi-VN')}đ
                    </div>
                    <div style={{ fontSize: '11pt', fontWeight: 'bold', color: '#4b5563' }}>
                        {product.stock}
                    </div>
                </div>

                <button
                    className="add-to-cart-btn"
                    onClick={() => addToCart(product)}
                    disabled={product.stock <= 0}
                    style={{
                        backgroundColor: product.stock <= 0 ? '#d1d5db' : '',
                        color: product.stock <= 0 ? '#ffffff' : '',
                        cursor: product.stock <= 0 ? 'not-allowed' : 'pointer'
                    }}
                >
                    {product.stock > 0 ? 'Thêm vào giỏ hàng' : 'Hết hàng'}
                </button>
                <button
                    className="view-detail-btn"
                    onClick={() => navigate(`/product/${product.id}`)}
                >
                    Xem chi tiết
                </button>
            </div>
        </div>
    );
};

const BlogCard = ({ blog, index }) => {
    const navigate = useNavigate();
    const [ref, isVisible, hasAnimated] = useScrollReveal(`home_blog_${blog.id}`);
    return (
        <div
            ref={ref}
            className={`blog-card ${isVisible ? 'animate-card' : 'hidden-card'}`}
            style={{ ...(hasAnimated ? { animation: 'none', opacity: 1 } : { animationDelay: '0.3s' }), cursor: 'pointer' }}
            onClick={() => navigate(`/blog/${blog.id}`)}
        >
            <div className="blog-img-box">
                <img src={blog.image_url} alt={blog.title} className="blog-real-image" />
            </div>
            <div className="blog-info">
                <h4>{blog.title}</h4>
                <p>{blog.description}</p>
            </div>
        </div>
    );
};

export default function Home() {
    const navigate = useNavigate();
    const location = useLocation();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [blogs, setBlogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        document.body.style.overflow = '';

        setIsLoading(true);
        const API_BASE = `http://${window.location.hostname}:5000`;
        Promise.all([
            fetch(`${API_BASE}/products`).then(res => res.ok ? res.json() : []),
            fetch(`${API_BASE}/categories`).then(res => res.ok ? res.json() : []),
            fetch(`${API_BASE}/blogs`).then(res => res.ok ? res.json() : [])
        ]).then(([prodData, catData, blogData]) => {
            setProducts(Array.isArray(prodData) ? prodData : []);
            setCategories(Array.isArray(catData) ? catData : []);
            setBlogs(Array.isArray(blogData) ? blogData : []);
            setIsLoading(false);
        }).catch(err => {
            console.log("Lỗi tải trang chủ", err);
            setProducts([]);
            setCategories([]);
            setBlogs([]);
            setIsLoading(false);
        });
    }, []);

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

    const [currentIndex, setCurrentIndex] = useState(1);
    const [isTransitioning, setIsTransitioning] = useState(true);
    const extendedBanners = [BANNERS[BANNERS.length - 1], ...BANNERS, BANNERS[0]];
    const nextBanner = () => { if (currentIndex >= extendedBanners.length - 1) return; setIsTransitioning(true); setCurrentIndex(prev => prev + 1); };
    const prevBanner = () => { if (currentIndex <= 0) return; setIsTransitioning(true); setCurrentIndex(prev => prev - 1); };
    const handleTransitionEnd = () => {
        if (currentIndex === 0) { setIsTransitioning(false); setCurrentIndex(BANNERS.length); }
        else if (currentIndex === extendedBanners.length - 1) { setIsTransitioning(false); setCurrentIndex(1); }
    };
    const realIndex = currentIndex === 0 ? BANNERS.length - 1 : currentIndex === extendedBanners.length - 1 ? 0 : currentIndex - 1;
    const [featuredNames, setFeaturedNames] = useState([]);

    useEffect(() => {
        const API_BASE = `http://${window.location.hostname}:5000`;
        fetch(`${API_BASE}/api/featured-products`)
            .then(res => res.ok ? res.json() : [])
            .then(data => setFeaturedNames(Array.isArray(data) ? data : []))
            .catch(err => console.log("Lỗi tải sản phẩm nổi bật", err));
    }, [products]);
    const featuredList = featuredNames
        .map(fName => products.find(p => String(p.name).trim() === String(fName).trim()))
        .filter(p => p !== undefined);

    return (
        <Layout>
            <section className="image-banner-section">
                <div className="banner-slider-container">
                    <button className="slider-arrow arrow-left" onClick={prevBanner}>❮</button>
                    <div className="banner-images-wrapper" style={{ transform: `translateX(-${currentIndex * 100}%)`, transition: isTransitioning ? 'transform 0.5s ease-in-out' : 'none' }} onTransitionEnd={handleTransitionEnd}>
                        {extendedBanners.map((imgUrl, index) => <img key={index} src={imgUrl} className="aesthetic-banner" alt={`Banner ${index}`} />)}
                    </div>
                    <button className="slider-arrow arrow-right" onClick={nextBanner}>❯</button>
                    <div className="slider-dots">
                        {BANNERS.map((_, index) => <span key={index} className={`dot ${realIndex === index ? 'active' : ''}`} onClick={() => { setIsTransitioning(true); setCurrentIndex(index + 1); }}></span>)}
                    </div>
                </div>
            </section>

            <section className="features-section">
                <div className="feature-box"><div className="feature-icon">🚚</div><div className="feature-title">Giao Hàng Tiện Lợi</div><div className="feature-desc">Giao hàng nhanh trong ngày tại khu vực TP.HCM. Đóng gói cẩn thận.</div></div>
                <div className="feature-box"><div className="feature-icon">💳</div><div className="feature-title">Thanh Toán Linh Hoạt</div><div className="feature-desc">Phương thức thanh toán: Tiền mặt và Chuyển khoản / Quét mã QR ngân hàng.</div></div>
                <div className="feature-box"><div className="feature-icon">🎨</div><div className="feature-title">Sản phẩm đa dạng</div><div className="feature-desc">Cung cấp các dụng cụ văn phòng phẩm chính hãng, mẫu mã đa dạng.</div></div>
            </section>

            {!isLoading && (
                <>
                    {featuredNames.length > 0 && (
                        <main className="main-layout scroll-section" style={{ paddingTop: '0' }}>
                            <div className="category-header" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                                <h2 className="area-title" style={{ textAlign: 'center', margin: '0 auto' }}>Sản Phẩm Nổi Bật</h2>
                            </div>

                            {featuredList.length > 0 ? (
                                <div className="product-grid">
                                    {featuredList.slice(0, 5).map((sp, index) => <ProductCard key={sp.id} product={sp} index={index} />)}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '30px', background: '#fff', borderRadius: '12px', border: '1px dashed #d1d5db', margin: '0 24px' }}>
                                    <p style={{ color: '#ea580c', fontSize: '12pt', fontWeight: 'bold' }}>Đang cập nhật dữ liệu sản phẩm nổi bật...</p>
                                </div>
                            )}
                        </main>
                    )}

                    {categories.map((dm) => {
                        const categoryProducts = products.filter(sp => sp.category_id === dm.id).slice(0, 5);
                        if (categoryProducts.length === 0) return null;
                        return (
                            <main id={dm.id} key={dm.id} className="main-layout scroll-section" style={{ paddingTop: '10px' }}>
                                <div className="category-header"><h2 className="area-title">{dm.name}</h2></div>
                                <div className="product-grid">
                                    {categoryProducts.map((sp, index) => <ProductCard key={sp.id} product={sp} index={index} />)}
                                </div>
                                <div className="view">
                                    <button className="view-more-btn" onClick={() => navigate(`/products/${dm.id}`)}>Xem Tất Cả ➤</button>
                                </div>
                            </main>
                        )
                    })}

                    <section id="blog" className="preview-section" style={{ marginBottom: '50px' }}>
                        <h2 className="area-title">Blog's</h2>
                        <div className="home-blog-grid">
                            {blogs.slice(0, 2).map((blog, index) => <BlogCard key={blog.id} blog={blog} index={index} />)}
                        </div>
                        <div className="view">
                            <button className="view-more-btn" onClick={() => navigate('/blogs')}>Xem Thêm ➤</button>
                        </div>
                    </section>
                </>
            )}
        </Layout>
    );
}
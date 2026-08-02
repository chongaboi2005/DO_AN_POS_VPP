import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '../component/Layout';
import { CartContext } from '../context/CartContext';
import '../App.css';

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

const VoucherCardItem = ({ v, index, copyToClipboard }) => {
    const navigate = useNavigate();
    const [ref, isVisible, hasAnimated] = useScrollReveal(`voucher_${v.id}`);
    return (
        <div
            ref={ref}
            className={`voucher-card ${isVisible ? 'animate-card' : 'hidden-card'}`}
            style={hasAnimated ? { animation: 'none', opacity: 1 } : { animationDelay: '0.3s' }}
            onClick={() => navigate(`/voucher/${v.id}`)}
        >
            <div className="voucher-icon">🎟️</div>
            <div className="voucher-info">
                <h3 className="voucher-code" style={{ fontSize: '18pt', marginBottom: '5px', color: '#1e3a8a' }}>{v.code}</h3>
                <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '13pt', marginBottom: '8px' }}>
                    {v.discount_type === 'ship' ? `GIẢM ${Number(v.discount_value).toLocaleString('vi-VN')}đ PHÍ SHIP` :
                        v.discount_type === 'fixed' ? `GIẢM ${Number(v.discount_value).toLocaleString('vi-VN')}đ` :
                            `GIẢM ${Number(v.discount_value).toLocaleString('vi-VN')}%`}
                </div>
                <p className="voucher-desc" style={{ fontStyle: 'italic', color: '#6b7280', fontSize: '10pt' }}>
                    {v.type === 'pos' ? 'Mã này chỉ áp dụng tại quầy thanh toán' : 'Mã này chỉ áp dụng cho đơn đặt hàng online'}
                </p>
            </div>
        </div>
    );
};

export default function Vouchers() {
    const navigate = useNavigate();
    const location = useLocation();
    const [vouchers, setVouchers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showToast } = useContext(CartContext);

    useEffect(() => {
        setIsLoading(true);
        fetch(`http://${window.location.hostname}:5000/vouchers`)
            .then(res => res.json())
            .then(data => {
                setVouchers(data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error(err);
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

    const copyToClipboard = (code) => {
        navigator.clipboard.writeText(code);
        showToast(`Đã lưu mã: ${code}`, 'success');
    };

    return (
        <Layout>
            <main className="main-layout" style={{ minHeight: '60vh', paddingTop: '40px' }}>
                <div className="category-header"><h2 className="area-title">Mã Giảm Giá & Khuyến Mãi</h2></div>
                <div className="voucher-grid">
                    {[...vouchers]
                        .sort((a, b) => {
                            if (a.type === 'online' && b.type !== 'online') return -1;
                            if (a.type !== 'online' && b.type === 'online') return 1;
                            return 0;
                        })
                        .map((v, index) => (
                            <VoucherCardItem key={v.id} v={v} index={index} copyToClipboard={copyToClipboard} />
                        ))}
                </div>
                <div className="view" style={{ marginTop: '40px' }}>
                    <button className="view-more-btn" onClick={() => navigate(-1)}>← Quay Lại</button>
                </div>
            </main>
        </Layout>
    );
}
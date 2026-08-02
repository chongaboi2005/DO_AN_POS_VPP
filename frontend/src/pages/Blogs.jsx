import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '../component/Layout';
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

const BlogCardItem = ({ blog, index }) => {
    const navigate = useNavigate();
    const [ref, isVisible, hasAnimated] = useScrollReveal(`blog_${blog.id}`);
    return (
        <div
            ref={ref}
            className={`blog-card ${isVisible ? 'animate-card' : 'hidden-card'}`}
            style={hasAnimated ? { animation: 'none', opacity: 1 } : { animationDelay: '0.3s' }}
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

export default function Blogs() {
    const navigate = useNavigate();
    const location = useLocation();
    const [blogs, setBlogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        fetch(`http://${window.location.hostname}:5000/blogs`)
            .then(res => res.json())
            .then(data => {
                setBlogs(data);
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

    return (
        <Layout>
            <main className="main-layout" style={{ minHeight: '60vh', paddingTop: '40px' }}>
                <div className="category-header"><h2 className="area-title">Tất cả bài viết Blog</h2></div>
                <div className="blog-grid">
                    {blogs.map((blog, index) => (
                        <BlogCardItem key={blog.id} blog={blog} index={index} />
                    ))}
                </div>
                <div className="view" style={{ marginTop: '40px' }}>
                    <button className="view-more-btn" onClick={() => navigate(-1)}>← Quay Lại</button>
                </div>
            </main>
        </Layout>
    );
}
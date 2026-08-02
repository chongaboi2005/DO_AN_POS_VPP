import React, { createContext, useState, useEffect } from 'react';
export const CartContext = createContext();
export const CartProvider = ({ children }) => {
    const getCartKey = () => {
        const user = sessionStorage.getItem('username');
        const role = sessionStorage.getItem('role');
        if (user && role === 'customer') {
            return `cart_${user}`;
        }
        return 'cart_guest';
    };

    const [cart, setCart] = useState(() => {
        const key = getCartKey();
        let savedCart = null;
        if (key === 'cart_guest') {
            savedCart = sessionStorage.getItem(key);
        } else {
            savedCart = localStorage.getItem(key);
        }

        return savedCart ? JSON.parse(savedCart) : [];
    });

    const [toast, setToast] = useState({ message: '', type: '', visible: false });

    useEffect(() => {
        const key = getCartKey();
        if (key === 'cart_guest') {
            sessionStorage.setItem(key, JSON.stringify(cart));
        } else {
            localStorage.setItem(key, JSON.stringify(cart));
        }
    }, [cart]);

    useEffect(() => {
        const handleAuthChange = () => {
            const newKey = getCartKey();
            if (newKey !== 'cart_guest') {
                const guestCartStr = sessionStorage.getItem('cart_guest');
                if (guestCartStr && JSON.parse(guestCartStr).length > 0) {
                    localStorage.setItem(newKey, guestCartStr);
                    sessionStorage.removeItem('cart_guest');
                }
            }

            let savedCart = null;
            if (newKey === 'cart_guest') {
                savedCart = sessionStorage.getItem(newKey);
            } else {
                savedCart = localStorage.getItem(newKey);
            }

            setCart(savedCart ? JSON.parse(savedCart) : []);
        };

        window.addEventListener('auth_changed', handleAuthChange);
        return () => window.removeEventListener('auth_changed', handleAuthChange);
    }, []);

    const showToast = (message, type = 'success') => {
        setToast({ message, type, visible: true });
        setTimeout(() => {
            setToast(prev => ({ ...prev, visible: false }));
        }, 3000);
    };

    const addToCart = (product) => {
        if (product.stock <= 0) {
            showToast("Sản phẩm đã hết hàng!", "error");
            return;
        }

        setCart((prevCart) => {
            const existingItem = prevCart.find(item => item.id === product.id);
            if (existingItem) {
                if (existingItem.quantity >= product.stock) {
                    showToast(`Chỉ còn ${product.stock} sản phẩm!`, "error");
                    return prevCart;
                }
                showToast('Đã thêm sản phẩm vào giỏ hàng', 'success');
                return prevCart.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            showToast('Đã thêm sản phẩm vào giỏ hàng', 'success');
            return [...prevCart, { ...product, quantity: 1 }];
        });
    };

    const updateQuantity = (id, delta) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.id === id);
            if (!existingItem) return prevCart;

            const newQuantity = existingItem.quantity + delta;

            if (delta > 0 && newQuantity > existingItem.stock) {
                showToast(`Chỉ còn ${existingItem.stock} sản phẩm!`, "error");
                return prevCart;
            }

            if (newQuantity <= 0) return prevCart;

            return prevCart.map(item =>
                item.id === id ? { ...item, quantity: newQuantity } : item
            );
        });
    };

    const removeFromCart = (id) => {
        setCart(prevCart => prevCart.filter(item => item.id !== id));
    };

    const clearCart = () => setCart([]);

    const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);

    return (
        <CartContext.Provider value={{ cart, addToCart, updateQuantity, removeFromCart, clearCart, cartCount, cartTotal, showToast }}>
            {children}
            {toast.visible && (
                <div className={`global-toast toast-${toast.type}`}>
                    {toast.message}
                </div>
            )}
        </CartContext.Provider>
    );
};
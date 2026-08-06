import React, { useState, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { io } from 'socket.io-client';
import './POS.css';

export default function POS() {
    const [products, setProducts] = useState([]);
    const [vouchers, setVouchers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [posCart, setPosCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [appliedVouchers, setAppliedVouchers] = useState([]);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [showQRModal, setShowQRModal] = useState(false);
    const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
    const [isAppliedVouchersModalOpen, setIsAppliedVouchersModalOpen] = useState(false);
    const [amountTendered, setAmountTendered] = useState('');
    const [toast, setToast] = useState(null);

    const currentUser = sessionStorage.getItem('username') || sessionStorage.getItem('displayName') || 'unknown';

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        const API_BASE = `http://${window.location.hostname}:5000`;
        const socket = io(API_BASE);

        socket.on('sync_cart', (payload) => {
            if (payload && payload.username === currentUser) {
                if (payload.cart) {
                    setPosCart(payload.cart);
                }
                if (payload.message) {
                    showToast(payload.message, payload.type);
                }
            }
        });

        window.posSocket = {
            emit: (event, payload) => {
                if (event === 'update_cart') {
                    payload.username = currentUser;
                }
                socket.emit(event, payload);
            }
        };

        Promise.all([
            fetch(`${API_BASE}/products`).then(res => res.json()),
            fetch(`${API_BASE}/vouchers`).then(res => res.json()),
            fetch(`${API_BASE}/categories`).then(res => res.json())
        ]).then(([prodData, voucherData, catData]) => {
            setProducts(prodData);
            setVouchers(voucherData);
            setCategories(catData);
        }).catch(err => console.error(err));

        return () => {
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        if (isVoucherModalOpen || showQRModal || isAppliedVouchersModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isVoucherModalOpen, showQRModal, isAppliedVouchersModalOpen]);

    useEffect(() => {
        let html5QrCode;
        let isMounted = true;

        if (isScanning) {
            html5QrCode = new Html5Qrcode("reader");

            const onScanSuccess = (decodedText) => {
                if (html5QrCode.isScanning) {
                    html5QrCode.stop().then(() => {
                        if (isMounted) setIsScanning(false);
                        const foundProduct = products.find(p => p.barcode === decodedText);

                        if (foundProduct) {
                            if (foundProduct.stock <= 0) {
                                showToast(`Sản phẩm "${foundProduct.name}" đã hết hàng!`, 'error');
                                return;
                            }

                            setPosCart(prev => {
                                const exists = prev.find(item => item.id === foundProduct.id);
                                const currentQty = exists ? exists.qty : 0;

                                if (currentQty >= foundProduct.stock) {
                                    const msg = `Chỉ còn ${foundProduct.stock} sản phẩm!`;
                                    showToast(msg, 'error');
                                    if (window.posSocket) window.posSocket.emit('update_cart', { cart: prev, message: msg, type: 'error' });
                                    return prev;
                                }

                                const newCart = exists
                                    ? prev.map(item => item.id === foundProduct.id ? { ...item, qty: item.qty + 1 } : item)
                                    : [...prev, { ...foundProduct, qty: 1 }];

                                const msg = `Đã thêm: ${foundProduct.name}`;
                                showToast(msg, 'success');
                                if (window.posSocket) window.posSocket.emit('update_cart', { cart: newCart, message: msg, type: 'success' });
                                return newCart;
                            });
                        } else {
                            const msg = `Không tìm thấy mã: ${decodedText}`;
                            showToast(msg, 'error');

                            setPosCart(prev => {
                                if (window.posSocket) window.posSocket.emit('update_cart', { cart: prev, message: msg, type: 'error' });
                                return prev;
                            });
                        }
                    }).catch(err => console.error(err));
                }
            };

            const config = {
                fps: 10,
                qrbox: (viewfinderWidth, viewfinderHeight) => {
                    let minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
                    return { width: Math.floor(minEdgeSize * 0.8), height: Math.floor(minEdgeSize * 0.5) };
                }
            };

            Html5Qrcode.getCameras().then(devices => {
                if (!isMounted) return;
                let cameraConfig = { facingMode: "environment" };
                if (devices && devices.length > 0) {
                    const backCameras = devices.filter(c =>
                        c.label.toLowerCase().includes('back') ||
                        c.label.toLowerCase().includes('sau')
                    );

                    if (backCameras.length > 0) {
                        const normalBackCameras = backCameras.filter(c =>
                            !c.label.toLowerCase().includes('ultra') &&
                            !c.label.toLowerCase().includes('rộng')
                        );
                        const cameraZero = normalBackCameras.find(c => c.label.includes(' 0'));
                        if (cameraZero) {
                            cameraConfig = cameraZero.id;
                        } else if (normalBackCameras.length > 0) {
                            const iphoneMain = normalBackCameras.find(c => c.label === 'Back Camera');
                            cameraConfig = iphoneMain ? iphoneMain.id : normalBackCameras[0].id;
                        } else {
                            cameraConfig = backCameras[0].id;
                        }
                    }
                }

                html5QrCode.start(
                    cameraConfig,
                    config,
                    onScanSuccess,
                    (errorMessage) => { }
                ).catch((err) => {
                    showToast("Không thể bật Camera!", "error");
                    if (isMounted) setIsScanning(false);
                });
            }).catch(err => {
                if (!isMounted) return;
                html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    onScanSuccess,
                    (errorMessage) => { }
                ).catch((err) => {
                    showToast("Không thể bật Camera!", "error");
                    if (isMounted) setIsScanning(false);
                });
            });
        }

        return () => {
            isMounted = false;
            if (html5QrCode && html5QrCode.isScanning) html5QrCode.stop().catch(e => console.error(e));
        };
    }, [isScanning, products]);

    const checkVoucherEligibility = (v, cartToCheck) => {
        if (!v) return false;
        if (v.category_id) {
            const catTotal = cartToCheck.filter(i => i.category_id === v.category_id)
                .reduce((sum, i) => sum + (i.price * (parseInt(i.qty) || 0)), 0);
            return catTotal > 0 && catTotal >= v.min_order;
        }
        else {
            const total = cartToCheck.reduce((sum, i) => sum + (i.price * (parseInt(i.qty) || 0)), 0);
            return total > 0 && total >= v.min_order;
        }
    };

    const addToPosCart = (product) => {
        if (product.stock <= 0) {
            showToast(`Sản phẩm "${product.name}" đã hết hàng!`, 'error');
            return;
        }

        setPosCart(prev => {
            const exists = prev.find(item => item.id === product.id);
            const currentQty = exists ? exists.qty : 0;

            if (currentQty >= product.stock) {
                showToast(`Chỉ còn ${product.stock} sản phẩm!`, 'error');
                return prev;
            }

            const newCart = exists
                ? prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item)
                : [...prev, { ...product, qty: 1 }];

            if (window.posSocket) window.posSocket.emit('update_cart', { cart: newCart });
            return newCart;
        });
    };

    const updateQty = (id, delta) => {
        setPosCart(prev => {
            const itemToUpdate = prev.find(item => item.id === id);
            if (!itemToUpdate) return prev;

            const newQty = (parseInt(itemToUpdate.qty) || 0) + delta;
            
            if (newQty > itemToUpdate.stock) {
                showToast(`Chỉ còn ${itemToUpdate.stock} sản phẩm!`, 'error');
                return prev;
            }

            const newCart = prev.map(item => {
                if (item.id === id) {
                    return newQty > 0 ? { ...item, qty: newQty } : item;
                }
                return item;
            });

            if (appliedVouchers.length > 0) {
                const validVouchers = appliedVouchers.filter(code => {
                    const v = vouchers.find(dbV => dbV.code === code);
                    return checkVoucherEligibility(v, newCart);
                });
                if (validVouchers.length !== appliedVouchers.length) {
                    setAppliedVouchers(validVouchers);
                    showToast("Mã giảm bị loại bỏ do không đủ điều kiện!", "error");
                }
            }

            if (window.posSocket) window.posSocket.emit('update_cart', { cart: newCart });
            return newCart;
        });
    };

    const setExactQty = (id, newQtyStr) => {
        setPosCart(prev => {
            const itemToUpdate = prev.find(item => item.id === id);
            if (!itemToUpdate) return prev;

            let newCart;
            if (newQtyStr === '') {
                newCart = prev.map(item => item.id === id ? { ...item, qty: '' } : item);
            } else {
                let newQty = parseInt(newQtyStr);
                if (isNaN(newQty) || newQty < 1) return prev;
                
                if (newQty > itemToUpdate.stock) {
                    showToast(`Chỉ còn ${itemToUpdate.stock} sản phẩm!`, 'error');
                    newQty = itemToUpdate.stock;
                }
                
                newCart = prev.map(item => item.id === id ? { ...item, qty: newQty } : item);
            }

            if (appliedVouchers.length > 0) {
                const validVouchers = appliedVouchers.filter(code => {
                    const v = vouchers.find(dbV => dbV.code === code);
                    return checkVoucherEligibility(v, newCart);
                });
                if (validVouchers.length !== appliedVouchers.length) {
                    setAppliedVouchers(validVouchers);
                    showToast("Mã giảm bị loại bỏ do không đủ điều kiện!", "error");
                }
            }

            if (window.posSocket) window.posSocket.emit('update_cart', { cart: newCart });
            return newCart;
        });
    };

    const handleQtyBlur = (id, currentQty) => {
        if (currentQty === '' || currentQty < 1) {
            setPosCart(prev => {
                const newCart = prev.map(item => item.id === id ? { ...item, qty: 1 } : item);
                if (window.posSocket) window.posSocket.emit('update_cart', { cart: newCart });
                return newCart;
            });
        }
    };

    const removeProduct = (id) => {
        setPosCart(prev => {
            const newCart = prev.filter(item => item.id !== id);

            if (appliedVouchers.length > 0) {
                const validVouchers = appliedVouchers.filter(code => {
                    const v = vouchers.find(dbV => dbV.code === code);
                    return checkVoucherEligibility(v, newCart);
                });
                if (validVouchers.length !== appliedVouchers.length) {
                    setAppliedVouchers(validVouchers);
                    showToast("Mã giảm bị loại bỏ do không đủ điều kiện!", "error");
                }
            }

            if (window.posSocket) window.posSocket.emit('update_cart', { cart: newCart });
            return newCart;
        });
    };

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            const term = searchTerm.trim().toLowerCase();
            if (!term) return;
            const exactMatch = products.find(p => p.barcode === term);
            if (exactMatch) {
                addToPosCart(exactMatch);
                setSearchTerm('');
                return;
            }
            const filtered = products.filter(p => {
                const catName = categories.find(c => c.id === p.category_id)?.name || '';
                return p.name.toLowerCase().includes(term) || catName.toLowerCase().includes(term);
            });
            if (filtered.length === 1) {
                addToPosCart(filtered[0]);
                setSearchTerm('');
            } else if (filtered.length > 1) {
                return;
            } else {
                showToast('Không tìm thấy sản phẩm!', 'error');
            }
        }
    };

    const cartTotal = posCart.reduce((sum, item) => sum + item.price * (parseInt(item.qty) || 0), 0);

    useEffect(() => {
        if (vouchers.length > 0) {
            const eligibleCodes = vouchers
                .filter(v => v.type === 'pos' && checkVoucherEligibility(v, posCart))
                .map(v => v.code);

            const currentCodesStr = JSON.stringify([...appliedVouchers].sort());
            const newCodesStr = JSON.stringify([...eligibleCodes].sort());

            if (currentCodesStr !== newCodesStr) {
                setAppliedVouchers(eligibleCodes);
                if (eligibleCodes.length > appliedVouchers.length && posCart.length > 0) {
                    showToast("Đã áp dụng mã giảm giá!", "success");
                }
            }
        }

        const currentSubTotal = posCart.reduce((sum, item) => sum + (item.price * (parseInt(item.qty) || 0)), 0);
        if (paymentMethod === 'cash' && currentSubTotal === 0) setAmountTendered('');
    }, [posCart, paymentMethod, vouchers]);

    const handleApplyVoucher = (code) => {
        if (posCart.length === 0) {
            showToast('Chưa có sản phẩm nào để áp dụng mã!', 'error');
            return;
        }

        const validVoucher = vouchers.find(v => v.code === code && v.type === 'pos');
        if (validVoucher) {
            if (!checkVoucherEligibility(validVoucher, posCart)) {
                showToast(`Đơn hàng không đủ tiền hoặc thiếu sản phẩm thuộc danh mục áp dụng!`, 'error');
                return;
            }

            if (appliedVouchers.includes(code)) {
                showToast('Mã này đã được áp dụng rồi!', 'error');
                return;
            }
            setAppliedVouchers([...appliedVouchers, code]);
            showToast(`Đã áp dụng mã ${code}!`, 'success');
        } else {
            showToast('Mã không hợp lệ hoặc chỉ áp dụng Online!', 'error');
        }
    };

    const subTotal = posCart.reduce((sum, item) => sum + (item.price * (parseInt(item.qty) || 0)), 0);
    const discountDetails = [];
    let discountAmount = 0;

    appliedVouchers.forEach(code => {
        const v = vouchers.find(v => v.code === code && v.type === 'pos');
        if (!v) return;

        let currentVoucherDiscount = 0;

        if (v.category_id) {
            const categoryTotal = posCart
                .filter(item => item.category_id === v.category_id)
                .reduce((sum, item) => sum + (item.price * (parseInt(item.qty) || 0)), 0);

            if (categoryTotal >= v.min_order) {
                if (v.discount_type === 'percent') {
                    let calcDiscount = (categoryTotal * v.discount_value) / 100;
                    if (v.max_discount) calcDiscount = Math.min(calcDiscount, v.max_discount);
                    currentVoucherDiscount = calcDiscount;
                } else if (v.discount_type === 'fixed') {
                    currentVoucherDiscount = Math.min(v.discount_value, categoryTotal);
                }
            }
        } else {
            if (subTotal >= v.min_order) {
                if (v.discount_type === 'fixed') {
                    currentVoucherDiscount = Math.min(v.discount_value, subTotal);
                } else if (v.discount_type === 'percent') {
                    let calcDiscount = (subTotal * v.discount_value) / 100;
                    if (v.max_discount) calcDiscount = Math.min(calcDiscount, v.max_discount);
                    currentVoucherDiscount = calcDiscount;
                }
            }
        }

        if (currentVoucherDiscount > 0) {
            discountDetails.push({ code, discount: currentVoucherDiscount });
            discountAmount += currentVoucherDiscount;
        }
    });

    const totalAmount = subTotal - discountAmount;
    const finalTotal = totalAmount > 0 ? totalAmount : 0;
    const tendered = amountTendered === '' ? 0 : parseInt(amountTendered);
    const changeAmount = tendered - finalTotal;

    const handlePrintInvoice = async (e) => {
        const keepFocus = e.ctrlKey || e.shiftKey || e.metaKey;

        if (posCart.length === 0) {
            showToast('Chưa có sản phẩm, không thể thanh toán!', 'error');
            return;
        }

        if (paymentMethod === 'cash' && tendered < finalTotal) {
            showToast('Khách đưa chưa đủ tiền!', 'error');
            return;
        }

        const printWindow = window.open('', '_blank');
        if (keepFocus && printWindow) {
            window.focus();
        }

        const cashierDisplayName = sessionStorage.getItem('displayName') || 'Nhân viên';
        const cashierUsername = sessionStorage.getItem('username') || '';

        const voucherDataString = discountDetails.map(item => `${item.code}|${item.discount}`).join(',');

        const orderData = {
            customer_name: customerName || 'Khách vãng lai',
            customer_phone: customerPhone || '',
            customer_address: 'Mua tại cửa hàng',
            customer_username: '',
            username: cashierUsername,
            cashier_name: cashierDisplayName,
            voucher_code: voucherDataString,
            amount_tendered: paymentMethod === 'cash' ? tendered : finalTotal,
            total_amount: cartTotal,
            discount_amount: discountAmount,
            shipping_fee: 0,
            final_total: finalTotal,
            payment_method: paymentMethod,
            order_type: 'offline',
            status: 'completed',
            items: posCart
        };

        try {
            const response = await fetch(`http://${window.location.hostname}:5000/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Lỗi thanh toán!");
            }
            
            const orderId = data.orderId;
            
            const date = new Date().toLocaleString('vi-VN');
            const cashierName = sessionStorage.getItem('displayName') || 'Nhân viên';

            let itemsHtml = '';
            posCart.forEach(item => {
                const q = parseInt(item.qty) || 1;
                itemsHtml += `
                    <tr>
                        <td style="padding: 10px 0; border-bottom: none; vertical-align: top; width: 60%; font-size: 10pt;">${item.name}</td>
                        <td style="padding: 10px 0; border-bottom: none; text-align: center; vertical-align: top; width: 15%; font-size: 10pt;">${q}</td>
                        <td style="padding: 10px 0; border-bottom: none; text-align: right; vertical-align: top; width: 25%; font-size: 10pt;">${Number(item.price * q).toLocaleString('vi-VN')}đ</td>
                    </tr>
                `;
            });

            const totalQuantity = posCart.reduce((sum, item) => sum + (parseInt(item.qty) || 1), 0);

            const customerHtml = (customerName || customerPhone) ? `
                <div class="divider"></div>
                <p style="text-align: left; margin: 2px 0;">Khách hàng: ${customerName || 'Khách vãng lai'}</p>
                <p style="text-align: left; margin: 2px 0;">SĐT: ${customerPhone || 'Không cung cấp'}</p>
            ` : '';

            let discountHtml = '';
            discountDetails.forEach(item => {
                discountHtml += `
                    <div class="summary-line">
                        <span>Mã giảm giá (${item.code}):</span>
                        <span>-${Number(item.discount).toLocaleString('vi-VN')}đ</span>
                    </div>
                `;
            });

            const changeHtml = paymentMethod === 'cash' ? `
                <div class="summary-line" style="margin-top: 15px;">
                    <span>Khách đưa:</span>
                    <span>${Number(tendered).toLocaleString('vi-VN')}đ</span>
                </div>
                <div class="summary-line">
                    <span>Tiền thừa:</span>
                    <span>${Number(Math.max(0, changeAmount)).toLocaleString('vi-VN')}đ</span>
                </div>
            ` : '';

            const htmlContent = `
                <!DOCTYPE html>
                <html lang="vi">
                <head>
                    <meta charset="UTF-8">
                    <title>Hóa Đơn - Queen Stationery</title>
                    <style>
                        body { font-family: 'Courier New', Courier, monospace; color: #000; padding: 20px; max-width: 365px; margin: 0 auto; background: #fff;}
                        h2 { text-align: center; margin: 0 0 5px 0; font-size: 16pt; font-weight: bold; }
                        p { text-align: center; margin: 0 0 5px 0; font-size: 11pt; }
                        .divider { border-bottom: 2px dashed #000; margin: 15px 0; }
                        table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 10px; }
                        th { text-align: left; padding: 5px 0; border-bottom: 2px dashed #000; font-weight: bold; }
                        .summary-line { display: flex; justify-content: space-between; font-size: 11pt; margin-top: 8px; }
                        .final-total-line { display: flex; justify-content: space-between; font-size: 13pt; font-weight: bold; margin-top: 15px; }
                        .payment-info { text-align: center; font-size: 11pt; font-weight: bold; margin-top: 15px; }
                        .footer-thanks { text-align: center; margin-top: 20px; font-size: 10pt; font-style: italic; }
                    </style>
                </head>
                <body>
                    <h2>QUEEN STATIONERY</h2>
                    <p>96 Đ. Lương Trúc Đàm, Tân Phú, TP.HCM</p>
                    <p>Hotline: (+8428) 39733381</p>
                    <div class="divider"></div>
                    <p style="font-weight: bold; font-size: 13pt;">HÓA ĐƠN BÁN LẺ</p>
                    <p>Mã đơn hàng: #${orderId}</p>
                    <p>Ngày: ${date}</p>
                    <p>Thu ngân: ${cashierName}</p>
                    ${customerHtml}
                    <div class="divider"></div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 60%;">Tên sản phẩm</th>
                                <th style="text-align: center; width: 15%;">SL</th>
                                <th style="text-align: right; width: 25%;">Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>
                    
                    <div style="border-top: 2px dashed #000; padding-top: 8px; display: flex; font-size: 10pt; margin-top: 8px;">
                        <span style="width: 60%;">Tổng số tiền:</span>
                        <span style="width: 15%; text-align: center;">${totalQuantity}</span>
                        <span style="width: 25%; text-align: right;">${Number(cartTotal).toLocaleString('vi-VN')}đ</span>
                    </div>
                    
                    ${discountHtml}
                    
                    <div class="divider"></div>
                    
                    <div class="final-total-line">
                        <span>TỔNG THANH TOÁN:</span>
                        <span>${Number(finalTotal).toLocaleString('vi-VN')}đ</span>
                    </div>

                    ${changeHtml}
                    
                    <div class="payment-info">
                        Hình thức: ${paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản / Quẹt thẻ'}
                    </div>
                    <div class="divider"></div>
                    <div class="footer-thanks">
                        Cảm ơn quý khách và hẹn gặp lại!
                    </div>
                </body>
                </html>
            `;

            if (printWindow) {
                printWindow.document.open();
                printWindow.document.write(htmlContent);
                printWindow.document.close();
                printWindow.focus();
                printWindow.print();
            }

            setShowQRModal(false);
            setPosCart([]);
            if (window.posSocket) window.posSocket.emit('update_cart', { cart: [], message: 'Đã hoàn tất thanh toán!', type: 'success' });

            setCustomerName('');
            setCustomerPhone('');
            setAppliedVouchers([]);
            setAmountTendered('');
            showToast('Thanh toán thành công!', 'success');
        } catch (err) {
            console.error("Lỗi lưu đơn hàng DB:", err);
            if (printWindow) printWindow.close();
            showToast(err.message || "Lỗi hệ thống khi thanh toán!", "error");
        }
    };

    const displayedProducts = searchTerm.trim() === ''
        ? products
        : products.filter(p => {
            const term = searchTerm.trim().toLowerCase();
            const catName = categories.find(c => c.id === p.category_id)?.name || '';
            return p.name.toLowerCase().includes(term) ||
                (p.barcode && p.barcode.toLowerCase().includes(term)) ||
                catName.toLowerCase().includes(term);
        });

    return (
        <div className="pos-container">
            {toast && (
                <div className={`global-toast toast-${toast.type}`}>
                    {toast.type === 'success' ? '' : ''} {toast.message}
                </div>
            )}

            <div className="pos-left">
                <div className="pos-search-bar">
                    <input
                        type="text"
                        placeholder="Quét mã vạch hoặc nhập tên sản phẩm..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleSearch}
                        className="global-search-input"
                    />
                    <button className="pos-scan-btn" onClick={() => setIsScanning(!isScanning)}>
                        {isScanning ? 'Tắt Camera' : 'Quét Mã Vạch'}
                    </button>
                </div>

                {isScanning && (
                    <div className="pos-camera-wrapper">
                        <div id="reader" style={{ width: '100%', zIndex: 10 }}></div>
                        <p className="pos-camera-loading">Đang khởi động Camera...</p>
                    </div>
                )}

                <div className="pos-product-grid">
                    {displayedProducts.length > 0 ? (
                        displayedProducts.map(sp => (
                            <div key={sp.id} className="pos-product-card" onClick={() => addToPosCart(sp)}>
                                <div className="pos-card-img-box">
                                    <img src={sp.image_url} alt={sp.name} />
                                </div>
                                <div className="pos-card-info">
                                    <h5>{sp.name}</h5>
                                    <p>{Number(sp.price).toLocaleString('vi-VN')}đ</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '0 40px', color: '#6b7280', fontStyle: 'italic', fontSize: '12pt' }}>
                            Không tìm thấy sản phẩm nào phù hợp!
                        </div>
                    )}
                </div>
            </div>

            <div className="pos-right">
                <h3 className="pos-bill-title">Thông tin hóa đơn</h3>

                <div className="pos-customer-form">
                    <input type="text" placeholder="Tên khách hàng (Nếu có)" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                    <input type="number" placeholder="Số điện thoại (Nếu có)" value={customerPhone} onWheel={(e) => e.target.blur()} onKeyDown={(e) => ['e', 'E', '+', '-', '.', ','].includes(e.key) && e.preventDefault()} onChange={e => setCustomerPhone(e.target.value)} />
                </div>

                <div className="pos-bill-items">
                    {posCart.length === 0 && <p style={{ textAlign: 'center', color: '#9ca3af', marginTop: '20px' }}>Chưa có sản phẩm</p>}
                    {posCart.map(item => (
                        <div key={item.id} className="pos-bill-row">
                            <div className="pos-bill-info">
                                <span className="pos-bill-name">{item.name}</span>
                                <div className="pos-bill-controls">
                                    <button onClick={() => updateQty(item.id, -1)}>-</button>
                                    <input type="number" min="1" value={item.qty} onWheel={(e) => e.target.blur()} onKeyDown={(e) => ['e', 'E', '+', '-', '.', ','].includes(e.key) && e.preventDefault()} onChange={(e) => setExactQty(item.id, e.target.value)} onBlur={() => handleQtyBlur(item.id, item.qty)} className="pos-qty-input" />
                                    <button onClick={() => updateQty(item.id, 1)}>+</button>
                                    <span style={{ color: '#dc2626', cursor: 'pointer', marginLeft: '10px' }} onClick={() => removeProduct(item.id)}>Hủy</span>
                                </div>
                            </div>
                            <div className="pos-bill-total">{(item.price * (parseInt(item.qty) || 1)).toLocaleString('vi-VN')}đ</div>
                        </div>
                    ))}
                </div>

                <div className="pos-bill-summary">

                    {appliedVouchers.length > 0 && (
                        <div className="pos-applied-vouchers-section">
                            <div
                                className="pos-applied-vouchers-toggle"
                                onClick={() => setIsAppliedVouchersModalOpen(true)}
                            >
                                <span style={{ color: '#065f46', fontWeight: 'bold', fontSize: '9pt' }}>
                                    Đã áp dụng ({appliedVouchers.length}) mã
                                </span>
                                <span style={{ color: '#065f46', fontSize: '9pt', fontWeight: 'bold', textDecoration: 'underline' }}>
                                    Xem chi tiết
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="pos-voucher-select-box" onClick={() => setIsVoucherModalOpen(true)}>
                        <span style={{ color: '#4b5563' }}>
                            {appliedVouchers.length > 0 ? 'Chọn thêm mã...' : 'Chọn mã giảm giá...'}
                        </span>
                        <span style={{ color: '#2563eb', fontWeight: 'bold' }}>
                            {appliedVouchers.length > 0 ? '+ Thêm' : 'Chọn mã'}
                        </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '6px' }}>
                        <div>
                            {discountDetails.map((item, idx) => (
                                <div key={idx} style={{ fontSize: '10pt', marginBottom: '4px' }}>
                                    Mã giảm giá ({item.code}): -{Number(item.discount).toLocaleString('vi-VN')}đ
                                </div>
                            ))}
                            <div style={{ fontSize: '11pt', fontWeight: 'bold', color: '#374151', marginTop: '6px' }}>Khách cần trả:</div>
                        </div>
                        <div style={{ color: '#dc2626', fontSize: '15pt', fontWeight: 'bold' }}>{Number(finalTotal).toLocaleString('vi-VN')}đ</div>
                    </div>

                    <div className="pos-payment-select">
                        <label>
                            <input type="radio" name="payment" value="cash" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} /> Tiền mặt
                        </label>
                        <label>
                            <input type="radio" name="payment" value="transfer" checked={paymentMethod === 'transfer'} onChange={() => setPaymentMethod('transfer')} /> Chuyển khoản
                        </label>
                    </div>

                    {paymentMethod === 'cash' && (
                        <div className="pos-cash-calculator">
                            <div className="pos-tendered-input-row">
                                <span style={{ fontSize: '10pt' }}>Khách đưa:</span>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input type="number" placeholder="Nhập số tiền" value={amountTendered} onWheel={(e) => e.target.blur()} onKeyDown={(e) => ['e', 'E', '+', '-', '.', ','].includes(e.key) && e.preventDefault()} onChange={(e) => setAmountTendered(e.target.value)} className="pos-tendered-input" />
                                    <button type="button" className="pos-clear-money-btn" onClick={() => setAmountTendered('')}>Hủy</button>
                                </div>
                            </div>

                            <div className="pos-money-suggester">
                                <button type="button" className="btn-exact" onClick={() => setAmountTendered(finalTotal.toString())}>Đủ</button>
                                <button type="button" onClick={() => setAmountTendered("10000")}>10k</button>
                                <button type="button" onClick={() => setAmountTendered("20000")}>20k</button>
                                <button type="button" onClick={() => setAmountTendered("50000")}>50k</button>
                                <button type="button" onClick={() => setAmountTendered("100000")}>100k</button>
                                <button type="button" onClick={() => setAmountTendered("200000")}>200k</button>
                                <button type="button" onClick={() => setAmountTendered("500000")}>500k</button>
                            </div>

                            <div className="pos-change-row">
                                <span style={{ fontSize: '10pt' }}>Tiền thừa:</span>
                                {amountTendered === '' ? (
                                    <span style={{ fontSize: '11pt' }}>0đ</span>
                                ) : (
                                    <span style={{ color: changeAmount < 0 ? '#dc2626' : '#10b981', fontSize: '11pt' }}>
                                        {changeAmount < 0
                                            ? `Thiếu ${(Math.abs(changeAmount)).toLocaleString('vi-VN')}đ`
                                            : `${changeAmount.toLocaleString('vi-VN')}đ`}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {paymentMethod === 'transfer' && (
                        <button className="pos-show-qr-btn" onClick={() => setShowQRModal(true)}>
                            QR Chuyển khoản
                        </button>
                    )}

                    <button className="pos-checkout-btn" onClick={(e) => handlePrintInvoice(e)}>
                        XÁC NHẬN THANH TOÁN
                    </button>
                </div>
            </div>

            {showQRModal && (
                <div className="global-modal-overlay" onClick={() => setShowQRModal(false)}>
                    <div className="pos-qr-modal-content" onClick={e => e.stopPropagation()}>
                        <button className="pos-qr-close" onClick={() => setShowQRModal(false)}>×</button>
                        <h3 style={{ marginTop: 0, color: '#1e3a8a' }}>Quét mã Thanh toán</h3>
                        <img src="/QR_bank.jpg" alt="QR Code" style={{ width: '250px', height: 'auto', margin: '15px auto', display: 'block', objectFit: 'contain' }} />
                        <p style={{ fontSize: '24pt', fontWeight: 'bold', color: '#dc2626', margin: '10px 0 0 0' }}>{Number(finalTotal).toLocaleString('vi-VN')} đ</p>
                        <p style={{ color: '#6b7280', fontSize: '11pt', marginTop: '10px', marginBottom: 0 }}>Vui lòng quét mã QR để hoàn tất thanh toán!</p>
                    </div>
                </div>
            )}

            {isVoucherModalOpen && (
                <div className="global-modal-overlay" onClick={() => setIsVoucherModalOpen(false)}>
                    <div className="voucher-modal" onClick={e => e.stopPropagation()}>
                        <div className="voucher-modal-header">
                            <h3 className="voucher-modal-title">Chọn Mã Giảm Giá</h3>
                            <button className="btn-close-modal" onClick={() => setIsVoucherModalOpen(false)}>×</button>
                        </div>

                        <div className="voucher-list-wrapper">
                            {vouchers.filter(v => v.type === 'pos').length > 0 ? (
                                vouchers.filter(v => v.type === 'pos').map(v => {
                                    const isEligible = checkVoucherEligibility(v, posCart);
                                    const isApplied = appliedVouchers.includes(v.code);

                                    return (
                                        <div key={v.id} className="voucher-card-item" style={{ opacity: isEligible ? 1 : 0.6 }}>
                                            <div className="voucher-card-info">
                                                <h4>{v.code}</h4>
                                                <div style={{ margin: '5px 0', fontSize: '11pt', color: '#4b5563' }} dangerouslySetInnerHTML={{ __html: v.description ? v.description.replace(/&nbsp;/g, ' ') : '' }} />

                                                {v.category_id ? (
                                                    <span style={{ fontSize: '9pt', color: '#d97706' }}>
                                                        Chỉ áp dụng cho danh mục {categories.find(c => c.id === v.category_id)?.name || v.category_id}
                                                    </span>
                                                ) : v.min_order > 0 ? (
                                                    <span style={{ fontSize: '9pt', color: '#d97706' }}>
                                                        Đơn tối thiểu: {Number(v.min_order).toLocaleString('vi-VN')}đ
                                                    </span>
                                                ) : null}
                                            </div>
                                            <button
                                                className={`voucher-apply-btn ${isEligible && !isApplied ? 'active' : 'disabled'}`}
                                                onClick={() => {
                                                    if (isEligible && !isApplied) handleApplyVoucher(v.code);
                                                }}
                                                disabled={!isEligible || isApplied}
                                            >
                                                {isApplied ? 'Đã áp dụng' : 'Áp dụng'}
                                            </button>
                                        </div>
                                    );
                                })
                            ) : (
                                <div style={{ textAlign: 'center', color: '#6b7280', padding: '20px 0' }}>
                                    Hệ thống chưa có mã giảm giá nào phù hợp tại quầy.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isAppliedVouchersModalOpen && (
                <div className="global-modal-overlay" onClick={() => setIsAppliedVouchersModalOpen(false)}>
                    <div className="voucher-modal" onClick={e => e.stopPropagation()}>
                        <div className="voucher-modal-header">
                            <h3 className="voucher-modal-title">Mã giảm giá đang dùng ({appliedVouchers.length})</h3>
                            <button className="close-modal-btn" onClick={() => setIsAppliedVouchersModalOpen(false)}>×</button>
                        </div>

                        <div className="voucher-list-wrapper">
                            {appliedVouchers.map(code => {
                                const voucherInfo = vouchers.find(v => v.code === code);
                                return (
                                    <div key={code} className="voucher-card-item">
                                        <div className="voucher-card-info">
                                            <h4>{code}</h4>
                                            <div style={{ margin: '5px 0', fontSize: '11pt', color: '#4b5563' }} dangerouslySetInnerHTML={{ __html: voucherInfo && voucherInfo.description ? voucherInfo.description.replace(/&nbsp;/g, ' ') : 'Mã giảm giá hợp lệ' }} />
                                            <span className="voucher-status valid">Đang áp dụng</span>
                                        </div>
                                        <button
                                            className="voucher-apply-btn"
                                            style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}
                                            onClick={() => {
                                                setAppliedVouchers(prev => prev.filter(c => c !== code));
                                                showToast(`Đã gỡ bỏ mã ${code}!`, 'success');
                                                if (appliedVouchers.length === 1) setIsAppliedVouchersModalOpen(false);
                                            }}
                                        >
                                            Gỡ bỏ
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
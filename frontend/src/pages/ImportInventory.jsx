import React, { useState, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { io } from 'socket.io-client';
import './ImportInventory.css';

export default function ImportInventory() {
    const [activeTab, setActiveTab] = useState('create');
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [historySearchTerm, setHistorySearchTerm] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [importCart, setImportCart] = useState([]);
    const [importHistory, setImportHistory] = useState([]);
    const [selectedImport, setSelectedImport] = useState(null);
    const [importDetails, setImportDetails] = useState([]);
    const [supplierName, setSupplierName] = useState();
    const [toast, setToast] = useState(null);
    const currentUser = sessionStorage.getItem('username') || 'admin';
    const currentDisplayName = sessionStorage.getItem('displayName') || 'Quản trị viên';
    const role = sessionStorage.getItem('role');
    const API_BASE = `http://${window.location.hostname}:5000`;

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        const socket = io(API_BASE);

        socket.on('sync_cart', (payload) => {
            if (payload && payload.username === currentUser) {
                if (payload.importCart) {
                    setImportCart(payload.importCart);
                }
                if (payload.message) {
                    showToast(payload.message, payload.type);
                }
            }
        });

        window.importSocket = {
            emit: (event, payload) => {
                if (event === 'update_cart') {
                    payload.username = currentUser;
                }
                socket.emit(event, payload);
            }
        };

        fetchProducts();
        fetchHistory();

        return () => {
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        let html5QrCode;
        let isMounted = true;

        if (isScanning && activeTab === 'create') {
            html5QrCode = new Html5Qrcode("import-reader");

            const onScanSuccess = (decodedText) => {
                if (html5QrCode.isScanning) {
                    html5QrCode.stop().then(() => {
                        if (isMounted) setIsScanning(false);
                        const foundProduct = products.find(p => p.barcode === decodedText);

                        if (foundProduct) {
                            setImportCart(prev => {
                                const exists = prev.find(item => item.product_id === foundProduct.id);
                                if (exists) {
                                    const warningMsg = `Đã có sản phẩm ${foundProduct.name} trong danh sách nhập!`;
                                    showToast(warningMsg, 'warning');
                                    if (window.importSocket) {
                                        window.importSocket.emit('update_cart', { importCart: prev, message: warningMsg, type: 'warning' });
                                    }
                                    return prev;
                                }

                                const msg = `Đã thêm: ${foundProduct.name}`;
                                showToast(msg, 'success');
                                const newCart = [...prev, { product_id: foundProduct.id, barcode: foundProduct.barcode || '', product_name: foundProduct.name, quantity: '' }];

                                if (window.importSocket) window.importSocket.emit('update_cart', { importCart: newCart, message: msg, type: 'success' });
                                return newCart;
                            });
                        } else {
                            const errorMsg = `Không tìm thấy mã: ${decodedText}`;

                            showToast(errorMsg, 'error');

                            if (window.importSocket) {
                                window.importSocket.emit('update_cart', {
                                    importCart: importCart,
                                    message: errorMsg,
                                    type: 'error'
                                });
                            }
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
                    const backCameras = devices.filter(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('sau'));
                    if (backCameras.length > 0) {
                        const normalBackCameras = backCameras.filter(c => !c.label.toLowerCase().includes('ultra') && !c.label.toLowerCase().includes('rộng'));
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

                html5QrCode.start(cameraConfig, config, onScanSuccess, () => { }).catch(() => {
                    showToast("Không thể bật Camera!", "error");
                    if (isMounted) setIsScanning(false);
                });
            }).catch(() => {
                if (!isMounted) return;
                html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, () => { }).catch(() => {
                    showToast("Không thể bật Camera!", "error");
                    if (isMounted) setIsScanning(false);
                });
            });
        }

        return () => {
            isMounted = false;
            if (html5QrCode && html5QrCode.isScanning) html5QrCode.stop().catch(e => console.error(e));
        };
    }, [isScanning, products, activeTab]);

    const fetchProducts = () => {
        Promise.all([
            fetch(`${API_BASE}/products`).then(res => res.json()),
            fetch(`${API_BASE}/categories`).then(res => res.json())
        ])
            .then(([prodData, catData]) => {
                setProducts(prodData);
                setCategories(catData);
            })
            .catch(err => console.error(err));
    };

    const fetchHistory = async () => {
        try {
            const res = await fetch(`${API_BASE}/imports`);
            const importsData = await res.json();

            const importsWithItems = await Promise.all(importsData.map(async (imp) => {
                try {
                    const itemRes = await fetch(`${API_BASE}/imports/${imp.id}/items`);
                    const items = await itemRes.json();
                    return { ...imp, items };
                } catch (error) {
                    return { ...imp, items: [] };
                }
            }));

            setImportHistory(importsWithItems);
        } catch (err) {
            console.error("Lỗi lấy lịch sử:", err);
        }
    };

    const addToImport = (product) => {
        setImportCart(prev => {
            const exists = prev.find(item => item.product_id === product.id);
            if (exists) return prev;

            const newCart = [...prev, { product_id: product.id, barcode: product.barcode || '', product_name: product.name, quantity: '' }];
            if (window.importSocket) window.importSocket.emit('update_cart', { importCart: newCart });
            return newCart;
        });
        showToast(`Đã thêm: ${product.name}`, 'success');
    };

    const updateImportQty = (id, value) => {
        setImportCart(prev => {
            const newCart = prev.map(item => item.product_id === id ? { ...item, quantity: value } : item);
            if (window.importSocket) window.importSocket.emit('update_cart', { importCart: newCart });
            return newCart;
        });
    };

    const removeFromImport = (id) => {
        setImportCart(prev => {
            const newCart = prev.filter(item => item.product_id !== id);
            if (newCart.length === 0) {
                setSupplierName();
            }
            if (window.importSocket) window.importSocket.emit('update_cart', { importCart: newCart });
            return newCart;
        });
    };

    const submitImport = async (e) => {
        if (e) e.preventDefault();
        const keepFocus = e ? (e.ctrlKey || e.shiftKey || e.metaKey) : false;

        if (importCart.length === 0) {
            showToast("Chưa chọn sản phẩm nào để nhập kho!", "error");
            return;
        }

        const invalidItem = importCart.find(item => !item.quantity || parseInt(item.quantity) <= 0);
        if (invalidItem) {
            showToast("Nhập số lượng sản phẩm!", "error");
            return;
        }

        if (!supplierName || supplierName.trim() === '') {
            showToast("Nhập tên Nhà cung cấp!", "error");
            return;
        }

        const printWindow = window.open('', '_blank');
        if (keepFocus && printWindow) {
            window.focus();
        }

        try {
            const res = await fetch(`${API_BASE}/imports`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: currentUser, creator_name: currentDisplayName, supplier_name: supplierName, items: importCart })
            });

            if (res.ok) {
                const data = await res.json();
                const importId = data.importId;

                const date = new Date().toLocaleString('vi-VN');
                let itemsHtml = '';
                importCart.forEach(item => {
                    itemsHtml += `
                        <tr>
                            <td style="padding: 10px 0; border-bottom: none; vertical-align: top; width: 80%; font-size: 10pt;">${item.product_name}</td>
                            <td style="padding: 10px 0; border-bottom: none; text-align: right; vertical-align: top; width: 20%; font-size: 10pt">${item.quantity}</td>
                        </tr>
                    `;
                });
                const totalQty = importCart.reduce((sum, item) => sum + parseInt(item.quantity), 0);

                const htmlContent = `
                    <!DOCTYPE html>
                    <html lang="vi">
                    <head>
                        <meta charset="UTF-8">
                        <title>Phiếu Nhập Kho - Queen Stationery</title>
                        <style>
                            body { font-family: 'Courier New', Courier, monospace; color: #000; padding: 20px; max-width: 380px; margin: 0 auto; background: #fff;}
                            h2 { text-align: center; margin: 0 0 5px 0; font-size: 16pt; font-weight: bold; }
                            p { text-align: center; margin: 0 0 5px 0; font-size: 11pt; }
                            .divider { border-bottom: 2px dashed #000; margin: 15px 0; }
                            table { width: 100%; border-collapse: collapse; font-size: 11pt; margin-bottom: 10px; }
                            th { text-align: left; padding: 5px 0; border-bottom: 2px dashed #000; font-weight: bold; }
                        </style>
                    </head>
                    <body>
                        <h2>QUEEN STATIONERY</h2>
                        <p>96 Đ. Lương Trúc Đàm, Tân Phú, TP.HCM</p>
                        <p>Hotline: (+8428) 39733381</p>
                        <div class="divider"></div>
                        <p style="font-weight: bold; font-size: 13pt; text-align: center;">PHIẾU NHẬP KHO</p>
                        <p style="text-align: center;">Mã phiếu: #${importId}</p>
                        <p style="text-align: center;">Ngày: ${date}</p>
                        <p style="text-align: center;">Người lập: ${currentDisplayName}</p>
                        <p style="text-align: center;">Nhà cung cấp: ${supplierName}</p>
                        <div class="divider"></div>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 80%;">Sản phẩm nhập</th>
                                    <th style="text-align: right; width: 20%;">Số lượng</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>
                        <div style="border-top: 2px dashed #000; padding-top: 15px; display: flex; justify-content: space-between; font-size: 13pt; font-weight: bold; margin-top: 15px;">
                            <span>TỔNG CỘNG:</span>
                            <span>${totalQty} Sản phẩm</span>
                        </div>
                        <div class="divider"></div>
                        <div style="display: flex; justify-content: space-between; margin-top: 40px; text-align: center; padding-bottom: 100px;">
                            <div style="width: 50%;">
                                <p style="font-style: italic; font-weight: bold; font-size: 10pt; margin: 0 0 5px 0;">Người vận chuyển</p>
                                <p style="font-size: 9pt; margin: 0;">(Ký, ghi rõ họ tên)</p>
                            </div>
                            <div style="width: 50%;">
                                <p style="font-style: italic; font-weight: bold; font-size: 10pt; margin: 0 0 5px 0;">Người nhận</p>
                                <p style="font-size: 9pt; margin: 0;">(Ký, ghi rõ họ tên)</p>
                            </div>
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

                showToast("Đã nhập sản phẩm!", "success");
                setImportCart([]);
                setSupplierName();

                if (window.importSocket) window.importSocket.emit('update_cart', { importCart: [], message: 'Đã hoàn tất nhập kho!', type: 'success' });

                fetchProducts();
                fetchHistory();
            } else {
                if (printWindow) printWindow.close();
                showToast("Lỗi khi lập phiếu nhập!", "error");
            }
        } catch (error) {
            console.error(error);
            if (printWindow) printWindow.close();
            showToast("Lỗi hệ thống!", "error");
        }
    };

    const viewImportDetails = async (imp) => {
        setSelectedImport(imp);
        try {
            const res = await fetch(`${API_BASE}/imports/${imp.id}/items`);
            const data = await res.json();
            setImportDetails(data);
        } catch (error) {
            console.error("Lỗi lấy chi tiết:", error);
        }
    };

    const displayedHistory = importHistory.filter(imp => {
        if (!historySearchTerm) return true;
        const term = historySearchTerm.toLowerCase();
        const idMatch = String(imp.id).toLowerCase().includes(term);
        const usernameMatch = (imp.username || '').toLowerCase().includes(term);
        const creatorMatch = (imp.creator_name || '').toLowerCase().includes(term);
        const supplierMatch = (imp.supplier_name || '').toLowerCase().includes(term);
        const dateMatch = new Date(imp.created_at).toLocaleString('vi-VN').toLowerCase().includes(term);
        const itemsMatch = imp.items && imp.items.some(item => (item.product_name || '').toLowerCase().includes(term));
        return idMatch || usernameMatch || creatorMatch || supplierMatch || dateMatch || itemsMatch;
    });

    const displayedProducts = products
        .filter(p => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            const catName = categories.find(c => c.id === p.category_id)?.name || '';
            return p.name.toLowerCase().includes(term) ||
                (p.barcode && p.barcode.toLowerCase().includes(term)) ||
                catName.toLowerCase().includes(term);
        })
        .sort((a, b) => {
            if (a.stock !== b.stock) {
                return a.stock - b.stock;
            }
            return a.id - b.id;
        });

    return (
        <div className="import-container">
            {toast && <div className={"global-toast toast-" + toast.type}>{toast.message}</div>}

            <div className="import-tabs">
                <div className={`import-tab ${activeTab === 'create' ? 'active' : ''}`} onClick={() => setActiveTab('create')}>
                    Lập phiếu nhập
                </div>
                <div className={`import-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
                    Lịch sử nhập kho
                </div>
            </div>

            {activeTab === 'create' && (
                <div className="import-layout">
                    <div className="import-left">
                        <div className="search-bar">
                            <input
                                type="text"
                                className="global-search-input"
                                style={{ maxWidth: '690px' }}
                                placeholder="Tìm tên hoặc mã vạch sản phẩm..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            <button className="import-scan-btn" onClick={() => setIsScanning(!isScanning)}>
                                {isScanning ? 'Tắt Camera' : 'Quét Mã Vạch'}
                            </button>
                        </div>

                        {isScanning && (
                            <div className="import-camera-wrapper">
                                <div id="import-reader" style={{ width: '100%', zIndex: 10 }}></div>
                                <p className="import-camera-loading">Đang khởi động Camera...</p>
                            </div>
                        )}

                        <div className="prod-list">
                            {displayedProducts.length === 0 ? (
                                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '0 20px', color: '#6b7280', fontStyle: 'italic', fontSize: '12pt' }}>
                                    Không tìm thấy sản phẩm nào phù hợp!
                                </div>
                            ) : (
                                displayedProducts.map(p => {
                                    const isSelected = importCart.some(item => item.product_id === p.id);
                                    return (
                                        <div key={p.id} className={`prod-card ${isSelected ? 'selected' : ''}`} onClick={() => addToImport(p)} title={p.name}>
                                            <img src={p.image_url} alt={p.name} />
                                            <div className="prod-card-info">
                                                <h5 style={{ width: '100%', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal', margin: '0 0 10px 0', lineHeight: '1.4' }}>{p.name}</h5>
                                                <p><span style={{ color: '#4b5563' }}>Kho: {p.stock}</span></p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="import-right">
                        <h3 style={{ margin: '0 0 15px 0' }}>Danh sách nhập</h3>

                        <div className="import-cart-list">
                            {importCart.length === 0 && <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>Chưa có sản phẩm nào.</p>}

                            {importCart.map(item => (
                                <div key={item.product_id} className="import-cart-item">
                                    <div style={{ flex: 1, paddingRight: '10px', minWidth: 0 }}>
                                        <div
                                            style={{ fontWeight: 'bold', fontSize: '11pt', color: '#1f2937', marginBottom: '5px', wordWrap: 'break-word', whiteSpace: 'normal' }}
                                            title={item.product_name}
                                        >
                                            {item.product_name}
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            <span style={{ fontSize: '10pt', color: '#6b7280' }}>Số lượng:</span>
                                            <input
                                                type="number"
                                                className="import-qty-input"
                                                placeholder="0"
                                                min="1"
                                                value={item.quantity}
                                                onWheel={(e) => e.target.blur()}
                                                onKeyDown={(e) => ['e', 'E', '+', '-', '.', ','].includes(e.key) && e.preventDefault()}
                                                onChange={(e) => updateImportQty(item.product_id, e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <button className="btn-remove" onClick={() => removeFromImport(item.product_id)}>X</button>
                                </div>
                            ))}
                        </div>

                        {importCart.length > 0 && (
                            <div style={{ borderTop: '2px dashed #e5e7eb', paddingTop: '15px', marginTop: 'auto', flexShrink: 0 }}>

                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', fontSize: '11pt', fontWeight: 'bold', color: '#374151', marginBottom: '5px' }}>Nhà cung cấp:</label>
                                    <input
                                        type="text"
                                        className="global-search-input"
                                        style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
                                        placeholder="Nhập tên nhà cung cấp..."
                                        value={supplierName}
                                        onChange={(e) => setSupplierName(e.target.value)}
                                    />
                                </div>

                                <button className="btn-submit-import" onClick={(e) => submitImport(e)}>
                                    Xác Nhận
                                </button>

                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'history' && (
                <div style={{ background: '#ffffff', paddingTop: '5px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', marginBottom: '20px', marginLeft: '10px' }}>
                        <input
                            type="text"
                            className="global-search-input"
                            placeholder="Tìm kiếm thông tin lập phiếu..."
                            value={historySearchTerm}
                            onChange={(e) => setHistorySearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="history-table-wrapper">
                        <table className="history-table">
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Mã Phiếu</th>
                                    <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Thời gian nhập</th>
                                    <th style={{ textAlign: 'left' }}>Sản phẩm nhập</th>
                                    {role === 'admin' && <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Tài khoản</th>}
                                    <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Người lập phiếu</th>
                                    <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Tổng số lượng</th>
                                    <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan={role === 'admin' ? "7" : "6"} style={{ textAlign: 'center', padding: '20px', color: '#6b7280', fontStyle: 'italic', fontSize: '12pt' }}>
                                            Không tìm thấy phiếu nhập nào phù hợp!
                                        </td>
                                    </tr>
                                ) : (
                                    displayedHistory.map(imp => (
                                        <tr key={imp.id}>
                                            <td style={{ textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap', fontSize: '11pt' }}>#{imp.id}</td>
                                            <td style={{ fontSize: '10pt', color: '#4b5563', whiteSpace: 'nowrap' }}>{new Date(imp.created_at).toLocaleString('vi-VN')}</td>

                                            <td style={{ textAlign: 'left' }}>
                                                {imp.items && imp.items.length > 0 ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        {imp.items.map((item, idx) => (
                                                            <div key={idx} style={{ fontSize: '11pt', color: '#374151' }}>
                                                                {item.product_name}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#9ca3af', fontStyle: 'italic' }}></span>
                                                )}
                                            </td>

                                            {role === 'admin' && (
                                                <td style={{ textAlign: 'center', whiteSpace: 'nowrap', fontSize: '11pt', color: '#4b5563' }}>@{imp.username}</td>
                                            )}
                                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap', fontSize: '11pt' }}>{imp.creator_name}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#4b5563', fontSize: '11pt', whiteSpace: 'nowrap' }}>{imp.total_quantity}</td>
                                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap', fontSize: '11pt' }}>
                                                <button className="text-view-detail" onClick={() => viewImportDetails(imp)}>Chi tiết</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {selectedImport && (
                <div className="receipt-modal-overlay" onClick={() => setSelectedImport(null)}>
                    <div className="receipt-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="receipt-paper">
                            <h2 style={{ textAlign: 'center', margin: '0 0 5px 0', fontSize: '16pt', fontWeight: 'bold' }}>QUEEN STATIONERY</h2>
                            <p style={{ textAlign: 'center', margin: '0 0 5px 0', fontSize: '11pt' }}>96 Đ. Lương Trúc Đàm, Tân Phú, TP.HCM</p>
                            <p style={{ textAlign: 'center', margin: '0 0 5px 0', fontSize: '11pt' }}>Hotline: (+8428) 39733381</p>
                            <div style={{ borderBottom: '2px dashed #000', margin: '15px 0' }}></div>

                            <p style={{ fontWeight: 'bold', fontSize: '13pt', textAlign: 'center', margin: '0 0 5px 0' }}>PHIẾU NHẬP KHO</p>
                            <p style={{ textAlign: 'center', margin: '0 0 5px 0', fontSize: '11pt' }}>Mã phiếu: #{selectedImport.id}</p>
                            <p style={{ textAlign: 'center', margin: '0 0 5px 0', fontSize: '11pt' }}>Ngày: {new Date(selectedImport.created_at).toLocaleString('vi-VN')}</p>
                            <p style={{ textAlign: 'center', margin: '0 0 5px 0', fontSize: '11pt' }}>Người lập: {selectedImport.creator_name}</p>
                            <p style={{ textAlign: 'center', margin: '0 0 5px 0', fontSize: '11pt' }}>Nhà cung cấp: {selectedImport.supplier_name}</p>

                            <div style={{ borderBottom: '2px dashed #000', margin: '15px 0' }}></div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', fontSize: '11pt', tableLayout: 'fixed' }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: '80%', textAlign: 'left', borderBottom: '2px dashed #000', padding: '5px 0', fontWeight: 'bold' }}>Sản phẩm nhập</th>
                                        <th style={{ width: '20%', textAlign: 'right', borderBottom: '2px dashed #000', padding: '5px 0', fontWeight: 'bold' }}>Số lượng</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {importDetails.map((item, index) => (
                                        <tr key={index}>
                                            <td style={{ padding: '10px 0', borderBottom: 'none', verticalAlign: 'top', whiteSpace: 'normal', wordWrap: 'break-word', fontSize: '10pt' }}>{item.product_name}</td>
                                            <td style={{ padding: '10px 0', borderBottom: 'none', textAlign: 'right', verticalAlign: 'top', fontSize: '10pt' }}>{item.quantity}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div style={{ borderTop: '2px dashed #000', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', fontSize: '13pt', fontWeight: 'bold', margin: '15px 0' }}>
                                <span>TỔNG CỘNG:</span>
                                <span>{selectedImport.total_quantity} Sản phẩm</span>
                            </div>

                            <div style={{ borderBottom: '2px dashed #000', margin: '15px 0' }}></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', textAlign: 'center', paddingBottom: '100px' }}>
                                <div style={{ width: '50%' }}>
                                    <p style={{ fontStyle: 'italic', fontWeight: 'bold', fontSize: '10pt', margin: '0 0 5px 0' }}>Người vận chuyển</p>
                                    <p style={{ fontSize: '9pt', margin: 0 }}>(Ký, ghi rõ họ tên)</p>
                                </div>
                                <div style={{ width: '50%' }}>
                                    <p style={{ fontStyle: 'italic', fontWeight: 'bold', fontSize: '10pt', margin: '0 0 5px 0' }}>Người nhận</p>
                                    <p style={{ fontSize: '9pt', margin: 0 }}>(Ký, ghi rõ họ tên)</p>
                                </div>
                            </div>
                        </div>
                        <button className="receipt-close-btn" onClick={() => setSelectedImport(null)}>← Quay lại</button>
                    </div>
                </div>
            )}
        </div>
    );
}
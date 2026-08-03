import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import * as XLSX from 'xlsx';

export default function Dashboard() {
    const [orders, setOrders] = useState([]);
    const [items, setItems] = useState([]);
    const [timeRange, setTimeRange] = useState('day');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [hoveredPoint, setHoveredPoint] = useState(null);
    const [toast, setToast] = useState(null);
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const [featuredProducts, setFeaturedProducts] = useState(() => {
        const saved = localStorage.getItem('queen_featured');
        return saved ? JSON.parse(saved) : [];
    });
    const [isFeatureModalOpen, setIsFeatureModalOpen] = useState(false);
    const [tempFeatured, setTempFeatured] = useState([]);

    const openFeatureModal = () => {
        setTempFeatured([...featuredProducts]);
        setIsFeatureModalOpen(true);
    };

    const handleCheckItem = (prodName) => {
        if (tempFeatured.includes(prodName)) {
            setTempFeatured(tempFeatured.filter(n => n !== prodName));
        } else {
            setTempFeatured([...tempFeatured, prodName]);
        }
    };

    const confirmFeatureSelection = () => {
        if (tempFeatured.length < 5) {
            showToast(`Chọn ${tempFeatured.length}/5 sản phẩm!`, 'warning');
            return;
        }
        if (tempFeatured.length > 5) {
            showToast(`Chọn ${tempFeatured.length}/5 sản phẩm!`, 'error');
            return;
        }

        fetch(`http://${window.location.hostname}:5000/api/featured-products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ featured: tempFeatured })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setFeaturedProducts(tempFeatured);
                    localStorage.setItem('queen_featured', JSON.stringify(tempFeatured));
                    window.dispatchEvent(new Event('featured_updated'));
                    showToast('Áp dụng thành công lên hệ thống!', 'success');
                    setIsFeatureModalOpen(false);
                } else {
                    showToast('Lỗi lưu dữ liệu lên máy chủ!', 'error');
                }
            })
            .catch(() => showToast('Không thể kết nối đến máy chủ!', 'error'));
    };

    const API_BASE = `http://${window.location.hostname}:5000`;

    useEffect(() => {
        fetch(`${API_BASE}/statistics`)
            .then(res => res.ok ? res.json() : { orders: [], items: [] })
            .then(data => {
                setOrders(Array.isArray(data.orders) ? data.orders : []);
                setItems(Array.isArray(data.items) ? data.items : []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (startDate && endDate) {
            setTimeRange('custom');
        }
    }, [startDate, endDate]);

    const safeParseDate = (dateStr) => {
        if (!dateStr) return 0;
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? 0 : d.getTime();
    };

    const now = new Date();
    const startOfDayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dayOfWeek = now.getDay();
    const diffToMonday = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const startOfWeekMs = new Date(now.getFullYear(), now.getMonth(), diffToMonday).getTime();
    const startOfMonthMs = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfYearMs = new Date(now.getFullYear(), 0, 1).getTime();

    const getStats = (startMs) => {
        const validOrders = orders.filter(o => safeParseDate(o.created_at) >= startMs);
        const rev = validOrders.reduce((sum, o) => sum + Number(o.final_total || 0), 0);
        const orderCount = validOrders.filter(o => o.order_type === 'online').length;
        const validItems = items.filter(i => safeParseDate(i.created_at) >= startMs);
        const qty = validItems.reduce((sum, i) => sum + Number(i.quantity || 0), 0);
        return { rev, qty, orderCount };
    };

    const statsDay = getStats(startOfDayMs);
    const statsWeek = getStats(startOfWeekMs);
    const statsMonth = getStats(startOfMonthMs);
    const statsYear = getStats(startOfYearMs);

    const getChartData = () => {
        let data = [];
        if (timeRange === 'day') {
            const labels = ["0-2h", "2-4h", "4-6h", "6-8h", "8-10h", "10-12h", "12-14h", "14-16h", "16-18h", "18-20h", "20-22h", "22-24h"];
            const values = Array(12).fill(0);
            orders.filter(o => safeParseDate(o.created_at) >= startOfDayMs).forEach(o => {
                const hour = new Date(o.created_at).getHours();
                values[Math.floor(hour / 2)] += Number(o.final_total || 0);
            });
            data = labels.map((l, i) => ({ label: l, value: values[i] }));
        } else if (timeRange === 'week') {
            const labels = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"];
            const values = [0, 0, 0, 0, 0, 0, 0];
            orders.filter(o => safeParseDate(o.created_at) >= startOfWeekMs).forEach(o => {
                let day = new Date(o.created_at).getDay();
                let index = day === 0 ? 6 : day - 1;
                values[index] += Number(o.final_total || 0);
            });
            data = labels.map((l, i) => ({ label: l, value: values[i] }));
        } else if (timeRange === 'month') {
            const labels = ["Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4"];
            const values = [0, 0, 0, 0];
            orders.filter(o => safeParseDate(o.created_at) >= startOfMonthMs).forEach(o => {
                const date = new Date(o.created_at).getDate();
                values[Math.min(Math.floor((date - 1) / 7), 3)] += Number(o.final_total || 0);
            });
            data = labels.map((l, i) => ({ label: l, value: values[i] }));
        } else if (timeRange === 'year') {
            const labels = ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"];
            const values = Array(12).fill(0);
            orders.filter(o => safeParseDate(o.created_at) >= startOfYearMs).forEach(o => {
                const month = new Date(o.created_at).getMonth();
                values[month] += Number(o.final_total || 0);
            });
            data = labels.map((l, i) => ({ label: l, value: values[i] }));
        } else if (timeRange === 'custom' && startDate && endDate) {
            let startMs = new Date(startDate).setHours(0, 0, 0, 0);
            let endMs = new Date(endDate).setHours(23, 59, 59, 999);

            if (startMs > endMs) {
                const temp = startMs; startMs = endMs; endMs = temp;
            }

            const startDay0h = new Date(startMs).setHours(0, 0, 0, 0);
            const endDay0h = new Date(endMs).setHours(0, 0, 0, 0);

            const totalDays = Math.round((endDay0h - startDay0h) / (1000 * 60 * 60 * 24)) + 1;

            const pointsCount = totalDays <= 10 ? totalDays : 10;

            const labels = [];
            const values = Array(pointsCount).fill(0);
            const buckets = [];

            const step = totalDays / pointsCount;

            for (let i = 0; i < pointsCount; i++) {
                const startOffset = Math.floor(i * step);
                const endOffset = i === pointsCount - 1 ? totalDays - 1 : Math.floor((i + 1) * step) - 1;

                const bStartMs = startDay0h + (startOffset * 24 * 60 * 60 * 1000);
                const bEndMs = startDay0h + (endOffset * 24 * 60 * 60 * 1000);

                const fStart = new Date(bStartMs).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                const fEnd = new Date(bEndMs).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

                labels.push(fStart === fEnd ? fStart : `${fStart} - ${fEnd}`);

                buckets.push({
                    start: bStartMs,
                    end: bEndMs + (23 * 3600 * 1000 + 59 * 60 * 1000 + 59000 + 999)
                });
            }

            orders.filter(o => {
                const ms = safeParseDate(o.created_at);
                return ms >= startMs && ms <= endMs;
            }).forEach(o => {
                const ms = safeParseDate(o.created_at);

                for (let i = 0; i < buckets.length; i++) {
                    if (ms >= buckets[i].start && ms <= buckets[i].end) {
                        values[i] += Number(o.final_total || 0);
                        break;
                    }
                }
            });

            data = labels.map((l, i) => ({ label: l, value: values[i] }));
        }
        return data;
    };

    const chartData = getChartData();
    let maxChartValue = 3000000;
    if (timeRange === 'week') maxChartValue = 10000000;
    if (timeRange === 'month') maxChartValue = 40000000;
    if (timeRange === 'year') maxChartValue = 500000000;
    if (timeRange === 'custom') {
        const maxVal = Math.max(...chartData.map(d => d.value), 0);
        if (maxVal === 0) {
            maxChartValue = 1000000;
        } else {
            const roughStep = maxVal / 5;
            const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
            const niceStep = Math.ceil(roughStep / magnitude) * magnitude;
            maxChartValue = niceStep * 5;
        }
    }

    const svgWidth = 1000;
    const svgHeight = 340;
    const padding = { top: 40, bottom: 40, left: 90, right: 45 };
    const chartW = svgWidth - padding.left - padding.right;
    const chartH = svgHeight - padding.top - padding.bottom;
    const yTicks = [];
    for (let i = 0; i <= 5; i++) {
        yTicks.push((maxChartValue / 5) * i);
    }

    const handleExportExcel = () => {
        const summaryData = [
            { "Thời gian": "Trong ngày", "Doanh thu (VNĐ)": statsDay.rev, "Số lượng đã bán": statsDay.qty, "Số đơn đặt hàng": statsDay.orderCount },
            { "Thời gian": "Trong tuần", "Doanh thu (VNĐ)": statsWeek.rev, "Số lượng đã bán": statsWeek.qty, "Số đơn đặt hàng": statsWeek.orderCount },
            { "Thời gian": "Trong tháng", "Doanh thu (VNĐ)": statsMonth.rev, "Số lượng đã bán": statsMonth.qty, "Số đơn đặt hàng": statsMonth.orderCount },
            { "Thời gian": "Trong năm", "Doanh thu (VNĐ)": statsYear.rev, "Số lượng đã bán": statsYear.qty, "Số đơn đặt hàng": statsYear.orderCount }
        ];

        let revenueData = [];

        if (timeRange === 'custom' && startDate && endDate) {
            let startMs = new Date(startDate).setHours(0, 0, 0, 0);
            let endMs = new Date(endDate).setHours(23, 59, 59, 999);

            if (startMs > endMs) {
                const temp = startMs; startMs = endMs; endMs = temp;
            }

            const startDay0h = new Date(startMs).setHours(0, 0, 0, 0);
            const totalDays = Math.round((new Date(endMs).setHours(0, 0, 0, 0) - startDay0h) / (1000 * 60 * 60 * 24)) + 1;

            for (let i = 0; i < totalDays; i++) {
                const currentDayMs = startDay0h + (i * 24 * 60 * 60 * 1000);
                const currentDayEndMs = currentDayMs + (24 * 60 * 60 * 1000) - 1;

                const dailyTotal = orders
                    .filter(o => {
                        const ms = safeParseDate(o.created_at);
                        return ms >= currentDayMs && ms <= currentDayEndMs;
                    })
                    .reduce((sum, o) => sum + Number(o.final_total || 0), 0);

                revenueData.push({
                    "Thời điểm ghi nhận": new Date(currentDayMs).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                    "Doanh thu (VNĐ)": dailyTotal
                });
            }
        } else {
            revenueData = chartData.map(item => ({
                "Thời điểm ghi nhận": item.label,
                "Doanh thu (VNĐ)": item.value
            }));
        }

        const topProductsData = topProducts.map((prod, index) => ({
            "Thứ hạng": `Top ${index + 1}`,
            "Tên sản phẩm": prod.name,
            "Số lượng đã bán": prod.qty
        }));

        const wb = XLSX.utils.book_new();
        const wsSummary = XLSX.utils.json_to_sheet(summaryData);
        const wsRevenue = XLSX.utils.json_to_sheet(revenueData);
        const wsTopProducts = XLSX.utils.json_to_sheet(topProductsData);

        wsSummary['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }];
        wsRevenue['!cols'] = [{ wch: 25 }, { wch: 20 }];
        wsTopProducts['!cols'] = [{ wch: 15 }, { wch: 100 }, { wch: 20 }];

        XLSX.utils.book_append_sheet(wb, wsSummary, "Tổng Quan");
        XLSX.utils.book_append_sheet(wb, wsRevenue, "Chi Tiết Doanh Thu");
        XLSX.utils.book_append_sheet(wb, wsTopProducts, "Top Sản Phẩm");

        const dateStr = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
        XLSX.writeFile(wb, `Bao_Cao_Doanh_Thu_QueenStationery_${dateStr}.xlsx`);

        showToast("Đã xuất file Excel thành công!", "success");
    };

    const points = chartData.map((d, i) => {
        const x = padding.left + (i * (chartW / Math.max(chartData.length - 1, 1)));
        const visualValue = Math.min(d.value, maxChartValue);
        const y = padding.top + chartH - ((visualValue / maxChartValue) * chartH);

        return { x, y, label: d.label, value: d.value };
    });

    let linePath = '';
    let areaPath = '';

    if (points.length > 0) {
        linePath = `M ${points[0].x} ${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const tension = 0;
            const cp1x = p1.x + (p2.x - p1.x) * tension;
            const cp1y = p1.y;
            const cp2x = p2.x - (p2.x - p1.x) * tension;
            const cp2y = p2.y;
            linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }
        areaPath = `${linePath} L ${points[points.length - 1].x} ${svgHeight - padding.bottom} L ${points[0].x} ${svgHeight - padding.bottom} Z`;
    }

    const getTopProducts = () => {
        const validItems = items.filter(i => safeParseDate(i.created_at) >= startOfYearMs);
        const productSales = {};
        validItems.forEach(item => {
            if (!productSales[item.product_name]) productSales[item.product_name] = 0;
            productSales[item.product_name] += Number(item.quantity || 0);
        });
        return Object.entries(productSales)
            .map(([name, qty]) => ({ name, qty }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 10);
    };

    const topProducts = getTopProducts();
    const maxQty = topProducts.length > 0 ? topProducts[0].qty : 1;
    if (loading) return <div className="dash-container"><h3>Đang tải dữ liệu...</h3></div>;

    return (
        <div className="dash-container">
            {toast && <div className={"global-toast toast-" + toast.type}>{toast.message}</div>}

            <div className="dash-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h2 className="dash-title">Thống kê Doanh thu</h2>
                <button className="global-btn-add" style={{ marginRight: '3px' }} onClick={handleExportExcel}>
                    <span>Xuất Excel báo cáo</span>
                </button>
            </div>

            <div className="dash-summary-grid">
                <div className="dash-card">
                    <div className="card-title">Trong ngày</div>
                    <h2 className="card-value">{statsDay.rev.toLocaleString('vi-VN')}đ</h2>
                    <div className="card-qty">Đã bán: {statsDay.qty} sản phẩm</div>
                    <div className="card-qty">Đơn hàng: {statsDay.orderCount} đơn</div>
                </div>
                <div className="dash-card">
                    <div className="card-title">Trong tuần</div>
                    <h2 className="card-value">{statsWeek.rev.toLocaleString('vi-VN')}đ</h2>
                    <div className="card-qty">Đã bán: {statsWeek.qty} sản phẩm</div>
                    <div className="card-qty">Đơn hàng: {statsWeek.orderCount} đơn</div>
                </div>
                <div className="dash-card">
                    <div className="card-title">Trong tháng</div>
                    <h2 className="card-value">{statsMonth.rev.toLocaleString('vi-VN')}đ</h2>
                    <div className="card-qty">Đã bán: {statsMonth.qty} sản phẩm</div>
                    <div className="card-qty">Đơn hàng: {statsMonth.orderCount} đơn</div>
                </div>
                <div className="dash-card">
                    <div className="card-title">Trong năm</div>
                    <h2 className="card-value">{statsYear.rev.toLocaleString('vi-VN')}đ</h2>
                    <div className="card-qty">Đã bán: {statsYear.qty} sản phẩm</div>
                    <div className="card-qty">Đơn hàng: {statsYear.orderCount} đơn</div>
                </div>
            </div>

            <div className="dash-main-content">
                <div className="dash-chart-section">
                    <div className="chart-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                            <h2 className="chart-title">Biểu đồ Doanh thu</h2>

                            <div className="custom-date-filter">
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                <span style={{ fontWeight: 'bold', color: '#6b7280' }}>-</span>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                        </div>

                        <div className="chart-tabs">
                            <button className={`chart-tab ${timeRange === 'day' ? 'active' : ''}`} onClick={() => { setTimeRange('day'); setStartDate(''); setEndDate(''); }}>1 Ngày</button>
                            <button className={`chart-tab ${timeRange === 'week' ? 'active' : ''}`} onClick={() => { setTimeRange('week'); setStartDate(''); setEndDate(''); }}>1 Tuần</button>
                            <button className={`chart-tab ${timeRange === 'month' ? 'active' : ''}`} onClick={() => { setTimeRange('month'); setStartDate(''); setEndDate(''); }}>1 Tháng</button>
                            <button className={`chart-tab ${timeRange === 'year' ? 'active' : ''}`} onClick={() => { setTimeRange('year'); setStartDate(''); setEndDate(''); }}>1 Năm</button>
                        </div>
                    </div>

                    <div className="svg-chart-wrapper">
                        <svg
                            width="100%" height="100%"
                            viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none"
                            onClick={() => setHoveredPoint(null)}
                            onMouseLeave={() => setHoveredPoint(null)}
                        >
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                </linearGradient>
                            </defs>

                            {yTicks.map((tick, i) => {
                                const yPos = padding.top + chartH - ((tick / maxChartValue) * chartH);

                                const tickLabel = tick === 0 ? '0đ' : tick.toLocaleString('vi-VN') + 'đ';

                                return (
                                    <g key={`y-axis-${i}`}>
                                        <line x1={padding.left} y1={yPos} x2={svgWidth - padding.right} y2={yPos} stroke="#e5e7eb" strokeDasharray="5 5" strokeWidth="1" />
                                        <text x={padding.left - 10} y={yPos + 4} fill="#6b7280" fontSize="11" fontWeight="bold" textAnchor="end">
                                            {tickLabel}
                                        </text>
                                    </g>
                                );
                            })}

                            <line x1={padding.left} y1={svgHeight - padding.bottom} x2={svgWidth - padding.right} y2={svgHeight - padding.bottom} stroke="#9ca3af" strokeWidth="2" />
                            <line x1={padding.left} y1={padding.top} x2={padding.left} y2={svgHeight - padding.bottom} stroke="#9ca3af" strokeWidth="2" />

                            {points.map((p, i) => {
                                const totalPoints = points.length;
                                let showLabel = false;

                                if (totalPoints <= 12) {
                                    showLabel = true;
                                } else {
                                    const step = Math.ceil(totalPoints / 10);
                                    if (i === 0 || i === totalPoints - 1) {
                                        showLabel = true;
                                    } else if (i % step === 0 && (totalPoints - 1 - i) > Math.floor(step * 0.7)) {
                                        showLabel = true;
                                    }
                                }

                                if (!showLabel) return null;

                                return (
                                    <text key={`label-${i}`} x={p.x} y={svgHeight - 15} fill="#6b7280" fontSize="11" fontWeight="bold" textAnchor="middle">
                                        {p.label}
                                    </text>
                                );
                            })}

                            {areaPath && (
                                <path d={areaPath} fill="url(#colorRevenue)" style={{ pointerEvents: 'none', transition: 'all 0.3s ease' }} />
                            )}

                            {linePath && (
                                <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none', transition: 'all 0.3s ease' }} />
                            )}

                            {points.map((p, i) => (
                                <circle
                                    key={`point-${i}`}
                                    cx={p.x}
                                    cy={p.y}
                                    r={hoveredPoint?.x === p.x ? 2 : 2}
                                    fill={hoveredPoint?.x === p.x ? "#1e40af" : "#ffffff"}
                                    stroke="#2563eb"
                                    strokeWidth="2"
                                    style={{ cursor: 'pointer', transition: 'all 0.1s' }}
                                    onMouseEnter={() => setHoveredPoint(p)}
                                    onMouseLeave={() => setHoveredPoint(null)}
                                    onClick={(e) => { e.stopPropagation(); setHoveredPoint(p); }}
                                />
                            ))}

                            {hoveredPoint && (
                                <g style={{ pointerEvents: 'none' }}>
                                    {(() => {
                                        const textStr = `${hoveredPoint.value.toLocaleString('vi-VN')}đ`;
                                        const boxW = textStr.length * 6.5 + 10;
                                        let rectX = hoveredPoint.x - (boxW / 2);
                                        if (rectX < padding.left - 3) rectX = padding.left - 3;
                                        if (rectX + boxW > svgWidth - padding.right + 7) rectX = svgWidth - padding.right - boxW + 7;
                                        return (
                                            <>
                                                <polygon points={`${hoveredPoint.x - 6},${hoveredPoint.y - 12} ${hoveredPoint.x + 6},${hoveredPoint.y - 12} ${hoveredPoint.x},${hoveredPoint.y - 4}`} fill="#1f2937" />

                                                <text x={rectX + (boxW / 2)} y={hoveredPoint.y - 20} fill="#1f2937" fontSize="11" fontWeight="bold" textAnchor="middle">
                                                    {textStr}
                                                </text>
                                            </>
                                        );
                                    })()}
                                </g>
                            )}
                        </svg>
                    </div>
                </div>

                <div className="dash-top-products">
                    <div className="top-header-wrapper">
                        <h2 className="chart-title" style={{ fontSize: '15pt' }}>Top 10 Sản phẩm bán chạy nhất</h2>
                        <button className="btn-open-feature" onClick={openFeatureModal}>
                            Chọn sản phẩm nổi bật ({featuredProducts.length}/5)
                        </button>
                    </div>

                    <div className="top-list">
                        {topProducts.length === 0 ? <p style={{ color: '#6b7280' }}>Chưa có dữ liệu bán hàng.</p> : null}

                        {topProducts.map((prod, idx) => (
                            <div className="top-item" key={idx}>
                                <div className="top-item-header">
                                    <span className="top-item-name" title={prod.name}>
                                        <span style={{ color: '#2563eb', marginRight: '5px' }}>#{idx + 1}</span>
                                        {prod.name}
                                    </span>
                                    <span className="top-item-qty">{prod.qty} đã bán</span>
                                </div>
                                <div className="progress-track">
                                    <div className="progress-fill" style={{ width: `${(prod.qty / maxQty) * 100}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {isFeatureModalOpen && (
                <div className="feature-modal-overlay" onMouseDown={() => setIsFeatureModalOpen(false)}>
                    <div className="feature-modal-box" onMouseDown={e => e.stopPropagation()}>
                        <div className="global-modal-header">
                            <h3 className="global-modal-title">Chọn Sản Phẩm Nổi Bật</h3>
                            <button className="btn-close-modal" onClick={() => setIsFeatureModalOpen(false)}>×</button>
                        </div>

                        <div className="feature-modal-body">
                            {topProducts.map((prod, idx) => {
                                const isSelected = tempFeatured.includes(prod.name);
                                return (
                                    <div
                                        key={idx}
                                        className={`feature-checkbox-item ${isSelected ? 'selected' : ''}`}
                                        onClick={() => handleCheckItem(prod.name)}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ color: isSelected ? '#2563eb' : '#9ca3af', fontWeight: 'bold' }}>#{idx + 1}</span>
                                            <span className="feature-item-name" title={prod.name}>{prod.name}</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="feature-checkbox"
                                            checked={isSelected}
                                            readOnly
                                        />
                                    </div>
                                )
                            })}
                        </div>

                        <div className="global-modal-footer">
                            <button className="global-btn-cancel" onClick={() => setIsFeatureModalOpen(false)}>Hủy</button>
                            <button className="global-btn-confirm" onClick={confirmFeatureSelection}>Xác nhận</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
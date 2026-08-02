import React from 'react';
import { BrowserRouter, Routes, Route, } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Products from './pages/Products';
import Blogs from './pages/Blogs';
import Vouchers from './pages/Vouchers';
import { CartProvider } from './context/CartContext';
import Cart from './pages/Cart';
import Admin from './pages/Admin';
import Detail from './pages/Detail';
import POS from './pages/POS';
import OrderManagement from './pages/OrderManagement';
import TransactionHistory from './pages/TransactionHistory';
import Inventory from './pages/Inventory';
import ImportInventory from './pages/ImportInventory';
import EmployeeManagement from './pages/EmployeeManagement';
import VoucherBlogManagement from './pages/VoucherBlogManagement';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import ChangePassword from './pages/ChangePassword';

export default function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:categoryId" element={<Products />} />
          <Route path="/blogs" element={<Blogs />} />
          <Route path="/vouchers" element={<Vouchers />} />
          <Route path="/change-password" element={<ChangePassword />} />

          <Route path="/product/:id" element={<Detail />} />
          <Route path="/blog/:id" element={<Detail />} />
          <Route path="/voucher/:id" element={<Detail />} />

          <Route path="/admin" element={<Admin />}>
            <Route path="pos" element={<POS />} />
            <Route path="orderManagement" element={<OrderManagement />} />
            <Route path="transactions" element={<TransactionHistory />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="import" element={<ImportInventory />} />
            <Route path="employees" element={<EmployeeManagement />} />
            <Route path="voucher-blog" element={<VoucherBlogManagement />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </CartProvider>
  );
}
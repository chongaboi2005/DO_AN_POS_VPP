import React from 'react';
import Header from './Header';
import Footer from './Footer';

export default function Layout({ children }) {
    return (
        <div className="container" id="top">
            <Header />

            <div className="main-content-wrapper">
                {children}
            </div>

            <Footer />
        </div>
    );
}
import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Import Components
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Import các trang của bạn
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import ProfilePage from './pages/ProfilePage';
import EditProfilePage from './pages/EditProfilePage';
import SettingsPage from './pages/SettingsPage';
import MyProducts from './pages/MyProducts';
import OrderTrackingPage from './pages/OrderTrackingPage'; // Trang /order
import HistoryPage from './pages/HistoryPage';           // Trang /history
import SellerDashboard from './pages/SellerDashboard';
import CartPage from './pages/CartPage';
import TrackingPage from './pages/TrackingPage';         
import OrderDetailPage from './pages/OrderDetailPage';

// 1. IMPORT TRANG CHAT MỚI
import ChatPage from './pages/ChatPage';

// Tạo các component "giữ chỗ"
const About = () => <h1>Trang Giới Thiệu (About)</h1>;

function App() {
  return (
    <> {/* Sử dụng React Fragment */}
      
      <Header />

      {/* Giữ nguyên "main-content" để sticky footer hoạt động */}
      <main className="main-content">
        <Routes>
          {/* Các Route cũ */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Các Route mới cho Header */}
          <Route path="/about" element={<About />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/order" element={<OrderTrackingPage />} />
          <Route path="/history" element={<HistoryPage />} />

          {/* Các Route cho Shop/Product (Đã có) */}
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:productId" element={<ProductDetail />} />
          
          {/* Các Route Hồ Sơ (Đã có) */}
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:profileId" element={<ProfilePage />} />
          <Route path="/profile/edit" element={<EditProfilePage />} />
          <Route path="/profile/settings" element={<SettingsPage />} />

          {/* Route Tracking (Đã có) */}
          <Route path="/tracking/:orderId" element={<TrackingPage />} />
          
          <Route path="/history/:orderId" element={<OrderDetailPage />} />

          {/* 2. THÊM ROUTE CHO CHAT */}
          <Route 
            path="/chat" 
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/chat/:chatWithUserId" 
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            } 
          />

          {/* Các Route của Seller */}
          <Route 
            path="/my-products" 
            element={
              <ProtectedRoute role="seller">
                <MyProducts />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/seller-dashboard" 
            element={
              <ProtectedRoute role="seller">
                <SellerDashboard />
              </ProtectedRoute>
            } 
          />

        </Routes>
      </main>
      
      <Footer />
      
    </>
  )
}

export default App;
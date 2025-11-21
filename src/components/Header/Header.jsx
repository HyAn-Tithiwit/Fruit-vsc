import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css'; // CSS file cho Header

// 1. Import hook useAuth và các hàm của Firebase
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';

function Header() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // 2. Lấy thông tin user từ Context
  const { currentUser, currentUserData } = useAuth();
  
  const navigate = useNavigate();

  // 3. Hàm xử lý Đăng xuất
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsDropdownOpen(false); // Đóng dropdown
      navigate('/login'); // Điều hướng về trang đăng nhập
    } catch (error) {
      console.error("Lỗi khi đăng xuất: ", error);
    }
  };
  
  // 4. Kiểm tra xem user có phải là 'seller' hay không
  const isSeller = currentUserData?.role === 'seller';

  return (
    <header className="site-header">
      {/* 1. Bên trái: Logo */}
      <div className="header-left">
        <Link to="/" className="logo">
          FruitFarm
        </Link>
      </div>

      {/* 2. Bên phải: Navigation và User Menu */}
      <div className="header-right">
        {/* Thanh điều hướng chính */}
        <nav className="main-nav">
          <Link to="/about">About</Link>
          <Link to="/cart">Giỏ hàng</Link>
          <Link to="/order">Đơn hàng</Link>
          {isSeller && (
            <Link to="/seller-dashboard" className="seller-link">
              Bảng điều khiển
            </Link>
          )}
        </nav>

        {/* Menu người dùng (có dropdown) */}
        <div className="user-menu">
          <button 
            className="user-icon-button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            {/* 👤 */}
            {currentUser ? `Chào, ${currentUser.email.split('@')[0]}` : '👤'}
          </button>

          {isDropdownOpen && (
            <div className="dropdown-content">
              {currentUser ? (
                // 5. NẾU ĐÃ ĐĂNG NHẬP
                <>
                  <Link to="/profile">Hồ sơ người dùng</Link>
                  <Link to="/history">Lịch sử giao dịch</Link>
                  <Link to="/chat">Chat</Link>
                  {isSeller && (
                    <Link to="/my-products">Sản phẩm của tôi</Link>
                  )}
                  <button onClick={handleLogout} className="logout-button">
                    Đăng xuất
                  </button>
                </>
              ) : (
                // 6. NẾU CHƯA ĐĂNG NHẬP
                <>
                  <Link to="/login">Đăng nhập</Link>
                  <Link to="/register">Đăng ký</Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
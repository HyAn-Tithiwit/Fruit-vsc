import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import từ AuthContext

function ProtectedRoute({ children, role }) {
  const { currentUser, currentUserData } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    // 1. Chưa đăng nhập -> Chuyển về trang login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && currentUserData?.role !== role) {
    // 2. Đã đăng nhập, nhưng sai vai trò (role) -> Chuyển về trang chủ
    return <Navigate to="/" replace />;
  }

  // 3. Đã đăng nhập + Đúng vai trò -> Cho phép truy cập
  return children;
}

export default ProtectedRoute;
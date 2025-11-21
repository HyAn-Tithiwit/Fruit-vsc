import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase'; // Import auth và db
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// 1. Tạo Context
const AuthContext = createContext();

// 2. Tạo hook (useAuth) để dễ dàng sử dụng Context
export function useAuth() {
  return useContext(AuthContext);
}

// 3. Tạo Provider (Nơi chứa logic)
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null); // Nơi lưu trữ role
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChanged là một listener, nó tự động chạy
    // mỗi khi user đăng nhập hoặc đăng xuất
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user); // Lưu user của Auth (uid, email)
      
      if (user) {
        // Nếu user đăng nhập, lấy thêm thông tin (role) từ Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setCurrentUserData(userDocSnap.data()); // Lưu data (email, role, uid)
        }
      } else {
        // Nếu user đăng xuất, xóa data
        setCurrentUserData(null);
      }
      
      setLoading(false); // Dừng loading
    });

    // Cleanup listener khi component unmount
    return unsubscribe;
  }, []);

  // Giá trị được cung cấp cho toàn bộ ứng dụng
  const value = {
    currentUser,       // Từ Firebase Auth (chứa uid)
    currentUserData,   // Từ Firestore (chứa role)
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Chỉ render các component con khi đã hết loading */}
      {!loading && children}
    </AuthContext.Provider>
  );
}
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css'; // Dùng file CSS chung
import { auth } from '../firebase'; // Import auth
import { signInWithEmailAndPassword } from 'firebase/auth';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate(); // Hook để điều hướng

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); // Xóa lỗi cũ

    try {
      // 1. Đăng nhập bằng Firebase Auth
      await signInWithEmailAndPassword(auth, email, password);

      // 2. Đăng nhập thành công, điều hướng về trang chủ
      navigate('/'); 

    } catch (err) {
      // Xử lý lỗi
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Email hoặc mật khẩu không đúng.');
      } else {
        setError('Đã xảy ra lỗi. Vui lòng thử lại.');
      }
      console.error(err);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Đăng nhập</h1>

        {error && <div className="auth-error-message">{error}</div>}

        <div className="auth-form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="auth-form-group">
          <label htmlFor="password">Mật khẩu</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="auth-submit-btn">
          Đăng nhập
        </button>

        <div className="auth-switch-link">
          <p>Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link></p>
        </div>
      </form>
    </div>
  );
}

export default Login;
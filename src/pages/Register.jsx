import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css'; // Dùng file CSS chung
import './Profile.css'; // Dùng chung CSS của Profile cho form-group
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { BsGeoAltFill } from 'react-icons/bs';

// 1. IMPORT COMPONENT BẢN ĐỒ VÀ TỌA ĐỘ MẶC ĐỊNH
import LocationPicker from '../components/LocationPicker';
const DEFAULT_LOCATION = { lat: 21.028511, lng: 105.804817 }; // Mặc định ở Hà Nội

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('buyer');
  
  // 2. THÊM STATE MỚI (TỪ HỒ SƠ)
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('other');
  const [idCard, setIdCard] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressCountry, setAddressCountry] = useState('Vietnam');
  const [location, setLocation] = useState(DEFAULT_LOCATION);

  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // 3. HÀM CẬP NHẬT VỊ TRÍ TỪ BẢN ĐỒ
  const handleLocationChange = (newLocation) => {
    setLocation({
      lat: newLocation.lat,
      lng: newLocation.lng
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (role === 'seller' && !businessName) {
      setError('Người Bán phải nhập Tên cửa hàng (Hồ sơ doanh nghiệp).');
      return;
    }
    if (!addressStreet || !addressCity) {
      setError('Vui lòng nhập địa chỉ (Đường/Phố và Thành phố).');
      return;
    }

    try {
      // 4. TẠO USER TRONG AUTH
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 5. LƯU TẤT CẢ THÔNG TIN VÀO FIRESTORE
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        role: role,
        createdAt: new Date(),
        
        // --- Thêm dữ liệu mới ---
        displayName: displayName,
        phone: phone,
        gender: gender,
        idCard: idCard,
        businessName: role === 'seller' ? businessName : '',
        addressStreet: addressStreet,
        addressCity: addressCity,
        addressCountry: addressCountry,
        location: location, // Lưu tọa độ
        
        // --- Khởi tạo các giá trị trống ---
        avatarUrl: '',
        bio: '',
        followers: 0,
        following: 0,
        loyaltyPoints: 0
      });

      // 6. Đăng ký thành công, điều hướng về trang chủ
      navigate('/'); 

    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Email này đã được sử dụng.');
      } else {
        setError('Đã xảy ra lỗi. Vui lòng thử lại.');
      }
      console.error(err);
    }
  };

  return (
    <div className="auth-container">
      {/* Chúng ta dùng 'profile-edit-form' để tái sử dụng CSS */}
      <form className="profile-edit-form" onSubmit={handleSubmit}>
        <h1>Đăng ký tài khoản</h1>

        {error && <div className="auth-error-message">{error}</div>}
        
        {/* --- TÀI KHOẢN --- */}
        <fieldset className="form-fieldset">
          <legend>Thông tin Tài khoản</legend>
          <div className="form-group">
            <label htmlFor="displayName">Tên hiển thị*</label>
            <input type="text" id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="email">Email*</label>
              <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="password">Mật khẩu* (ít nhất 6 ký tự)</label>
              <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength="6" />
            </div>
          </div>
        </fieldset>
        
        {/* --- THÔNG TIN CÁ NHÂN --- */}
        <fieldset className="form-fieldset">
          <legend>Thông tin Cá nhân</legend>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="phone">Số điện thoại</label>
              <input type="tel" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="idCard">Căn cước</label>
              <input type="text" id="idCard" value={idCard} onChange={(e) => setIdCard(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="gender">Giới tính</label>
            <select id="gender" name="gender" value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="other">Khác</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
            </select>
          </div>
        </fieldset>

        {/* --- VAI TRÒ & ĐỊA CHỈ --- */}
        <fieldset className="form-fieldset">
          <legend>Vai trò & Địa chỉ</legend>
          <div className="form-group">
            <label htmlFor="role">Bạn là?*</label>
            <select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="buyer">Người Mua</option>
              <option value="seller">Người Bán</option>
            </select>
          </div>

          {role === 'seller' && (
            <div className="form-group">
              <label htmlFor="businessName">Hồ sơ doanh nghiệp (Tên cửa hàng)*</label>
              <input type="text" id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required={role === 'seller'} />
            </div>
          )}

          <legend style={{ marginTop: '1rem' }}>
            <BsGeoAltFill /> {role === 'seller' ? 'Địa chỉ Doanh nghiệp*' : 'Địa chỉ Giao hàng*'}
          </legend>
          
          <div className="form-group">
            <label htmlFor="addressStreet">Địa chỉ (Số nhà, Tên đường)*</label>
            <input type="text" id="addressStreet" value={addressStreet} onChange={(e) => setAddressStreet(e.target.value)} required />
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="addressCity">Thành phố / Tỉnh*</label>
              <input type="text" id="addressCity" value={addressCity} onChange={(e) => setAddressCity(e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="addressCountry">Quốc gia*</label>
              <input type="text" id="addressCountry" value={addressCountry} onChange={(e) => setAddressCountry(e.target.value)} required />
            </div>
          </div>

          <div className="form-group map-picker-group">
            <label>Chọn vị trí chính xác trên bản đồ*</label>
            <p className="map-info">Tọa độ: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>
            <LocationPicker 
              initialPosition={location}
              onPositionChange={handleLocationChange}
            />
          </div>
        </fieldset>
        
        {/* DÒNG ĐÃ SỬA: type="submit" */}
        <button type="submit" className="auth-submit-btn">
          Đăng ký
        </button>

        <div className="auth-switch-link">
          <p>Đã có tài khoản? <Link to="/login">Đăng nhập ngay</Link></p>
        </div>
      </form>
    </div>
  );
}

export default Register;
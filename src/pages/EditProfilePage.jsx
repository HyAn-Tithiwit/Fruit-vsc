import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './Profile.css';
import { BsUpload, BsGeoAltFill, BsPlusCircle, BsTrash } from 'react-icons/bs';
import { v4 as uuidv4 } from 'uuid'; 

// IMPORT COMPONENT BẢN ĐỒ
import LocationPicker from '../components/LocationPicker';

// Tọa độ mặc định (Ví dụ: Trung tâm Hà Nội)
const DEFAULT_LOCATION = { lat: 21.028511, lng: 105.804817 };

function EditProfilePage() {
  const { currentUser, currentUserData } = useAuth(); // Lấy cả currentUserData
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // State cho các trường chung
  const [formData, setFormData] = useState({
    avatarUrl: '',
    displayName: '',
    bio: '',
    phone: '',
    gender: 'other',
    idCard: '',
    businessName: '',
  });

  // --- LOGIC STATE MỚI CHO ĐỊA CHỈ/VƯỜN ---
  const [userRole, setUserRole] = useState('buyer');
  
  // State cho Buyer (1 địa chỉ)
  const [buyerAddress, setBuyerAddress] = useState({
    addressStreet: '',
    addressCity: '',
    addressCountry: 'Vietnam',
    location: DEFAULT_LOCATION,
  });

  // State cho Seller (nhiều vườn)
  const [farms, setFarms] = useState({}); // Dùng object (map)
  const [newFarmName, setNewFarmName] = useState('');
  const [newFarmAddress, setNewFarmAddress] = useState('');
  const [newFarmLocation, setNewFarmLocation] = useState(DEFAULT_LOCATION);
  // --- KẾT THÚC LOGIC STATE MỚI ---

  const [avatarImage, setAvatarImage] = useState(null);

  // Tải dữ liệu hiện tại của user
  useEffect(() => {
    if (!currentUserData) {
      if (!currentUser) navigate('/login');
      return; // Chờ currentUserData được tải
    }

    const data = currentUserData;
    setUserRole(data.role || 'buyer');
    
    // Tải dữ liệu chung
    setFormData({
      avatarUrl: data.avatarUrl || '',
      displayName: data.displayName || '',
      bio: data.bio || '',
      phone: data.phone || '',
      gender: data.gender || 'other',
      idCard: data.idCard || '',
      businessName: data.businessName || '',
    });

    // Tải dữ liệu địa chỉ tùy theo vai trò
    if (data.role === 'seller') {
      setFarms(data.farms || {}); // Lấy object các vườn
    } else {
      // Nếu là buyer, tải 1 địa chỉ
      setBuyerAddress({
        addressStreet: data.addressStreet || '',
        addressCity: data.addressCity || '',
        addressCountry: data.addressCountry || 'Vietnam',
        location: data.location || DEFAULT_LOCATION,
      });
    }
    
    setLoading(false);
  }, [currentUser, currentUserData, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Hàm cho Buyer
  const handleBuyerAddressChange = (e) => {
    const { name, value } = e.target;
    setBuyerAddress(prev => ({ ...prev, [name]: value }));
  };
  const handleBuyerLocationChange = (newLocation) => {
    setBuyerAddress(prev => ({
      ...prev,
      location: { lat: newLocation.lat, lng: newLocation.lng }
    }));
  };

  // --- HÀM MỚI CHO SELLER ---
  const handleAddNewFarm = (e) => {
    e.preventDefault();
    if (!newFarmName || !newFarmAddress) {
      alert("Vui lòng nhập Tên Vườn và Địa chỉ Vườn.");
      return;
    }
    const newFarmId = uuidv4(); // Tạo ID ngẫu nhiên
    const newFarm = {
      name: newFarmName,
      address: newFarmAddress,
      location: newFarmLocation
    };

    setFarms(prev => ({
      ...prev,
      [newFarmId]: newFarm // Thêm vườn mới vào object
    }));

    // Reset form thêm mới
    setNewFarmName('');
    setNewFarmAddress('');
    setNewFarmLocation(DEFAULT_LOCATION);
  };

  const handleDeleteFarm = (farmId) => {
    setFarms(prev => {
      const updatedFarms = { ...prev };
      delete updatedFarms[farmId]; // Xóa key khỏi object
      return updatedFarms;
    });
  };
  // --- KẾT THÚC HÀM MỚI ---
  
  const handleAvatarChange = (e) => {
    if (e.target.files[0]) {
      setAvatarImage(e.target.files[0]);
      const reader = new FileReader();
      reader.onload = (e) => setFormData(prev => ({ ...prev, avatarUrl: e.target.result }));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // --- CẬP NHẬT HÀM SUBMIT ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (!currentUser) return;

    let newAvatarUrl = formData.avatarUrl;

    try {
      if (avatarImage) {
        const storageRef = ref(storage, `avatars/${currentUser.uid}/${avatarImage.name}`);
        const snapshot = await uploadBytes(storageRef, avatarImage);
        newAvatarUrl = await getDownloadURL(snapshot.ref);
      }

      // Chuẩn bị dữ liệu cập nhật
      let updateData = {
        ...formData, // displayName, bio, phone, v.v.
        avatarUrl: newAvatarUrl,
      };

      // Thêm dữ liệu địa chỉ tùy theo vai trò
      if (userRole === 'seller') {
        updateData.farms = farms; // Lưu object các vườn
      } else {
        updateData = { ...updateData, ...buyerAddress }; // Lưu 1 địa chỉ
      }

      // Cập nhật document trong Firestore
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, updateData);
      
      setLoading(false);
      alert('Cập nhật hồ sơ thành công!');
      
      // SỬA Ở ĐÂY:
      // navigate('/profile'); // <-- XÓA DÒNG NÀY
      window.location.href = '/profile'; // <-- THÊM DÒNG NÀY (Buộc tải lại)
      
    } catch (error) {
      console.error("Lỗi khi cập nhật hồ sơ: ", error);
      alert('Đã xảy ra lỗi, vui lòng thử lại.');
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="profile-loading">Đang tải...</div>;
  }

  // --- RENDER GIAO DIỆN ---
  return (
    <div className="profile-edit-container">
      <form className="profile-edit-form" onSubmit={handleSubmit}>
        <h1>Chỉnh sửa trang cá nhân</h1>

        {/* --- Code Avatar, Tên, Tiểu sử, Thông tin cá nhân (Giữ nguyên) --- */}
        <div className="form-group avatar-uploader">
          <img 
            src={formData.avatarUrl || 'https://placehold.co/150x150/f0f0f0/ccc?text=Avatar'} 
            alt="Avatar" 
            className="profile-avatar-preview"
          />
          <input 
            type="file" 
            id="avatar-upload" 
            accept="image/*" 
            onChange={handleAvatarChange} 
            style={{ display: 'none' }}
          />
          <label htmlFor="avatar-upload" className="profile-btn">
            <BsUpload /> Thay đổi ảnh đại diện
          </label>
        </div>
        
        <div className="form-group">
          <label htmlFor="displayName">Tên hiển thị</label>
          <input 
            type="text" 
            id="displayName" 
            name="displayName" 
            value={formData.displayName} 
            onChange={handleInputChange} 
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="bio">Tiểu sử</label>
          <textarea 
            id="bio" 
            name="bio" 
            rows="3" 
            value={formData.bio} 
            onChange={handleInputChange}
          ></textarea>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="phone">Số điện thoại</label>
            <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label htmlFor="gender">Giới tính</label>
            <select id="gender" name="gender" value={formData.gender} onChange={handleInputChange}>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="other">Khác</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="idCard">Căn cước</label>
            <input type="text" id="idCard" name="idCard" value={formData.idCard} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label htmlFor="businessName">Hồ sơ doanh nghiệp (Tên cửa hàng)</label>
            <input type="text" id="businessName" name="businessName" value={formData.businessName} onChange={handleInputChange} />
          </div>
        </div>
        
        {/* --- HIỂN THỊ CÓ ĐIỀU KIỆN CHO ĐỊA CHỈ --- */}
        {userRole === 'buyer' ? (
          // --- GIAO DIỆN CHO NGƯỜI MUA ---
          <fieldset className="form-fieldset">
            <legend><BsGeoAltFill /> Địa chỉ Giao hàng</legend>
            <div className="form-group">
              <label htmlFor="addressStreet">Địa chỉ (Số nhà, Tên đường)</label>
              <input type="text" id="addressStreet" name="addressStreet" value={buyerAddress.addressStreet} onChange={handleBuyerAddressChange} />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="addressCity">Thành phố / Tỉnh</label>
                <input type="text" id="addressCity" name="addressCity" value={buyerAddress.addressCity} onChange={handleBuyerAddressChange} />
              </div>
              <div className="form-group">
                <label htmlFor="addressCountry">Quốc gia</label>
                <input type="text" id="addressCountry" name="addressCountry" value={buyerAddress.addressCountry} onChange={handleBuyerAddressChange} />
              </div>
            </div>
            <div className="form-group map-picker-group">
              <label>Chọn vị trí chính xác trên bản đồ</label>
              <LocationPicker 
                initialPosition={buyerAddress.location}
                onPositionChange={handleBuyerLocationChange}
              />
            </div>
          </fieldset>
        ) : (
          // --- GIAO DIỆN MỚI CHO NGƯỜI BÁN ---
          <fieldset className="form-fieldset">
            <legend><BsGeoAltFill /> Quản lý Vườn/Kho hàng</legend>
            
            {/* Danh sách các vườn hiện có */}
            <div className="farm-list">
              {Object.keys(farms).length === 0 ? (
                <p className="map-info">Bạn chưa có vườn nào.</p>
              ) : (
                Object.entries(farms).map(([id, farm]) => (
                  <div key={id} className="farm-item">
                    <div className="farm-item-info">
                      <strong>{farm.name}</strong>
                      <small>{farm.address}</small>
                      <small>Vị trí: {farm.location.lat.toFixed(4)}, {farm.location.lng.toFixed(4)}</small>
                    </div>
                    <button type="button" onClick={() => handleDeleteFarm(id)} className="farm-delete-btn">
                      <BsTrash />
                    </button>
                  </div>
                ))
              )}
            </div>
            
            <hr className="form-divider" />

            {/* Form thêm vườn mới */}
            <h4 className="form-subheading">Thêm Vườn Mới</h4>
            <div className="form-group">
              <label htmlFor="newFarmName">Tên Vườn</label>
              <input type="text" id="newFarmName" value={newFarmName} onChange={(e) => setNewFarmName(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="newFarmAddress">Địa chỉ Vườn</label>
              <input type="text" id="newFarmAddress" value={newFarmAddress} onChange={(e) => setNewFarmAddress(e.target.value)} />
            </div>
            <div className="form-group map-picker-group">
              <label>Chọn vị trí Vườn trên bản đồ</label>
              <LocationPicker 
                initialPosition={newFarmLocation}
                onPositionChange={(newPos) => setNewFarmLocation({ lat: newPos.lat, lng: newPos.lng })}
              />
            </div>
            <button type="button" onClick={handleAddNewFarm} className="profile-btn">
              <BsPlusCircle /> Thêm Vườn
            </button>
          </fieldset>
        )}
        
        <button type="submit" className="profile-btn primary" disabled={loading}>
          {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </form>
    </div>
  );
}

export default EditProfilePage;
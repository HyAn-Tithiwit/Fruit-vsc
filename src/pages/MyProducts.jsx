import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../firebase';
import { collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import './MyProducts.css'; //

function MyProducts() {
  // 1. LẤY DỮ LIỆU CỦA NGƯỜI DÙNG (ĐỂ TÌM CÁC VƯỜN)
  const { currentUser, currentUserData } = useAuth();
  
  const [myProducts, setMyProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // State cho form (cũ)
  const [name, setName] = useState('');
  const [description, setDescription] = useState(''); // Mô tả ngắn
  const [price, setPrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [category, setCategory] = useState('');
  const [seasonMonth, setSeasonMonth] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // --- 2. THÊM STATE MỚI ---
  const [longDescription, setLongDescription] = useState('');
  const [usageInstructions, setUsageInstructions] = useState('');
  const [recipeRecommendations, setRecipeRecommendations] = useState('');
  
  const [availableFarms, setAvailableFarms] = useState([]); // [{ id: 'farm1', name: 'Vườn A' ... }]
  const [selectedFarmId, setSelectedFarmId] = useState('');
  // --- KẾT THÚC THÊM STATE ---

  // 3. Tải danh sách sản phẩm VÀ danh sách vườn
  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);

    // 3a. Tải danh sách sản phẩm đã đăng (như cũ)
    const q = query(
      collection(db, "fruits"), // Lấy từ file cũ
      where("seller_id", "==", currentUser.uid)
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const productsData = [];
      querySnapshot.forEach((doc) => {
        productsData.push({ id: doc.id, ...doc.data() });
      });
      setMyProducts(productsData);
      setLoading(false);
    });

    // 3b. TẢI DANH SÁCH VƯỜN CỦA SELLER
    if (currentUserData && currentUserData.farms) {
      // Chuyển object 'farms' từ 'users' document thành một mảng
      const farmsArray = Object.entries(currentUserData.farms).map(([id, data]) => ({
        id: id,
        ...data // data chứa { name, address, location }
      }));
      setAvailableFarms(farmsArray);
      
      // Tự động chọn vườn đầu tiên nếu có
      if (farmsArray.length > 0 && !selectedFarmId) { // Thêm check !selectedFarmId
        setSelectedFarmId(farmsArray[0].id);
      }
    }

    return () => unsubscribe();
  }, [currentUser, currentUserData, selectedFarmId]); // Chạy lại khi currentUserData được tải

  // Hàm handleImageChange (giữ nguyên)
  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // 4. CẬP NHẬT HÀM SUBMIT
  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    if (!imageFile || !currentUser || !selectedFarmId) {
      alert("Vui lòng điền đầy đủ thông tin, chọn ảnh, và chọn vườn gửi đi.");
      return;
    }

    setUploading(true);
    try {
      // Lấy thông tin đầy đủ của vườn đã chọn
      const selectedFarm = availableFarms.find(f => f.id === selectedFarmId);
      if (!selectedFarm) {
        throw new Error("Không tìm thấy thông tin vườn.");
      }

      // 4a. Upload ảnh (như cũ)
      const imageRef = ref(storage, `fruit_images/${imageFile.name + uuidv4()}`);
      const snapshot = await uploadBytes(imageRef, imageFile);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const seasonArray = seasonMonth.split(',')
                                      .map(s => parseInt(s.trim()))
                                      .filter(n => !isNaN(n));

      // 4b. Tạo document mới trong 'fruits' (từ file cũ)
      await addDoc(collection(db, "fruits"), {
        name: name,
        description: description, // Mô tả ngắn
        price_vnd: Number(price),
        discount: Number(discount),
        category: category,
        season_month: seasonArray,
        image_url: downloadURL,
        seller_id: currentUser.uid,
        order_count: 0,
        rating_avg: 0,
        createdAt: new Date(),

        // --- CÁC TRƯỜNG MỚI (MÔ TẢ DÀI) ---
        long_description: longDescription,
        usage_instructions: usageInstructions,
        recipe_recommendations: recipeRecommendations,

        // --- CÁC TRƯỜNG MỚI (THÔNG TIN VƯỜN) ---
        farm_id: selectedFarm.id,
        farm_name: selectedFarm.name,
        farm_location: selectedFarm.location
      });

      // 4c. Reset form
      setName('');
      setDescription('');
      setPrice(0);
      setDiscount(0);
      setCategory('');
      setSeasonMonth('');
      setImageFile(null);
      setImagePreview(null);
      setLongDescription('');
      setUsageInstructions('');
      setRecipeRecommendations('');
      alert("Đăng bán sản phẩm thành công!");

    } catch (error) {
      console.error("Lỗi khi đăng sản phẩm: ", error);
      alert("Đã xảy ra lỗi khi đăng sản phẩm.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="my-products-container">
      {/* CỘT BÊN TRÁI: FORM ĐĂNG BÁN (ĐÃ CẬP NHẬT) */}
      <div className="product-form-container">
        <h2>Đăng bán sản phẩm mới</h2>
        <form onSubmit={handleSubmitProduct} className="product-form">
          
          {/* --- 5. THÊM Ô CHỌN VƯỜN --- */}
          <div className="form-group">
            <label>Gửi hàng từ Vườn/Kho*</label>
            <select value={selectedFarmId} onChange={(e) => setSelectedFarmId(e.target.value)} required>
              <option value="" disabled>-- Chọn một vườn --</option>
              {availableFarms.length === 0 ? (
                <option value="" disabled>Bạn chưa thêm vườn nào (Vui lòng cập nhật hồ sơ)</option>
              ) : (
                availableFarms.map(farm => (
                  <option key={farm.id} value={farm.id}>{farm.name}</option>
                ))
              )}
            </select>
          </div>
          <hr className="form-divider" />
          
          <div className="form-group">
            <label>Tên sản phẩm*</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Mô tả ngắn* (Hiển thị trên thẻ sản phẩm)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Giá (VNĐ)*</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Giảm giá (%)</label>
              <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Danh mục (VD: Cam, Táo)*</label>
              <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Tháng mùa vụ (VD: 6,7,8)</label>
              <input type="text" value={seasonMonth} onChange={(e) => setSeasonMonth(e.target.value)} />
            </div>
          </div>
          
          {/* --- 6. THÊM CÁC Ô MÔ TẢ DÀI --- */}
          <div className="form-group">
            <label>Mô tả chi tiết (Cho trang sản phẩm)</label>
            <textarea className="long-description" value={longDescription} onChange={(e) => setLongDescription(e.target.value)} placeholder="Mô tả nguồn gốc, xuất xứ..." />
          </div>
          <div className="form-group">
            <label>Cách sử dụng / Bảo quản</label>
            <textarea value={usageInstructions} onChange={(e) => setUsageInstructions(e.target.value)} placeholder="VD: Bảo quản lạnh, dùng trong 3 ngày..."/>
          </div>
          <div className="form-group">
            <label>Gợi ý món ăn</label>
            <textarea value={recipeRecommendations} onChange={(e) => setRecipeRecommendations(e.target.value)} placeholder="VD: Nước ép, Sinh tố..." />
          </div>
          {/* --- KẾT THÚC --- */}

          <div className="form-group">
            <label>Ảnh sản phẩm*</label>
            <input type="file" accept="image/*" onChange={handleImageChange} required />
            {imagePreview && (
              <img src={imagePreview} alt="Xem trước" className="image-preview" />
            )}
          </div>
          <button type="submit" className="btn-submit" disabled={uploading || availableFarms.length === 0}>
            {uploading ? 'Đang tải lên...' : 'Đăng bán'}
          </button>
        </form>
      </div>

      {/* CỘT BÊN PHẢI: DANH SÁCH SẢN PHẨM (Giữ nguyên từ file cũ) */}
      <div className="product-list-container">
        <h2>Sản phẩm của tôi</h2>
        {loading ? (
          <p>Đang tải danh sách...</p>
        ) : (
          <div className="product-list">
            {myProducts.length === 0 ? (
              <p>Bạn chưa đăng bán sản phẩm nào.</p>
            ) : (
              myProducts.map(product => (
                <div key={product.id} className="my-product-item">
                  <img src={product.image_url} alt={product.name} />
                  <div className="my-product-info">
                    <h4>{product.name}</h4>
                    <p>{product.price_vnd.toLocaleString('vi-VN')}đ</p>
                    <p>Đã bán: {product.order_count}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyProducts;
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, limit, getDocs, setDoc } from 'firebase/firestore';
import ProductCard from '../components/ProductCard/ProductCard';
import './ProductDetail.css';

// 1. IMPORT CÁC HOOKS VÀ UTILS MỚI
import { useAuth } from '../context/AuthContext'; 
import { getDistanceFromLatLonInKm } from '../utils/geography'; // Import hàm tính khoảng cách
import { BsTruck } from 'react-icons/bs';

function ProductDetail() {
  const { productId } = useParams();
  const { currentUser, currentUserData } = useAuth(); // Lấy user và data (chứa location)
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [quantity, setQuantity] = useState(1);
  
  // 2. STATE MỚI CHO CÁC TÍNH NĂNG
  const [activeTab, setActiveTab] = useState('description'); // Tab cho section 2
  const [deliveryInfo, setDeliveryInfo] = useState(null); // { distance, time }
  const [loadingDelivery, setLoadingDelivery] = useState(true);

  // Effect 1: Tải sản phẩm chính
  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      // SỬA LỖI: Đảm bảo truy vấn collection "fruit" (theo file cũ của bạn)
      const docRef = doc(db, "fruits", productId); 
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setProduct({ id: docSnap.id, ...docSnap.data() });
      } else {
        console.error("Không tìm thấy sản phẩm!");
      }
      setLoading(false);
    };
    fetchProduct();
  }, [productId]);

  // Effect 2: Tải sản phẩm liên quan
  useEffect(() => {
    if (product) {
      const fetchRelatedProducts = async () => {
        try {
          // 1. Tìm theo người bán (seller_id)
          const sellerQuery = query(
            collection(db, "fruits"), // Sửa: "fruits" -> "fruit"
            where("seller_id", "==", product.seller_id),
            limit(4)
          );
          
          // 2. Tìm theo danh mục (category)
          const categoryQuery = query(
            collection(db, "fruits"), // Sửa: "fruits" -> "fruit"
            where("category", "==", product.category),
            limit(4)
          );

          const [sellerSnapshot, categorySnapshot] = await Promise.all([
            getDocs(sellerQuery),
            getDocs(categoryQuery)
          ]);

          // Gộp kết quả và loại bỏ trùng lặp
          const relatedMap = new Map();
          sellerSnapshot.docs.forEach(doc => {
            if (doc.id !== product.id) { // Không thêm chính nó
              relatedMap.set(doc.id, { id: doc.id, ...doc.data() });
            }
          });
          categorySnapshot.docs.forEach(doc => {
            if (doc.id !== product.id) { // Không thêm chính nó
              relatedMap.set(doc.id, { id: doc.id, ...doc.data() });
            }
          });

          setRelatedProducts(Array.from(relatedMap.values()).slice(0, 4)); // Lấy 4 sản phẩm
        } catch (error) {
          console.error("Lỗi khi tải sản phẩm liên quan: ", error);
        }
      };
      fetchRelatedProducts();
    }
  }, [product]);

  // 3. EFFECT MỚI: TÍNH TOÁN THỜI GIAN GIAO HÀNG
  useEffect(() => {
    const fetchDeliveryInfo = async () => {
      if (!product || !currentUserData?.location) {
        // Không thể tính nếu thiếu vị trí người bán hoặc người mua
        setLoadingDelivery(false);
        return;
      }
      
      setLoadingDelivery(true);
      try {
        const buyerLoc = currentUserData.location;
        
        // Tải vị trí của người bán
        const sellerDocRef = doc(db, "users", product.seller_id);
        const sellerSnap = await getDoc(sellerDocRef);
        
        if (sellerSnap.exists() && sellerSnap.data().location) {
          const sellerLoc = sellerSnap.data().location;
          
          // Tính khoảng cách
          const distance = getDistanceFromLatLonInKm(buyerLoc.lat, buyerLoc.lng, sellerLoc.lat, sellerLoc.lng);
          
          // Logic ước tính thời gian
          let time = "3-5 ngày";
          if (distance < 10) time = "Trong ngày";
          else if (distance < 100) time = "1-2 ngày";
          
          setDeliveryInfo({ distance: distance.toFixed(1), time: time });
        }
      } catch (error) {
        console.error("Lỗi khi tính toán giao hàng: ", error);
      }
      setLoadingDelivery(false);
    };

    fetchDeliveryInfo();
  }, [product, currentUserData]); 

  // Hàm xử lý tăng/giảm số lượng
  const handleQuantityChange = (amount) => {
    setQuantity(prev => Math.max(1, prev + amount)); 
  };

  // HÀM MỚI: Xử lý Thêm vào giỏ hàng (ĐÃ NÂNG CẤP)
  const handleAddToCart = async () => {
    if (!currentUser) {
      alert("Vui lòng đăng nhập để thêm vào giỏ hàng!");
      return;
    }
    if (!product) return;

    // Tạo đường dẫn đến item trong giỏ hàng
    const cartItemRef = doc(db, "carts", currentUser.uid, "items", product.id);

    try {
      // Giả định rằng 'product' object (tải từ 'fruit')
      // ĐÃ CÓ chứa thông tin farm_id, farm_name, và farm_location
      if (!product.farm_id || !product.farm_location) {
        console.error("Sản phẩm này bị lỗi, thiếu thông tin kho hàng.");
        alert("Sản phẩm này hiện không thể thêm vào giỏ.");
        return;
      }

      await setDoc(cartItemRef, {
        name: product.name,
        image_url: product.image_url,
        price_vnd: product.price_vnd,
        discount: product.discount || 0,
        seller_id: product.seller_id,
        quantity: quantity,
        
        // --- THÊM MỚI: LƯU THÔNG TIN VƯỜN ---
        farm_id: product.farm_id,
        farm_name: product.farm_name,
        farm_location: product.farm_location 
        // --- KẾT THÚC ---
      }, { merge: true });

      alert("Đã thêm vào giỏ hàng!");
    } catch (error) {
      console.error("Lỗi khi thêm vào giỏ: ", error);
      alert("Đã xảy ra lỗi.");
    }
  };

  if (loading) {
    return <div className="product-detail-loading">Đang tải chi tiết sản phẩm...</div>;
  }
  if (!product) {
    return <div className="product-detail-loading">Không tìm thấy sản phẩm.</div>;
  }
  
  const finalPrice = product.price_vnd - (product.price_vnd * (product.discount || 0) / 100);

  return (
    <div className="product-detail-container">
      {/* ===== SECTION 1: CHI TIẾT SẢN PHẨM (Đã cập nhật) ===== */}
      <section className="detail-section-main">
        {/* Cột ảnh */}
        <div className="product-image-gallery">
          <img src={product.image_url} alt={product.name} className="main-product-image" />
        </div>

        {/* Cột thông tin */}
        <div className="product-info">
          <h1 className="product-title">{product.name}</h1>
          
          {/* ... (Giá, Mô tả ngắn, Người bán giữ nguyên) ... */}
          <div className="product-prices">
            <span className="final-price">{finalPrice.toLocaleString('vi-VN')}đ</span>
            {product.discount > 0 && (
              <span className="original-price">{product.price_vnd.toLocaleString('vi-VN')}đ</span>
            )}
            {product.discount > 0 && (
              <span className="discount-badge">-{product.discount}%</span>
            )}
          </div>
          
          <p className="product-short-description">
            {product.description}
          </p>
          
          <div className="product-seller-info">
            Bán bởi: <Link to={`/profile/${product.seller_id}`}>Tên Người Bán</Link>
          </div>

          {/* --- MỚI: ƯỚC LƯỢNG GIAO HÀNG --- */}
          <div className="delivery-estimation-box">
            <div className="delivery-icon"><BsTruck /></div>
            <div className="delivery-info">
              {loadingDelivery ? (
                <span>Đang tính toán...</span>
              ) : deliveryInfo ? (
                <>
                  <span>Giao đến: {currentUserData.addressCity}</span>
                  <strong>Ước tính: {deliveryInfo.time}</strong>
                  <span>(Khoảng cách {deliveryInfo.distance} km)</span>
                </>
              ) : (
                <span>Vui lòng <Link to="/profile/edit">cập nhật vị trí</Link> để ước tính.</span>
              )}
            </div>
          </div>
          {/* --- KẾT THÚC --- */}
          
          {/* ... (Actions: Số lượng & Thêm vào giỏ giữ nguyên) ... */}
          <div className="product-actions">
            <div className="quantity-selector">
              <button onClick={() => handleQuantityChange(-1)}>-</button>
              <span>{quantity}</span>
              <button onClick={() => handleQuantityChange(1)}>+</button>
            </div>
            <button className="btn-add-to-cart" onClick={handleAddToCart}>
              Thêm vào giỏ hàng
            </button>
          </div>
        </div>
      </section>

      {/* ===== SECTION 2: MÔ TẢ & GỢI Ý (MỚI) ===== */}
      <section className="product-extra-details">
        <nav className="details-tabs">
          <button 
            className={`tab-btn ${activeTab === 'description' ? 'active' : ''}`}
            onClick={() => setActiveTab('description')}
          >
            Mô tả Chi tiết
          </button>
          <button 
            className={`tab-btn ${activeTab === 'usage' ? 'active' : ''}`}
            onClick={() => setActiveTab('usage')}
          >
            Cách sử dụng
          </button>
          <button 
            className={`tab-btn ${activeTab === 'recipes' ? 'active' : ''}`}
            onClick={() => setActiveTab('recipes')}
          >
            Gợi ý món ăn
          </button>
        </nav>
        <div className="tab-content">
          {activeTab === 'description' && (
            <div dangerouslySetInnerHTML={{ __html: product.long_description || "Chưa có mô tả chi tiết." }} />
          )}
          {activeTab === 'usage' && (
            <div dangerouslySetInnerHTML={{ __html: product.usage_instructions || "Chưa có hướng dẫn sử dụng." }} />
          )}
          {activeTab === 'recipes' && (
            <div dangerouslySetInnerHTML={{ __html: product.recipe_recommendations || "Chưa có gợi ý món ăn." }} />
          )}
        </div>
      </section>

      {/* ===== SECTION 3: SẢN PHẨM LIÊN QUAN (Giữ nguyên) ===== */}
      <section className="related-products-section">
        <h2>Sản phẩm liên quan</h2>
        <div className="product-grid-shop">
          {relatedProducts.length > 0 ? (
            relatedProducts.map(relProduct => (
              <ProductCard key={relProduct.id} product={relProduct} />
            ))
          ) : (
            <p>Không có sản phẩm liên quan.</p>
          )}
        </div>
      </section>
    </div>
  );
}

export default ProductDetail;
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';
import { BsGlobe, BsLock, BsChatDots, BsFileText } from 'react-icons/bs';
// 1. IMPORT FIREBASE
import { db } from '../firebase'; // Đảm bảo bạn đã import 'db' từ file firebase.js
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

function Home() {
  const [discountProduct, setDiscountProduct] = useState(null);
  const [seasonalProduct, setSeasonalProduct] = useState(null);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHomepageData = async () => {
      try {
        // === Lấy sản phẩm Giảm giá (Section 2) ===
        const discountQuery = query(
          // SỬA Ở ĐÂY: "products" -> "fruit"
          collection(db, "fruits"), 
          where("discount", ">", 0),
          limit(1)
        );
        const discountSnapshot = await getDocs(discountQuery);
        if (!discountSnapshot.empty) {
          const product = discountSnapshot.docs[0];
          setDiscountProduct({ id: product.id, ...product.data() });
        }

        // === Lấy sản phẩm Theo mùa (Section 3) ===
        const currentMonth = new Date().getMonth() + 1;
        const seasonalQuery = query(
          // SỬA Ở ĐÂY: "products" -> "fruit"
          collection(db, "fruits"), 
          where("season_month", "array-contains", currentMonth),
          limit(1)
        );
        const seasonalSnapshot = await getDocs(seasonalQuery);
        if (!seasonalSnapshot.empty) {
          const product = seasonalSnapshot.docs[0];
          setSeasonalProduct({ id: product.id, ...product.data() });
        }

        // === Lấy sản phẩm Nổi bật (Section 4) ===
        const featuredQuery = query(
          // SỬA Ở ĐÂY: "products" -> "fruit"
          collection(db, "fruits"), 
          orderBy("order_count", "desc"),
          limit(3)
        );
        const featuredSnapshot = await getDocs(featuredQuery);
        const productsList = featuredSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFeaturedProducts(productsList);

      } catch (error) {
        console.error("Lỗi khi lấy dữ liệu trang chủ: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHomepageData();
  }, []); 

  if (loading) {
    return <div style={{ padding: '4rem', textAlign: 'center' }}>Đang tải dữ liệu...</div>;
  }

  // ... (Phần return JSX để hiển thị section giữ nguyên như cũ) ...
  // (Nó sẽ tự động hiển thị khi data được load vào state)
  
  return (
    <div className="home-container">
      {/* ... SECTION 1: HERO (Giữ nguyên) ... */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Shop title</h1>
          <p>Exclusieve blog with celebrity interviews, fashion, shopping, bike</p>
          <Link to="/shop" className="btn btn-primary">
           Đến cửa hàng
           </Link>
        </div>
      </section>

      {/* ===== SECTION 2: Trái cây Giảm giá ===== */}
      {discountProduct && (
        <section className="content-section bg-white">
          <div className="text-content">
            <h2>{discountProduct.name} (Giảm giá!)</h2>
            <p>{discountProduct.description}</p>
            <div className="button-group">
              <Link to={`/product/${discountProduct.id}`} className="btn btn-primary">
                Xem chi tiết
              </Link>
              <Link to="/shop?filter=discount" className="btn btn-secondary">
                Xem thêm (Giảm giá)
              </Link>
            </div>
          </div>
          <div className="image-content">
            <img src={discountProduct.image_url} alt={discountProduct.name} />
          </div>
        </section>
      )}

      {/* ===== SECTION 3: Trái cây Theo mùa ===== */}
      {seasonalProduct && (
        <section className="content-section">
          <div className="image-content">
            <img src={seasonalProduct.image_url} alt={seasonalProduct.name} />
          </div>
          <div className="text-content">
            <h2>{seasonalProduct.name} (Đang vào mùa)</h2>
            <p>{seasonalProduct.description}</p>
            <div className="button-group">
              <Link to={`/product/${seasonalProduct.id}`} className="btn btn-primary">
                Xem chi tiết
              </Link>
              <Link to="/shop?filter=seasonal" className="btn btn-secondary">
                Xem thêm (Theo mùa)
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ===== SECTION 4: PRODUCT GRID (Mua nhiều nhất) ===== */}
      {featuredProducts.length > 0 && (
        <section className="product-section">
          <h2 className="section-heading">Dành cho bạn</h2>
          <div className="product-grid">
            {/* Cột trái: Sản phẩm nổi bật nhất */}
            <Link to={`/product/${featuredProducts[0].id}`} className="product-item featured">
              <img src={featuredProducts[0].image_url} alt={featuredProducts[0].name} />
              <h3>{featuredProducts[0].name}</h3>
              <p>{featuredProducts[0].description}</p>
              <p className="price">{featuredProducts[0].price_vnd.toLocaleString('vi-VN')}đ</p>
            </Link>
            
            {/* Cột phải: 2 sản phẩm nhỏ */}
            <div className="product-column-right">
              {featuredProducts[1] && (
                <Link to={`/product/${featuredProducts[1].id}`} className="product-item">
                  <img src={featuredProducts[1].image_url} alt={featuredProducts[1].name} />
                  <h3>{featuredProducts[1].name}</h3>
                  <p>{featuredProducts[1].description.substring(0, 50)}...</p>
                  <p className="price">{featuredProducts[1].price_vnd.toLocaleString('vi-VN')}đ</p>
                </Link>
              )}
              {featuredProducts[2] && (
                <Link to={`/product/${featuredProducts[2].id}`} className="product-item">
                  <img src={featuredProducts[2].image_url} alt={featuredProducts[2].name} />
                  <h3>{featuredProducts[2].name}</h3>
                  <p>{featuredProducts[2].description.substring(0, 50)}...</p>
                  <p className="price">{featuredProducts[2].price_vnd.toLocaleString('vi-VN')}đ</p>
                </Link>
              )}
            </div>
          </div>
        </section>
      )}
      
      {/* ... SECTION 5: FEATURES GRID (Giữ nguyên) ... */}
      <section className="features-section">
        <h2 className="section-heading">Section heading</h2>
        <div className="features-grid">
          <div className="feature-item">
            <div className="icon-wrapper"><BsGlobe /></div>
            <h3>Subheading</h3>
            <p>Body text for whatever you'd like to say. Add main takeaway points, quotes, anecdotes, or even a very very short story.</p>
          </div>
          <div className="feature-item">
            <div className="icon-wrapper"><BsChatDots /></div>
            <h3>Subheading</h3>
            <p>Body text for whatever you'd like to suggest. Add main takeaway points, quotes, anecdotes, or even a very very short story.</p>
          </div>
          <div className="feature-item">
            <div className="icon-wrapper"><BsLock /></div>
            <h3>Subheading</h3>
            <p>Body text for whatever you'd like to claim. Add main takeaway points, quotes, anecdotes, or even a very very short story.</p>
          </div>
          <div className="feature-item">
            <div className="icon-wrapper"><BsFileText /></div>
            <h3>Subheading</h3>
            <p>Body text for whatever you'd like to type. Add main takeaway points, quotes, anecdotes, or even a very very short story.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
// src/pages/Shop.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import './Shop.css';
import ProductCard from '../components/ProductCard/ProductCard';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, startAt, endAt } from 'firebase/firestore';

function Shop() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 1. Lấy filter từ URL
  const [searchParams, setSearchParams] = useSearchParams();
  // 'filter' là state, 'setFilter' là hàm để thay đổi nó VÀ URL
  const [filter, setFilter] = useState(searchParams.get('filter') || 'all');

  // 2. useEffect để tải dữ liệu khi filter hoặc search thay đổi
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        // Tạo câu truy vấn (query) cơ bản
        let q = collection(db, "fruits");
        let queries = [];

        // 3. Xây dựng truy vấn (query) động
        
        // ---- A. Lọc theo Filter ----
        if (filter === 'discount') {
          queries.push(where("discount", ">", 0));
        } else if (filter === 'seasonal') {
          const currentMonth = new Date().getMonth() + 1;
          queries.push(where("season_month", "array-contains", currentMonth));
        }
        // (Lưu ý: 'history' và 'recent_sellers' rất phức tạp, 
        // cần user đăng nhập. Chúng ta sẽ thêm sau khi có Authentication)

        // ---- B. Lọc theo Search Term ----
        if (searchTerm) {
          // Firestore search cơ bản (chỉ tìm 'startsWith')
          // Để tìm kiếm 'contains', cần dịch vụ bên thứ 3 như Algolia
          queries.push(orderBy("name"));
          queries.push(startAt(searchTerm));
          queries.push(endAt(searchTerm + '\uf8ff'));
        }

        // ---- C. Kết hợp truy vấn ----
        const finalQuery = query(q, ...queries);
        
        const querySnapshot = await getDocs(finalQuery);
        const productsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProducts(productsData);

      } catch (error) {
        console.error("Lỗi khi tải sản phẩm: ", error);
        // Kiểm tra F12 Console để xem lỗi 'requires an index'
      }
      setLoading(false);
    };

    fetchProducts();
  }, [filter, searchTerm]); // Tải lại khi 'filter' hoặc 'searchTerm' thay đổi

  // 4. Hàm để cập nhật filter
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter); // Cập nhật state
    setSearchParams({ filter: newFilter }); // Cập nhật URL
  }

  return (
    <div className="shop-container">
      {/* 1. Sidebar Lọc */}
      <aside className="shop-sidebar">
        <h4>Phân loại</h4>
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`} 
          onClick={() => handleFilterChange('all')}>
          Tất cả sản phẩm
        </button>
        <button 
          className={`filter-btn ${filter === 'discount' ? 'active' : ''}`} 
          onClick={() => handleFilterChange('discount')}>
          Đang Giảm giá
        </button>
        <button 
          className={`filter-btn ${filter === 'seasonal' ? 'active' : ''}`} 
          onClick={() => handleFilterChange('seasonal')}>
          Theo mùa
        </button>
        
        {/* Các filter nâng cao (cần đăng nhập) */}
        <button className="filter-btn disabled" disabled>Lịch sử mua hàng</button>
        <button className="filter-btn disabled" disabled>Từ người bán quen</button>
      </aside>

      {/* 2. Khu vực Sản phẩm */}
      <main className="shop-main">
        {/* Thanh Search */}
        <div className="search-bar">
          <input 
            type="text" 
            placeholder="Tìm kiếm trái cây..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Lưới sản phẩm */}
        {loading ? (
          <p>Đang tải...</p>
        ) : (
          <div className="product-grid-shop">
            {products.length > 0 ? (
              products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <p>Không tìm thấy sản phẩm nào.</p>
            )}
          </div>
        )}

        {/* 3. Phân trang (Pagination) - Sẽ thêm logic sau */}
        <div className="pagination">
          <button disabled>&laquo;</button>
          <button className="active">1</button>
          <button>2</button>
          <button>3</button>
          <button>&raquo;</button>
        </div>
      </main>
    </div>
  );
}

export default Shop;
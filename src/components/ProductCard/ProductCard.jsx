// src/components/ProductCard/ProductCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './ProductCard.css';

function ProductCard({ product }) {
  // 'product' là dữ liệu (props) được truyền từ trang Shop.jsx
  
  // Tính giá sau khi giảm giá (nếu có)
  const price = product.price_vnd;
  const discount = product.discount || 0;
  const finalPrice = price - (price * discount / 100);

  return (
    <Link to={`/product/${product.id}`} className="product-card">
      <div className="product-card-image-wrapper">
        <img src={product.image_url} alt={product.name} className="product-card-image" />
        {discount > 0 && (
          <div className="product-card-discount-badge">-{discount}%</div>
        )}
      </div>
      <div className="product-card-content">
        <h3 className="product-card-title">{product.name}</h3>
        <div className="product-card-prices">
          {discount > 0 && (
            <span className="product-card-original-price">
              {price.toLocaleString('vi-VN')}đ
            </span>
          )}
          <span className="product-card-final-price">
            {finalPrice.toLocaleString('vi-VN')}đ
          </span>
        </div>
      </div>
    </Link>
  );
}

export default ProductCard;
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, collection } from 'firebase/firestore'; // Import đã cập nhật
import './History.css'; // <-- Tái sử dụng CSS

// Hàm lấy thông tin 1 user (cache đơn giản)
const userCache = new Map();
const getUserProfile = async (userId) => {
  if (userCache.has(userId)) {
    return userCache.get(userId);
  }
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const userData = userSnap.data();
    userCache.set(userId, userData);
    return userData;
  }
  return null;
};

function OrderDetailPage() {
  const { orderId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- THÊM STATE MỚI ---
  const [buyerProfile, setBuyerProfile] = useState(null);
  const [sellerProfiles, setSellerProfiles] = useState({}); // Dùng object/map

  useEffect(() => {
    if (!orderId || !currentUser) {
      setLoading(false);
      return;
    }

    const fetchOrderAndProfiles = async () => {
      setLoading(true);
      setError(null);
      const orderRef = doc(db, "orders", orderId);
      const docSnap = await getDoc(orderRef);

      if (docSnap.exists()) {
        const orderData = docSnap.data();

        // --- KIỂM TRA BẢO MẬT ---
        const isBuyer = orderData.buyer_id === currentUser.uid;
        const isSeller = orderData.seller_ids.includes(currentUser.uid);

        if (isBuyer || isSeller) {
          setOrder(orderData);
          
          // --- TẢI HỒ SƠ CÁC BÊN LIÊN QUAN ---
          try {
            // Tải hồ sơ người mua
            const buyerData = await getUserProfile(orderData.buyer_id);
            setBuyerProfile(buyerData);

            // Tải hồ sơ tất cả người bán
            const sellerPromises = orderData.seller_ids.map(id => getUserProfile(id));
            const sellers = await Promise.all(sellerPromises);
            
            const sellersMap = {};
            sellers.forEach((sellerData, index) => {
              if (sellerData) {
                const sellerId = orderData.seller_ids[index];
                sellersMap[sellerId] = sellerData;
              }
            });
            setSellerProfiles(sellersMap);

          } catch (profileError) {
            console.error("Lỗi khi tải hồ sơ: ", profileError);
            setError("Lỗi khi tải thông tin người dùng.");
          }
        } else {
          setError("Bạn không có quyền xem đơn hàng này.");
        }
      } else {
        setError("Không tìm thấy đơn hàng.");
      }
      setLoading(false);
    };

    fetchOrderAndProfiles();
  }, [orderId, currentUser]);

  // Hàm render trạng thái (từ file cũ)
  const renderStatus = (status) => {
    switch (status) {
      case 'pending': return <span className="status status-pending">Đang xử lý</span>;
      case 'shipping': return <span className="status status-shipping">Đang giao</span>;
      case 'completed': return <span className="status status-completed">Đã hoàn thành</span>;
      case 'cancelled': return <span className="status status-cancelled">Đã hủy</span>;
      default: return <span className="status">{status}</span>;
    }
  };

  if (loading) {
    return <div className="order-history-container">Đang tải chi tiết đơn hàng...</div>;
  }
  if (error) {
    return (
      <div className="order-history-container">
        <h2>Lỗi: {error}</h2>
        <Link to="/history">Quay lại lịch sử</Link>
      </div>
    );
  }
  if (!order) {
    return null;
  }

  return (
    <div className="order-history-container">
      <div className="order-detail-header">
        <h1>Chi tiết Đơn hàng #{orderId.substring(0, 6)}...</h1>
        {renderStatus(order.status)}
      </div>
      
      <p>Ngày đặt: {new Date(order.createdAt.seconds * 1000).toLocaleString('vi-VN')}</p>
      
      {/* --- THÊM MỚI: THÔNG TIN CÁC BÊN --- */}
      <div className="order-participants">
        <div className="participant-box">
          <h4>Người Mua</h4>
          {buyerProfile ? (
            <Link to={`/profile/${buyerProfile.uid}`} className="participant-link">
              <img 
                src={buyerProfile.avatarUrl || 'https://placehold.co/50x50/f0f0f0/ccc?text=Ava'} 
                alt={buyerProfile.displayName} 
              />
              <span>{buyerProfile.displayName}</span>
            </Link>
          ) : <p>Đang tải...</p>}
        </div>
        <div className="participant-box">
          <h4>Địa chỉ Giao hàng</h4>
          <p>{order.buyer_address || "Không có địa chỉ"}</p>
        </div>
      </div>
      
      {/* KHU VỰC CHI TIẾT SẢN PHẨM */}
      <div className="order-list">
        <h3>Các sản phẩm</h3>
        <table>
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th>Số lượng</th>
              <th>Giá</th>
              <th>Tạm tính</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map(item => {
              const itemPrice = item.price_vnd - (item.price_vnd * (item.discount || 0) / 100);
              // Lấy thông tin người bán cho item này
              const seller = sellerProfiles[item.seller_id];
              return (
                <tr key={item.product_id}>
                  <td>
                    <div className="order-item-summary">
                      <img src={item.image_url} alt={item.name} className="item-thumbnail" />
                      <div className="item-info">
                        <Link to={`/product/${item.product_id}`} className="item-name-link">
                          {item.name}
                        </Link>
                        {/* --- THÊM MỚI: TÊN NGƯỜI BÁN --- */}
                        {seller ? (
                          <small className="item-seller-info">
                            Bán bởi: 
                            <Link to={`/profile/${seller.uid}`}>
                              {seller.displayName}
                            </Link>
                          </small>
                        ) : <small>Đang tải...</small>}
                      </div>
                    </div>
                  </td>
                  <td>x {item.quantity}</td>
                  <td>{itemPrice.toLocaleString('vi-VN')}đ</td>
                  <td>{(itemPrice * item.quantity).toLocaleString('vi-VN')}đ</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* KHU VỰC TÓM TẮT THANH TOÁN (từ file cũ) */}
      <div className="order-summary-box">
        <h3>Tóm tắt Thanh toán</h3>
        <div className="summary-row">
          <span>Tạm tính</span>
          <span>{order.subtotal_price.toLocaleString('vi-Vn')}đ</span>
        </div>
        <div className="summary-row">
          <span>Phí vận chuyển</span>
          <span>{order.shipping_price.toLocaleString('vi-VN')}đ</span>
        </div>
        <hr />
        <div className="summary-row total">
          <span>Tổng cộng</span>
          <span>{order.total_price.toLocaleString('vi-VN')}đ</span>
        </div>
      </div>
    </div>
  );
}

export default OrderDetailPage;
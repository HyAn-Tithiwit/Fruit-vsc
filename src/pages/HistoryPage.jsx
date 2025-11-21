import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import './History.css';
// 1. IMPORT CÁC ICON MỚI
import { 
  BsArchive, 
  BsClockHistory, 
  BsTruck, 
  BsCheckCircle, 
  BsXCircle 
} from 'react-icons/bs';

function HistoryPage() {
  const { currentUser, currentUserData } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 2. THÊM STATE CHO TAB HIỆN TẠI
  // 'all', 'pending', 'shipping', 'completed', 'cancelled'
  const [activeStatus, setActiveStatus] = useState('all');

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // 3. XÂY DỰNG TRUY VẤN (QUERY) ĐỘNG
    let queryConstraints = []; // Mảng chứa các điều kiện

    // 3a. Lọc theo Vai trò (Role)
    if (currentUserData.role === 'buyer') {
      queryConstraints.push(where("buyer_id", "==", currentUser.uid));
    } else {
      queryConstraints.push(where("seller_ids", "array-contains", currentUser.uid));
    }

    // 3b. Lọc theo Trạng thái (Status) - NẾU KHÔNG PHẢI 'all'
    if (activeStatus !== 'all') {
      queryConstraints.push(where("status", "==", activeStatus));
    }
    
    // 3c. Sắp xếp
    queryConstraints.push(orderBy("createdAt", "desc"));

    // 3d. Tạo truy vấn cuối cùng
    const q = query(collection(db, "orders"), ...queryConstraints);

    // 4. Lắng nghe thay đổi
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersData = [];
      querySnapshot.forEach((doc) => {
        ordersData.push({ id: doc.id, ...doc.data() });
      });
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      console.error("Lỗi khi tải lịch sử đơn hàng: ", error);
      // QUAN TRỌNG: Lỗi này 99% là lỗi thiếu Index. Xem F12 > Console.
      setLoading(false);
    });

    // Cleanup listener
    return () => unsubscribe();
    
  // 5. CHẠY LẠI EFFECT KHI TAB THAY ĐỔI
  }, [currentUser, currentUserData, activeStatus]);

  // Hàm render trạng thái (giữ nguyên)
  const renderStatus = (status) => {
    switch (status) {
      case 'pending': return <span className="status status-pending">Đang xử lý</span>;
      case 'shipping': return <span className="status status-shipping">Đang giao</span>;
      case 'completed': return <span className="status status-completed">Đã hoàn thành</span>;
      case 'cancelled': return <span className="status status-cancelled">Đã hủy</span>;
      default: return <span className="status">{status}</span>;
    }
  };

  if (!currentUser) {
    return <div className="order-history-container">Vui lòng <Link to="/login">đăng nhập</Link> để xem lịch sử.</div>;
  }

  return (
    <div className="order-history-container">
      <h1>Lịch sử Giao dịch</h1>
      <p>Bạn là: <strong>{currentUserData.role === 'buyer' ? 'Người Mua' : 'Người Bán'}</strong></p>
      
      {/* 6. THÊM CÁC TAB LỌC */}
      <div className="history-tabs">
        <button 
          className={`tab-button ${activeStatus === 'all' ? 'active' : ''}`}
          onClick={() => setActiveStatus('all')}
        >
          <BsArchive /> Tất cả
        </button>
        <button 
          className={`tab-button ${activeStatus === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveStatus('pending')}
        >
          <BsClockHistory /> Chờ xử lý
        </button>
        <button 
          className={`tab-button ${activeStatus === 'shipping' ? 'active' : ''}`}
          onClick={() => setActiveStatus('shipping')}
        >
          <BsTruck /> Đang giao
        </button>
        <button 
          className={`tab-button ${activeStatus === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveStatus('completed')}
        >
          <BsCheckCircle /> Đã hoàn thành
        </button>
        <button 
          className={`tab-button ${activeStatus === 'cancelled' ? 'active' : ''}`}
          onClick={() => setActiveStatus('cancelled')}
        >
          <BsXCircle /> Đã hủy
        </button>
      </div>
      
      <div className="order-list">
        {loading ? (
          <p>Đang tải đơn hàng...</p>
        ) : orders.length === 0 ? (
          <p>Không có đơn hàng nào.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Mã Đơn Hàng</th>
                <th>Ngày Đặt</th>
                <th>Sản Phẩm</th>
                <th>Tổng Tiền</th>
                <th>Trạng Thái</th>
                <th>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td className="order-id">#{order.id.substring(0, 6)}...</td>
                  <td>{new Date(order.createdAt.seconds * 1000).toLocaleDateString('vi-VN')}</td>
                  <td>
                    {order.items.map(item => (
                      <div key={item.product_id} className="order-item-summary">
                        {item.name} (x{item.quantity})
                      </div>
                    ))}
                  </td>
                  <td>{order.total_price.toLocaleString('vi-VN')}đ</td>
                  <td>{renderStatus(order.status)}</td>
                  <td>
                    {/* SỬA DÒNG NÀY */}
                    <Link to={`/history/${order.id}`} className="btn-view-detail">
                      Xem
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default HistoryPage;
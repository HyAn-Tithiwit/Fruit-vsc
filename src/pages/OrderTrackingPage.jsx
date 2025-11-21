import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
// 1. THÊM 'updateDoc' và 'doc'
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import './History.css'; // Chúng ta dùng chung CSS với trang History

function OrderTrackingPage() {
  const { currentUser, currentUserData } = useAuth();
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let q;
    const activeStatuses = ['pending', 'shipping']; // Chỉ lấy đơn đang xử lý hoặc đang giao

    if (currentUserData.role === 'buyer') {
      q = query(
        collection(db, "orders"),
        where("buyer_id", "==", currentUser.uid),
        where("status", "in", activeStatuses), // Lọc theo trạng thái
        orderBy("createdAt", "desc")
      );
    } else {
      q = query(
        collection(db, "orders"),
        where("seller_ids", "array-contains", currentUser.uid),
        where("status", "in", activeStatuses), // Lọc theo trạng thái
        orderBy("createdAt", "desc")
      );
    }

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersData = [];
      querySnapshot.forEach((doc) => {
        ordersData.push({ id: doc.id, ...doc.data() });
      });
      setActiveOrders(ordersData);
      setLoading(false);
    }, (error) => {
      console.error("Lỗi khi tải đơn hàng đang hoạt động: ", error);
      // Bạn sẽ cần tạo Index mới cho truy vấn kết hợp này!
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, currentUserData]);
  
  // Hàm render trạng thái (giống hệt HistoryPage)
  const renderStatus = (status) => {
    switch (status) {
      case 'pending': return <span className="status status-pending">Đang xử lý</span>;
      case 'shipping': return <span className="status status-shipping">Đang giao</span>;
      default: return <span className="status">{status}</span>;
    }
  };

  // 2. THÊM HÀM HỦY ĐƠN HÀNG
  const handleCancelOrder = async (orderId) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        status: "cancelled" // Cập nhật trạng thái
      });
      // onSnapshot sẽ tự động nhận biết thay đổi và
      // đơn hàng này sẽ biến mất khỏi danh sách "đang hoạt động"
    } catch (error) {
      console.error("Lỗi khi hủy đơn hàng: ", error);
    }
  };

  if (loading) {
    return <div className="order-history-container">Đang tải đơn hàng...</div>;
  }

  return (
    <div className="order-history-container">
      <h1>Theo dõi Đơn hàng Hiện tại</h1>
      <p>Các đơn hàng đang được xử lý hoặc đang trên đường giao.</p>
      
      <div className="order-list">
        {activeOrders.length === 0 ? (
          <p>Không có đơn hàng nào đang hoạt động.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Mã Đơn Hàng</th>
                <th>Ngày Đặt</th>
                <th>Trạng Thái</th>
                <th>Tổng Tiền</th>
                <th>Theo dõi (Map)</th>
                <th>Hành động</th> {/* 3. THÊM CỘT MỚI */}
              </tr>
            </thead>
            <tbody>
              {activeOrders.map(order => (
                <tr key={order.id}>
                  <td className="order-id">#{order.id.substring(0, 6)}...</td>
                  <td>{new Date(order.createdAt.seconds * 1000).toLocaleDateString('vi-VN')}</td>
                  <td>{renderStatus(order.status)}</td>
                  <td>{order.total_price.toLocaleString('vi-VN')}đ</td>
                  <td>
                    {/* Đây là nơi sẽ dẫn đến trang bản đồ */}
                    <Link to={`/tracking/${order.id}`} className="btn-view-detail">
                      Theo dõi
                    </Link>
                  </td>
                  {/* 4. THÊM NÚT HỦY (CÓ ĐIỀU KIỆN) */}
                  <td>
                    {/* Cả người mua và người bán đều thấy nút này,
                        miễn là đơn hàng còn 'pending'
                    */}
                    {order.status === 'pending' && (
                      <button 
                        onClick={() => handleCancelOrder(order.id)} 
                        className="btn-cancel">
                        Hủy đơn
                      </button>
                    )}
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

export default OrderTrackingPage; 
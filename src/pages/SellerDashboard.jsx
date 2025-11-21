import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import './SellerDashboard.css'; // Sẽ tạo ở Bước 2
import { BsBoxSeam, BsGraphUp, BsWallet2, BsPlusCircle } from 'react-icons/bs';

function SellerDashboard() {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({ totalRevenue: 0, totalOrders: 0, totalProducts: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    
    setLoading(true);

    // 1. Lắng nghe đơn hàng (để tính Doanh thu & Số đơn)
    const ordersQuery = query(
      collection(db, "orders"),
      where("seller_ids", "array-contains", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribeOrders = onSnapshot(ordersQuery, (querySnapshot) => {
      let totalRevenue = 0;
      const ordersData = [];
      
      querySnapshot.forEach((doc) => {
        const order = doc.data();
        ordersData.push({ id: doc.id, ...order });
        
        // Giả định: Doanh thu = tổng tiền của các đơn đã hoàn thành
        // (Để tính chính xác hơn, bạn cần duyệt qua 'items' và 'seller_id' của từng item)
        if (order.status === 'completed') {
          totalRevenue += order.total_price;
        }
      });
      
      setRecentOrders(ordersData.slice(0, 5)); // Lấy 5 đơn hàng mới nhất
      setStats(prev => ({ ...prev, totalRevenue: totalRevenue, totalOrders: querySnapshot.size }));
      setLoading(false);

    }, (error) => {
      console.error("Lỗi khi tải đơn hàng: ", error);
      // Lỗi này RẤT CÓ THỂ là lỗi thiếu Index. Hãy kiểm tra F12 > Console.
      setLoading(false);
    });

    // 2. Lắng nghe sản phẩm (để đếm)
    const productsQuery = query(
      collection(db, "fruits"),
      where("seller_id", "==", currentUser.uid)
    );

    const unsubscribeProducts = onSnapshot(productsQuery, (prodSnapshot) => {
      setStats(prev => ({ ...prev, totalProducts: prodSnapshot.size }));
    });

    // Cleanup listeners
    return () => {
      unsubscribeOrders();
      unsubscribeProducts();
    };
  }, [currentUser]);

  // Hàm render trạng thái (giống HistoryPage)
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
    return <div className="dashboard-container">Đang tải bảng điều khiển...</div>;
  }

  return (
    <div className="dashboard-container">
      <h1>Bảng điều khiển của Người Bán</h1>
      
      {/* 1. KHU VỰC THỐNG KÊ */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <BsGraphUp className="stat-icon" style={{ color: '#27ae60' }} />
          <h3>Tổng Doanh thu</h3>
          <p>{stats.totalRevenue.toLocaleString('vi-VN')}đ</p>
          <span>(Từ các đơn đã hoàn thành)</span>
        </div>
        <div className="stat-card">
          <BsWallet2 className="stat-icon" style={{ color: '#2980b9' }} />
          <h3>Tổng Đơn hàng</h3>
          <p>{stats.totalOrders}</p>
          <span>(Tất cả trạng thái)</span>
        </div>
        <div className="stat-card">
          <BsBoxSeam className="stat-icon" style={{ color: '#f39c12' }} />
          <h3>Tổng Sản phẩm</h3>
          <p>{stats.totalProducts}</p>
          <span>(Đang đăng bán)</span>
        </div>
      </div>
      
      {/* 2. KHU VỰC LỐI TẮT (QUICK ACTIONS) */}
      <div className="dashboard-actions">
        <Link to="/my-products" className="action-card">
          <BsPlusCircle />
          <span>Đăng sản phẩm mới</span>
        </Link>
        <Link to="/order" className="action-card">
          <span>Xem đơn hàng đang hoạt động</span>
        </Link>
        <Link to="/profile/edit" className="action-card">
          <span>Chỉnh sửa hồ sơ cửa hàng</span>
        </Link>
      </div>

      {/* 3. KHU VỰC ĐƠN HÀNG GẦN ĐÂY */}
      <div className="dashboard-recent-orders">
        <h2>Đơn hàng gần đây</h2>
        <table>
          <thead>
            <tr>
              <th>Mã Đơn Hàng</th>
              <th>Ngày Đặt</th>
              <th>Tổng Tiền</th>
              <th>Trạng Thái</th>
              <th>Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center' }}>Chưa có đơn hàng nào.</td>
              </tr>
            ) : (
              recentOrders.map(order => (
                <tr key={order.id}>
                  <td className="order-id">#{order.id.substring(0, 6)}...</td>
                  <td>{new Date(order.createdAt.seconds * 1000).toLocaleDateString('vi-VN')}</td>
                  <td>{order.total_price.toLocaleString('vi-VN')}đ</td>
                  <td>{renderStatus(order.status)}</td>
                  <td>
                    <Link to={`/order/${order.id}`} className="btn-view-detail">
                      Xem
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SellerDashboard;
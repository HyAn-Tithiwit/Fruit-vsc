import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './TrackingPage.css'; 
import { getDistanceFromLatLonInKm } from '../utils/geography'; // Import hàm tính khoảng cách

// --- (Code sửa lỗi Icon giữ nguyên) ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
// --- (Code shipperIcon giữ nguyên) ---
const shipperIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448609.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40]
});

// --- HÀM MỚI: TÌM BƯỚC GẦN NHẤT TRÊN TUYẾN ĐƯỜNG ---
const findClosestStep = (currentLoc, routeArray) => {
  if (!currentLoc || !routeArray || routeArray.length === 0) return 0;
  
  let closestIndex = 0;
  let minDistance = Infinity;

  for (let i = 0; i < routeArray.length; i++) {
    const routePoint = routeArray[i]; // [lat, lng]
    const distance = getDistanceFromLatLonInKm(
      currentLoc.lat, currentLoc.lng, routePoint[0], routePoint[1]
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = i;
    }
  }
  return closestIndex;
};


function TrackingPage() {
  const { orderId } = useParams();
  const { currentUser, currentUserData } = useAuth();
  const [order, setOrder] = useState(null);
  const [shipperPos, setShipperPos] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [route, setRoute] = useState([]);
  const simulationInterval = useRef(null);
  
  // --- STATE MỚI CHO ETA ---
  const [totalDuration, setTotalDuration] = useState(0); // Tổng thời gian (giây)
  const [currentStepIndex, setCurrentStepIndex] = useState(0); // Vị trí shipper
  const [etaMinutes, setEtaMinutes] = useState(0); // Thời gian (phút)

  // Hàm mới: Gọi OSRM (Cập nhật để lưu totalDuration)
  const fetchRoute = async (sellerLoc, buyerLoc) => {
    const url = `https://router.project-osrm.org/route/v1/driving/${sellerLoc.lng},${sellerLoc.lat};${buyerLoc.lng},${buyerLoc.lat}?overview=full&geometries=geojson`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const leafletCoords = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
        setRoute(leafletCoords);
        
        // --- THÊM MỚI: LƯU TỔNG THỜI GIAN ---
        setTotalDuration(data.routes[0].duration); // (tính bằng giây)
      }
    } catch (error) {
      console.error("Lỗi khi lấy đường đi OSRM: ", error);
      // Nếu lỗi, vẽ đường thẳng (dự phòng)
      setRoute([
        [sellerLoc.lat, sellerLoc.lng],
        [buyerLoc.lat, buyerLoc.lng]
      ]);
    }
  };

  // 1. Lắng nghe đơn hàng (Cập nhật để tìm stepIndex)
  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    const orderRef = doc(db, "orders", orderId);
    
    const unsubscribe = onSnapshot(orderRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setOrder(data);

        const sellerLoc = data.seller_locations_map?.[data.seller_ids[0]];
        const buyerLoc = data.buyer_location;
        const shipperLoc = data.current_shipper_location;

        if (shipperLoc) {
          setShipperPos([shipperLoc.lat, shipperLoc.lng]);
        }
        
        // Chỉ gọi API OSRM một lần khi tải trang
        if (sellerLoc && buyerLoc && route.length === 0) {
          fetchRoute(sellerLoc, buyerLoc);
        }
        
        // --- THÊM MỚI: TÌM BƯỚC HIỆN TẠI ---
        // Khi route đã tải và có vị trí shipper, tìm xem shipper đang ở bước nào
        if (route.length > 0 && shipperLoc) {
          const closestStep = findClosestStep(shipperLoc, route);
          setCurrentStepIndex(closestStep);
        }

      } else {
        console.error("Không tìm thấy đơn hàng!");
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
      }
    };
  }, [orderId, route.length]); // Chạy lại khi route được tải xong

  // --- EFFECT MỚI: TÍNH TOÁN ETA ---
  useEffect(() => {
    if (route.length > 0 && totalDuration > 0) {
      const totalSteps = route.length;
      if (totalSteps === 0) return;

      const stepsRemaining = totalSteps - currentStepIndex;
      const percentageRemaining = stepsRemaining / totalSteps;
      
      const secondsRemaining = totalDuration * percentageRemaining;
      setEtaMinutes(Math.round(secondsRemaining / 60)); // Chuyển sang phút
    }
  }, [currentStepIndex, totalDuration, route]); // Tính lại mỗi khi shipper di chuyển

  // 2. Hàm mô phỏng giao hàng (Cập nhật để dùng state)
  const startSimulation = () => {
    if (!order || route.length === 0) {
      alert("Đường đi chưa được tải, không thể mô phỏng.");
      return;
    }
    if (simulationInterval.current) {
      clearInterval(simulationInterval.current);
    }

    let stepIndex = currentStepIndex; // Bắt đầu từ vị trí hiện tại

    simulationInterval.current = setInterval(async () => {
      if (stepIndex >= route.length - 1) { // Dừng ở điểm cuối
        clearInterval(simulationInterval.current);
        simulationInterval.current = null;
        const orderRef = doc(db, "orders", orderId);
        await updateDoc(orderRef, { status: "completed" });
        return;
      }
      
      stepIndex += 1; // Di chuyển đến điểm tiếp theo
      const currentPos = route[stepIndex];
      const newPos = { lat: currentPos[0], lng: currentPos[1] };
      
      // Cập nhật vị trí lên Firestore
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, { current_shipper_location: newPos });
      // onSnapshot sẽ tự động bắt thay đổi này và cập nhật state (shipperPos, currentStepIndex)
      
    }, 2000);
  };
  
  // 3. Hàm "Gửi hàng" (Cập nhật để đặt vị trí ban đầu)
  const handleShipOrder = async () => {
    if (!order || !route.length > 0) {
      alert("Đường đi chưa được tải, không thể gửi hàng.");
      return;
    }
    
    // Lấy điểm bắt đầu của route
    const startPos = { lat: route[0][0], lng: route[0][1] };
    
    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, {
      status: "shipping",
      current_shipper_location: startPos // Bắt đầu từ điểm đầu tiên trên route
    });
  };

  if (loading) return <div className="tracking-container">Đang tải bản đồ...</div>;
  if (!order) return <div className="tracking-container">Không tìm thấy đơn hàng.</div>;
  
  const sellerLoc = order?.seller_locations_map?.[order.seller_ids[0]];
  const buyerLoc = order?.buyer_location;
  const mapCenter = sellerLoc ? [sellerLoc.lat, sellerLoc.lng] : (buyerLoc ? [buyerLoc.lat, buyerLoc.lng] : [21.02, 105.8]);

  return (
    <div className="tracking-container">
      <h1>Theo dõi Đơn hàng #{orderId.substring(0, 6)}...</h1>
      <div className="tracking-layout">
        <div className="map-wrapper">
          {/* MapContainer và TileLayer (Giữ nguyên) */}
          <MapContainer center={mapCenter} zoom={13} scrollWheelZoom={true}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* Vị trí Người Bán (Điểm đi) */}
            {sellerLoc && (
              <Marker position={[sellerLoc.lat, sellerLoc.lng]}>
                <Popup>Điểm lấy hàng (Người Bán)</Popup>
              </Marker>
            )}
            
            {/* Vị trí Người Mua (Điểm đến) */}
            {buyerLoc && (
              <Marker position={[buyerLoc.lat, buyerLoc.lng]}>
                <Popup>Điểm giao hàng (Bạn)</Popup>
              </Marker>
            )}
            
            {/* Vị trí Shipper (Di chuyển) */}
            {shipperPos && order.status === 'shipping' && (
              <Marker position={shipperPos} icon={shipperIcon}>
                <Popup>Shipper đang ở đây</Popup>
              </Marker>
            )}
            
            {/* Đường kẻ (Giữ nguyên) */}
            {route.length > 0 && (
              <Polyline positions={route} color="blue" />
            )}
          </MapContainer>
        </div>
        
        <div className="info-panel">
          <h3>Thông tin Đơn hàng</h3>
          <p>Trạng thái: <strong>{order.status}</strong></p>
          <p>Tổng tiền: {order.total_price.toLocaleString('vi-VN')}đ</p>
          
          {/* --- THÊM MỚI: HIỂN THỊ ETA --- */}
          {order.status === 'shipping' && (
            <div className="eta-box">
              <span>Ước tính (ETA)</span>
              <strong>{etaMinutes} phút</strong>
            </div>
          )}
          {/* --- KẾT THÚC --- */}
          
          <hr />
          
          {/* Các nút bấm (Giữ nguyên) */}
          {currentUserData?.role === 'seller' && order.status === 'pending' && (
            <button onClick={handleShipOrder} className="btn-action btn-ship">
              Xác nhận Gửi hàng
            </button>
          )}
          
          {order.status === 'shipping' && (
            <button onClick={startSimulation} className="btn-action btn-simulate" disabled={!!simulationInterval.current}>
              Mô phỏng Giao hàng
            </button>
          )}
          
          {order.status === 'completed' && (
            <p>Đơn hàng đã giao thành công!</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default TrackingPage;
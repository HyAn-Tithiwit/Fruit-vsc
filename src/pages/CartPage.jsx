import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { 
  collection, 
  doc, 
  onSnapshot, 
  deleteDoc, 
  updateDoc, 
  addDoc, 
  writeBatch,
  getDoc // MỚI: để lấy thông tin user
} from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import './Cart.css';
import { BsTrash } from 'react-icons/bs';
import { getDistanceFromLatLonInKm } from '../utils/geography'; // MỚI

// Đơn giá vận chuyển (ví dụ: 2000đ / km)
const SHIPPING_RATE_PER_KM = 2000;
const BASE_SHIPPING_FEE = 15000; // Phí cố định

function CartPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // MỚI: State cho địa chỉ và vận chuyển
  const [buyerData, setBuyerData] = useState(null); // Lưu { addressStreet, location: {lat, lng} }
  const [sellerLocations, setSellerLocations] = useState({}); // Lưu { sellerId: {lat, lng}, ... }
  const [shippingOptions, setShippingOptions] = useState({}); // Lưu { sellerId: 'regular', ... }

  // 1. Tải giỏ hàng VÀ địa chỉ người mua
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    // Tải thông tin người mua (địa chỉ, tọa độ)
    const fetchBuyerData = async () => {
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        setBuyerData(userDocSnap.data());
      }
    };
    fetchBuyerData();

    // Tải giỏ hàng (real-time)
    const cartItemsRef = collection(db, "carts", currentUser.uid, "items");
    const unsubscribe = onSnapshot(cartItemsRef, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCartItems(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // 2. Nhóm các sản phẩm theo seller_id
  const itemsBySeller = useMemo(() => {
    return cartItems.reduce((acc, item) => {
      const sellerId = item.seller_id;
      if (!acc[sellerId]) {
        acc[sellerId] = { items: [], sellerName: 'Đang tải...' };
      }
      acc[sellerId].items.push(item);
      return acc;
    }, {});
  }, [cartItems]);

  // 3. Tải tọa độ của các người bán
  useEffect(() => {
    const sellerIds = Object.keys(itemsBySeller);
    if (sellerIds.length === 0 || !buyerData) return;

    const fetchSellerLocations = async () => {
      const locations = {};
      const initialOptions = {};
      const updatedItemsBySeller = { ...itemsBySeller };

      for (const sellerId of sellerIds) {
        // Tải tọa độ
        const userDocRef = doc(db, "users", sellerId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const sellerData = userDocSnap.data();
          locations[sellerId] = {
            location: sellerData.location,
            name: sellerData.displayName || sellerId
          };
          
          // Cập nhật tên người bán trong list
          updatedItemsBySeller[sellerId].sellerName = sellerData.displayName || sellerId;
        }
        // Đặt ship mặc định là 'regular'
        initialOptions[sellerId] = 'regular'; 
      }
      setSellerLocations(locations);
      setShippingOptions(initialOptions);
    };

    fetchSellerLocations();
  }, [itemsBySeller, buyerData]); // Chạy khi có giỏ hàng VÀ có data người mua

  // 4. Tính toán khoảng cách và phí ship (ĐÃ CẬP NHẬT)
  const shippingCosts = useMemo(() => {
    const costs = {};
    for (const sellerId in itemsBySeller) {
      const buyerLoc = buyerData?.location;
      const sellerLoc = sellerLocations[sellerId]?.location;
      
      if (buyerLoc && sellerLoc) {
        const distance = getDistanceFromLatLonInKm(
          buyerLoc.lat, buyerLoc.lng, sellerLoc.lat, sellerLoc.lng
        );

        // --- BẮT ĐẦU THAY ĐỔI LOGIC TÍNH PHÍ ---

        // 1. Tính phí cơ bản (baseFee)
        let baseFee;
        if (distance <= 1) {
          // Nếu dưới 1km, phí cố định 15k
          baseFee = 15000;
        } else {
          // Nếu trên 1km, phí = 15k + (phí mỗi km * km)
          // Lưu ý: Phí theo km không nhân multiplier ở đây
          baseFee = 15000 + (SHIPPING_RATE_PER_KM * distance);
        }

        // 2. Lấy hệ số nhân (multiplier)
        const multiplier = {
          regular: 1,
          fast: 1.25,
          express: 1.5
        }[shippingOptions[sellerId] || 'regular'];

        // 3. Phí cuối cùng = Phí cơ bản * Hệ số nhân
        const fee = baseFee * multiplier;

        // --- KẾT THÚC THAY ĐỔI LOGIC ---

        costs[sellerId] = { distance: distance.toFixed(1), fee: Math.round(fee) };
      } else {
        costs[sellerId] = { distance: 'N/A', fee: 0 }; // Giữ nguyên nếu không có tọa độ
      }
    }
    return costs;
  }, [buyerData, sellerLocations, shippingOptions, itemsBySeller]);

  // 5. Tính tổng tiền
  const subtotal = cartItems.reduce((sum, item) => {
    const price = item.price_vnd - (item.price_vnd * (item.discount || 0) / 100);
    return sum + (price * item.quantity);
  }, 0);
  
  const totalShipping = Object.values(shippingCosts).reduce((sum, cost) => sum + cost.fee, 0);
  const total = subtotal + totalShipping;

  // 6. Cập nhật các hàm cũ
  const handleQuantityChange = async (itemId, amount) => {
    const item = cartItems.find(item => item.id === itemId);
    const newQuantity = Math.max(1, item.quantity + amount); // Không cho phép < 1
    const itemRef = doc(db, "carts", currentUser.uid, "items", itemId);
    await updateDoc(itemRef, { quantity: newQuantity });
  };
  
  const handleRemoveItem = async (itemId) => {
    const itemRef = doc(db, "carts", currentUser.uid, "items", itemId);
    await deleteDoc(itemRef);
  };
  
  const handleShippingChange = (sellerId, option) => {
    setShippingOptions(prev => ({ ...prev, [sellerId]: option }));
  };

  // 7. Cập nhật hàm Checkout
  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    if (!buyerData?.location) {
      alert("Vui lòng cập nhật địa chỉ và tọa độ của bạn trong Hồ sơ!");
      navigate('/profile/edit');
      return;
    }
    
    setLoading(true);
    
    try {
      // --- THÊM MỚI: Lấy map các vị trí của seller ---
      const sellerLocationsMap = {};
      Object.keys(itemsBySeller).forEach(sellerId => {
        if (sellerLocations[sellerId]?.location) {
          sellerLocationsMap[sellerId] = sellerLocations[sellerId].location;
        }
      });
      // --- KẾT THÚC THÊM MỚI ---

      const newOrder = {
        buyer_id: currentUser.uid,
        buyer_address: `${buyerData.addressStreet}, ${buyerData.addressCity}`,
        buyer_location: buyerData.location, // <-- THÊM MỚI
        seller_locations_map: sellerLocationsMap, // <-- THÊM MỚI
        current_shipper_location: null, // <-- THÊM MỚI
        createdAt: new Date(),
        status: "pending",
        subtotal_price: subtotal,
        shipping_price: totalShipping,
        total_price: total,
        shipping_details: shippingCosts,
        items: cartItems.map(item => ({
          product_id: item.id,
          name: item.name,
          image_url: item.image_url,
          quantity: item.quantity,
          price_vnd: item.price_vnd,
          discount: item.discount || 0,
          seller_id: item.seller_id
        })),
        seller_ids: [...new Set(cartItems.map(item => item.seller_id))]
      };
      
      const orderRef = await addDoc(collection(db, "orders"), newOrder);
      
      // Xóa giỏ hàng (Giữ nguyên)
      const batch = writeBatch(db);
      const cartItemsRef = collection(db, "carts", currentUser.uid, "items");
      cartItems.forEach(item => {
        const itemRef = doc(cartItemsRef, item.id);
        batch.delete(itemRef);
      });
      await batch.commit();
      
      // Chuyển đến trang theo dõi
      navigate(`/tracking/${orderRef.id}`); // <-- CẬP NHẬT: Chuyển đến trang tracking mới
      
    } catch (error) {
      console.error("Lỗi khi đặt hàng: ", error);
      setLoading(false);
    }
  };

  // 8. Render (với logic từ file cũ)
  if (loading && cartItems.length === 0) {
    return <div className="cart-container">Đang tải giỏ hàng...</div>;
  }

  if (!currentUser) {
    return (
      <div className="cart-container center">
        <h2>Bạn cần đăng nhập</h2>
        <p>Vui lòng <Link to="/login">đăng nhập</Link> để xem giỏ hàng.</p>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <h1>Giỏ hàng của bạn</h1>
      {cartItems.length === 0 ? (
        <div className="cart-empty">
          <p>Giỏ hàng của bạn đang trống.</p>
          <Link to="/shop" className="btn-primary">Bắt đầu mua sắm</Link>
        </div>
      ) : (
        <div className="cart-layout">
          {/* CỘT TRÁI: DANH SÁCH SẢN PHẨM (ĐÃ NHÓM) */}
          <div className="cart-items-list">
            {Object.entries(itemsBySeller).map(([sellerId, data]) => (
              <div key={sellerId} className="seller-group">
                <h4>Hàng từ: <Link to={`/profile/${sellerId}`}>{data.sellerName}</Link></h4>
                {data.items.map(item => {
                  const itemPrice = item.price_vnd - (item.price_vnd * (item.discount || 0) / 100);
                  return (
                    <div key={item.id} className="cart-item">
                      <img src={item.image_url} alt={item.name} className="cart-item-image" />
                      <div className="cart-item-details">
                        <Link to={`/product/${item.id}`}>{item.name}</Link>
                        <p>Giá: {itemPrice.toLocaleString('vi-VN')}đ</p>
                        <div className="cart-item-actions">
                          <div className="quantity-selector">
                            <button onClick={() => handleQuantityChange(item.id, -1)}>-</button>
                            <span>{item.quantity}</span>
                            <button onClick={() => handleQuantityChange(item.id, 1)}>+</button>
                          </div>
                          <button onClick={() => handleRemoveItem(item.id)} className="btn-remove">
                            <BsTrash />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* CỘT PHẢI: TÓM TẮT ĐƠN HÀNG */}
          <div className="cart-summary">
            <h3>Địa chỉ Giao hàng</h3>
            <div className="buyer-address">
              {buyerData?.addressStreet ? (
                <p>{buyerData.addressStreet}, {buyerData.addressCity}</p>
              ) : (
                <p>Chưa có địa chỉ. <Link to="/profile/edit">Cập nhật</Link></p>
              )}
            </div>

            <h3>Tóm tắt đơn hàng</h3>
            <div className="summary-row">
              <span>Tạm tính</span>
              <span>{subtotal.toLocaleString('vi-VN')}đ</span>
            </div>
            
            <hr />
            <h3>Vận chuyển</h3>
            {Object.entries(shippingCosts).map(([sellerId, cost]) => (
              <div key={sellerId} className="shipping-seller-row">
                <strong>Từ: {sellerLocations[sellerId]?.name}</strong>
                <p>Khoảng cách: {cost.distance} km</p>
                <div className="radio-group">
                  <label>
                    <input type="radio" value="regular" name={`ship-${sellerId}`}
                            checked={shippingOptions[sellerId] === 'regular'}
                            onChange={() => handleShippingChange(sellerId, 'regular')} />
                    Thường (x1)
                  </label>
                  <label>
                    <input type="radio" value="fast" name={`ship-${sellerId}`}
                            checked={shippingOptions[sellerId] === 'fast'}
                            onChange={() => handleShippingChange(sellerId, 'fast')} />
                    Nhanh (x1.25)
                  </label>
                  <label>
                    <input type="radio" value="express" name={`ship-${sellerId}`}
                            checked={shippingOptions[sellerId] === 'express'}
                            onChange={() => handleShippingChange(sellerId, 'express')} />
                    Hỏa tốc (x1.5)
                  </label>
                </div>
                <div className="summary-row">
                  <span>Phí ship:</span>
                  <span>{cost.fee.toLocaleString('vi-VN')}đ</span>
                </div>
              </div>
            ))}
            
            <hr />
            <div className="summary-row total">
              <span>Tổng cộng</span>
              <span>{total.toLocaleString('vi-VN')}đ</span>
            </div>
            <button 
              className="btn-checkout" 
              onClick={handleCheckout} 
              disabled={loading || !buyerData?.location}
            >
              {loading ? 'Đang xử lý...' : 'Xác nhận Đặt hàng'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CartPage;
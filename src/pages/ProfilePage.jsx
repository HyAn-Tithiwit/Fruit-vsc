import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../firebase';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  writeBatch,
  increment,
  deleteDoc
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import ProductCard from '../components/ProductCard/ProductCard';
import './Profile.css';
import { BsGear, BsBoxArrowRight, BsPencilSquare, BsShare, BsGrid3X3, BsPinMap } from 'react-icons/bs';
// 1. IMPORT MODAL MỚI
import FollowListModal from '../components/FollowListModal';

function ProfilePage() {
  const { profileId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState(null);
  const [userProducts, setUserProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  
  // 2. THÊM STATE CHO MODAL
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalListType, setModalListType] = useState('followers'); // 'followers' or 'following'

  const userIdToFetch = profileId || currentUser?.uid;
  const isOwner = currentUser?.uid === userIdToFetch;

  // Effect để tải thông tin hồ sơ VÀ trạng thái follow
  useEffect(() => {
    if (!userIdToFetch) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const fetchProfileData = async () => {
      // 1. Tải thông tin user
      const userDocRef = doc(db, "users", userIdToFetch);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        setProfileData(data);
        setFollowerCount(data.followersCount || 0); // Lấy số count

        // 2. Tải bài đăng (sản phẩm) nếu là người bán
        if (data.role === 'seller') {
          const productsQuery = query(
            collection(db, "fruits"), // Giữ collection là 'fruits' từ file cũ
            where("seller_id", "==", userIdToFetch)
          );
          const productsSnapshot = await getDocs(productsQuery);
          setUserProducts(productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      }

      // 3. Kiểm tra trạng thái Follow (chỉ khi xem hồ sơ người khác)
      if (currentUser && !isOwner) {
        const followRef = doc(db, "users", userIdToFetch, "followers", currentUser.uid);
        const followSnap = await getDoc(followRef);
        setIsFollowing(followSnap.exists());
      }
      
      setLoading(false);
    };

    fetchProfileData();
  }, [userIdToFetch, currentUser, isOwner]);

  // --- HÀM MỚI: THEO DÕI ---
  const handleFollow = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    const batch = writeBatch(db);
    const followerRef = doc(db, "users", userIdToFetch, "followers", currentUser.uid);
    batch.set(followerRef, { followedAt: new Date() });
    const followingRef = doc(db, "users", currentUser.uid, "following", userIdToFetch);
    batch.set(followingRef, { followedAt: new Date() });
    const userProfileRef = doc(db, "users", userIdToFetch);
    batch.update(userProfileRef, { followersCount: increment(1) });
    const currentUserRef = doc(db, "users", currentUser.uid);
    batch.update(currentUserRef, { followingCount: increment(1) });
    await batch.commit();
    setIsFollowing(true);
    setFollowerCount(prev => prev + 1);
  };

  // --- HÀM MỚI: BỎ THEO DÕI ---
  const handleUnfollow = async () => {
    if (!currentUser) return;
    const batch = writeBatch(db);
    const followerRef = doc(db, "users", userIdToFetch, "followers", currentUser.uid);
    batch.delete(followerRef);
    const followingRef = doc(db, "users", currentUser.uid, "following", userIdToFetch);
    batch.delete(followingRef);
    const userProfileRef = doc(db, "users", userIdToFetch);
    batch.update(userProfileRef, { followersCount: increment(-1) });
    const currentUserRef = doc(db, "users", currentUser.uid);
    batch.update(currentUserRef, { followingCount: increment(-1) });
    await batch.commit();
    setIsFollowing(false);
    setFollowerCount(prev => prev - 1);
  };

  // --- HÀM MỚI: ĐĂNG XUẤT ---
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Lỗi khi đăng xuất: ", error);
    }
  };

  // 3. HÀM MỞ MODAL
  const openFollowListModal = (type) => {
    setModalListType(type);
    setIsModalOpen(true);
  };

  if (loading) {
    return <div className="profile-loading">Đang tải hồ sơ...</div>;
  }
  if (!profileData) {
    return <div className="profile-loading">Không tìm thấy hồ sơ người dùng.</div>;
  }
  
  const address = profileData.addressStreet ? 
    `${profileData.addressStreet}, ${profileData.addressCity}, ${profileData.addressCountry}` : null;

  return (
    <div className="profile-container">
      <header className="profile-header">
        <img 
          src={profileData.avatarUrl || 'https://placehold.co/150x150/f0f0f0/ccc?text=Avatar'} 
          alt="Avatar" 
          className="profile-avatar"
        />
        <div className="profile-info">
          <div className="profile-info-top">
            <h1 className="profile-name">{profileData.displayName || profileData.email.split('@')[0]}</h1>
            
            {isOwner ? (
              <div className="profile-owner-actions">
                <Link to="/profile/edit" className="profile-btn">
                  <BsPencilSquare /> Chỉnh sửa
                </Link>
                <Link to="/profile/settings" className="profile-btn-icon" aria-label="Cài đặt">
                  <BsGear />
                </Link>
                <button onClick={handleLogout} className="profile-btn-icon" aria-label="Đăng xuất">
                  <BsBoxArrowRight />
                </button>
              </div>
            ) : (
              <div className="profile-visitor-actions">
                {isFollowing ? (
                  <button onClick={handleUnfollow} className="profile-btn secondary">
                    Đang theo dõi
                  </button>
                ) : (
                  <button onClick={handleFollow} className="profile-btn primary">
                    Theo dõi
                  </button>
                )}
                
                {/* 4. SỬA NÚT NHẮN TIN */}
                <Link to={`/chat/${userIdToFetch}`} className="profile-btn">
                  Nhắn tin
                </Link>
              </div>
            )}
          </div>

          {/* 5. SỬA STATS ĐỂ CÓ THỂ CLICK */}
          <div className="profile-stats">
            <span><b>{userProducts.length}</b> bài đăng</span>
            <button className="stat-button" onClick={() => openFollowListModal('followers')}>
              <b>{followerCount}</b> người theo dõi
            </button>
            <button className="stat-button" onClick={() => openFollowListModal('following')}>
              <b>{profileData.followingCount || 0}</b> đang theo dõi
            </button>
          </div>

          <div className="profile-bio">
            <p>{profileData.bio || "Chưa có tiểu sử."}</p>
            {address && (
              <div className="profile-address">
                <BsPinMap />
                <span>{address}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ... (code tabs và tab content giữ nguyên) ... */}
      <nav className="profile-tabs">
        <button 
          className={`profile-tab ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          <BsGrid3X3 /> BÀI ĐĂNG
        </button>
        {isOwner && (
          <button 
            className={`profile-tab ${activeTab === 'loyalty' ? 'active' : ''}`}
            onClick={() => setActiveTab('loyalty')}
          >
            ⭐️ ĐIỂM ƯU ĐÃI
          </button>
        )}
      </nav>

      <div className="profile-tab-content">
        {activeTab === 'posts' && (
          <div className="profile-posts-grid">
            {userProducts.length > 0 ? (
              userProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <p>Chưa có bài đăng nào.</p>
            )}
          </div>
        )}
        {activeTab === 'loyalty' && isOwner && (
          <div className="profile-loyalty">
            <h3>Điểm Ưu Đãi Của Bạn</h3>
            <p className="loyalty-points">{profileData.loyaltyPoints || 0}</p>
            <p>Sử dụng điểm này để đổi các voucher giảm giá!</p>
          </div>
        )}
      </div>

      {/* 6. THÊM MODAL VÀO CUỐI TRANG */}
      <FollowListModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={userIdToFetch}
        listType={modalListType}
      />
    </div>
  );
}

export default ProfilePage;
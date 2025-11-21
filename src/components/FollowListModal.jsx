import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, getDocs, doc, getDoc } from 'firebase/firestore';
import './FollowListModal.css'; // Sẽ tạo ở Bước 3

// Hàm trợ giúp: Lấy thông tin user (cache đơn giản)
const userCache = new Map();
const getUserProfile = async (userId) => {
  if (userCache.has(userId)) return userCache.get(userId);
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const userData = userSnap.data();
    userCache.set(userId, userData);
    return userData;
  }
  return null;
};

function FollowListModal({ isOpen, onClose, userId, listType }) {
  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !userId) return;

    const fetchList = async () => {
      setLoading(true);
      try {
        // 1. Lấy danh sách ID từ subcollection (followers hoặc following)
        const listRef = collection(db, "users", userId, listType);
        const q = query(listRef);
        const querySnapshot = await getDocs(q);
        const userIds = querySnapshot.docs.map(d => d.id);

        // 2. Lấy thông tin hồ sơ cho từng ID
        const profilePromises = userIds.map(id => getUserProfile(id));
        const profiles = await Promise.all(profilePromises);
        
        setUserList(profiles.filter(Boolean)); // Lọc ra những user tồn tại
      } catch (error) {
        console.error(`Lỗi khi tải ${listType}: `, error);
      }
      setLoading(false);
    };

    fetchList();
  }, [isOpen, userId, listType]);

  if (!isOpen) return null;

  const title = listType === 'followers' ? 'Người theo dõi' : 'Đang theo dõi';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <p>Đang tải...</p>
          ) : userList.length === 0 ? (
            <p>Không có ai trong danh sách này.</p>
          ) : (
            <div className="follow-list">
              {userList.map(user => (
                <Link 
                  to={`/profile/${user.uid}`} 
                  key={user.uid} 
                  className="follow-item"
                  onClick={onClose} // Đóng modal khi nhấp
                >
                  <img 
                    src={user.avatarUrl || 'https://placehold.co/50x50/f0f0f0/ccc?text=Ava'} 
                    alt={user.displayName} 
                  />
                  <span>{user.displayName || user.email}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FollowListModal;
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../firebase'; // 1. IMPORT STORAGE
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // 2. IMPORT CÁC HÀM UPLOAD
import { v4 as uuidv4 } from 'uuid'; // Cần cài: npm install uuid
import './Chat.css';
import { BsImage, BsGeoAlt, BsTelephone, BsCameraVideo } from 'react-icons/bs'; // 3. IMPORT ICON MỚI

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

function ChatPage() {
  const { currentUser, currentUserData } = useAuth();
  const { chatWithUserId } = useParams();
  const navigate = useNavigate();
  
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState(null);
  const [uploading, setUploading] = useState(false); // State khi đang tải ảnh
  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null); // Ref cho input file

  // 1. Tải danh sách các cuộc trò chuyện (Sidebar)
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "users", currentUser.uid, "conversations"),
      orderBy("lastUpdatedAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setConversations(convos);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // 2. Tải tin nhắn của phòng chat được chọn
  useEffect(() => {
    if (!chatWithUserId || !currentUser) {
      setMessages([]);
      setOtherUser(null);
      return;
    }

    // Tải thông tin người đang chat (để hiển thị tên)
    getUserProfile(chatWithUserId).then(setOtherUser);

    // Tạo ID phòng chat (luôn sắp xếp theo A-Z)
    const chatRoomId = [currentUser.uid, chatWithUserId].sort().join('_');
    const messagesRef = collection(db, "chatrooms", chatRoomId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });
    return () => unsubscribe();

  }, [chatWithUserId, currentUser]);
  
  // 3. Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. HÀM CHUNG ĐỂ GỬI TIN NHẮN (TÁI CẤU TRÚC)
  const sendChatMessage = async (messageData, lastMessageText) => {
    if (!chatWithUserId || !currentUser) return;

    const chatRoomId = [currentUser.uid, chatWithUserId].sort().join('_');
    const messagesRef = collection(db, "chatrooms", chatRoomId, "messages");

    // 4a. Thêm tin nhắn vào 'chatrooms'
    await addDoc(messagesRef, {
      ...messageData, // { text: "...", type: "text" } hoặc { imageUrl: "...", type: "image" }
      senderId: currentUser.uid,
      receiverId: chatWithUserId,
      createdAt: serverTimestamp()
    });

    // 4b. Cập nhật "cuộc trò chuyện" cho CẢ HAI người
    const timestamp = new Date();
    // Cập nhật cho người gửi (chính mình)
    const myConvoRef = doc(db, "users", currentUser.uid, "conversations", chatWithUserId);
    await setDoc(myConvoRef, {
      lastMessage: lastMessageText, // Dùng text mô tả (VD: "Đã gửi 1 ảnh")
      lastUpdatedAt: timestamp,
      otherUserId: chatWithUserId,
      otherUserName: otherUser.displayName,
      otherUserAvatar: otherUser.avatarUrl || ''
    }, { merge: true });
    // Cập nhật cho người nhận
    const otherConvoRef = doc(db, "users", chatWithUserId, "conversations", currentUser.uid);
    await setDoc(otherConvoRef, {
      lastMessage: lastMessageText,
      lastUpdatedAt: timestamp,
      otherUserId: currentUser.uid,
      otherUserName: currentUserData.displayName,
      otherUserAvatar: currentUserData.avatarUrl || ''
    }, { merge: true });
  };

  // 5. HÀM GỬI TIN NHẮN VĂN BẢN
  const handleSendText = async (e) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (text === '') return;
    
    setNewMessage(''); // Xóa input ngay
    await sendChatMessage({ text: text, type: 'text' }, text);
  };

  // 6. HÀM GỬI HÌNH ẢNH
  const handleImageSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      uploadImage(file);
    }
    e.target.value = null; // Reset input
  };

  const uploadImage = async (file) => {
    if (!chatWithUserId || !currentUser) return;
    setUploading(true);
    try {
      // Tạo một tên file duy nhất
      const storageRef = ref(storage, `chat_images/${uuidv4()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Gửi tin nhắn loại 'image'
      await sendChatMessage({ imageUrl: downloadURL, type: 'image' }, "Đã gửi một hình ảnh");
    } catch (error) {
      console.error("Lỗi khi tải ảnh: ", error);
    } finally {
      setUploading(false);
    }
  };
  
  // 7. HÀM GỬI VỊ TRÍ
  const handleSendLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        const locationData = { lat: latitude, lng: longitude };
        await sendChatMessage({ location: locationData, type: 'location' }, "Đã gửi vị trí");
      }, (error) => {
        console.error("Lỗi khi lấy vị trí: ", error);
        alert("Không thể lấy vị trí của bạn.");
      });
    } else {
      alert("Trình duyệt không hỗ trợ chia sẻ vị trí.");
    }
  };

  // 8. HÀM RENDER NỘI DUNG TIN NHẮN (QUAN TRỌNG)
  const renderMessageContent = (msg) => {
    switch (msg.type) {
      case 'image':
        return <img src={msg.imageUrl} alt="Ảnh đã gửi" className="message-image" />;
      case 'location':
        return (
          <a 
            href={`https://www.google.com/maps?q=${msg.location.lat},${msg.location.lng}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="message-location-link"
          >
            <BsGeoAlt /> Xem Vị trí
          </a>
        );
      case 'text':
      default:
        return <p>{msg.text}</p>;
    }
  };

  if (!currentUser) {
    return (
      <div className="chat-container">
        <div className="chat-window-main center">
          <h2>Bạn cần đăng nhập</h2>
          <p>Vui lòng <Link to="/login">đăng nhập</Link> để sử dụng chức năng Chat.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {/* 1. SIDEBAR DANH SÁCH CHAT (Giữ nguyên) */}
      <aside className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h3>Đoạn chat</h3>
        </div>
        <div className="conversation-list">
          {conversations.length === 0 && (
            <p className="no-convos">Bắt đầu trò chuyện bằng cách nhấn "Nhắn tin" trên hồ sơ người dùng.</p>
          )}
          {conversations.map(convo => (
            <Link 
              to={`/chat/${convo.otherUserId}`} 
              key={convo.id} 
              className={`convo-item ${chatWithUserId === convo.otherUserId ? 'active' : ''}`}
            >
              <img 
                src={convo.otherUserAvatar || 'https://placehold.co/50x50/f0f0f0/ccc?text=Ava'} 
                alt={convo.otherUserName} 
              />
              <div className="convo-details">
                <span className="convo-name">{convo.otherUserName}</span>
                <span className="convo-last-message">{convo.lastMessage}</span>
              </div>
            </Link>
          ))}
        </div>
      </aside>

      {/* 2. CỬA SỔ CHAT CHÍNH */}
      <main className="chat-window-main">
        {!chatWithUserId ? (
          <div className="center">
            <h2>Chọn một đoạn chat</h2>
            <p>Chọn một người từ danh sách bên trái để bắt đầu nhắn tin.</p>
          </div>
        ) : (
          <>
            <header className="chat-window-header">
              {otherUser ? (
                <>
                  <img src={otherUser.avatarUrl || 'https://placehold.co/40x40/f0f0f0/ccc?text=Ava'} alt={otherUser.displayName} />
                  <h3>{otherUser.displayName}</h3>
                </>
              ) : <p>Đang tải...</p>}
              {/* Nút Call (Giao diện, chưa có chức năng WebRTC) */}
              <div className="chat-header-actions">
                <button className="chat-action-btn" disabled><BsTelephone /></button>
                <button className="chat-action-btn" disabled><BsCameraVideo /></button>
              </div>
            </header>

            <div className="messages-container">
              {messages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`message-bubble ${msg.senderId === currentUser.uid ? 'sent' : 'received'}`}
                >
                  {/* 9. GỌI HÀM RENDER MỚI */}
                  {renderMessageContent(msg)}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {uploading && <div className="uploading-indicator">Đang gửi ảnh...</div>}
            
            <form className="chat-form" onSubmit={handleSendText}>
              {/* 10. THÊM CÁC NÚT MỚI */}
              <input 
                type="file" 
                ref={imageInputRef} 
                onChange={handleImageSelect} 
                accept="image/*" 
                style={{ display: 'none' }} 
              />
              <button 
                type="button" 
                className="chat-action-btn" 
                onClick={() => imageInputRef.current.click()}
              >
                <BsImage />
              </button>
              <button 
                type="button" 
                className="chat-action-btn" 
                onClick={handleSendLocation}
              >
                <BsGeoAlt />
              </button>
              {/* (Nút Voice sẽ cần logic MediaRecorder) */}
              
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Nhập tin nhắn..."
              />
              <button type="submit">Gửi</button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}

export default ChatPage;
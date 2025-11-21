import React from 'react';
import { Link } from 'react-router-dom';
import './Profile.css'; // Dùng chung file CSS
import { BsBell, BsLock, BsXCircle, BsHeart, BsQuestionCircle } from 'react-icons/bs';

function SettingsPage() {
  return (
    <div className="settings-container">
      <h1>Cài đặt</h1>
      <div className="settings-list">
        <Link to="#" className="settings-item">
          <BsBell />
          <span>Thông báo</span>
        </Link>
        <Link to="#" className="settings-item">
          <BsLock />
          <span>Quyền riêng tư tài khoản</span>
        </Link>
        <Link to="#" className="settings-item">
          <BsXCircle />
          <span>Đã chặn</span>
        </Link>
        <Link to="#" className="settings-item">
          <BsHeart />
          <span>Yêu thích</span>
        </Link>
        <Link to="#" className="settings-item">
          <BsQuestionCircle />
          <span>Trợ giúp & Hỗ trợ</span>
        </Link>
      </div>
    </div>
  );
}

export default SettingsPage;
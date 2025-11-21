import React from 'react';
import './Footer.css';
import { BsFacebook, BsLinkedin, BsYoutube, BsInstagram } from 'react-icons/bs';

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <hr className="footer-line" />
        <div className="footer-main">
          
          {/* Cột trái: Tên trang & Mạng xã hội */}
          <div className="footer-about">
            <h3>Site name</h3>
            <div className="social-icons">
              <a href="#" aria-label="Facebook"><BsFacebook /></a>
              <a href="#" aria-label="LinkedIn"><BsLinkedin /></a>
              <a href="#" aria-label="YouTube"><BsYoutube /></a>
              <a href="#" aria-label="Instagram"><BsInstagram /></a>
            </div>
          </div>

          {/* Cột phải: Các liên kết */}
          <div className="footer-links">
            <div className="footer-column">
              <h4>Topic</h4>
              <a href="#">Page</a>
              <a href="#">Page</a>
              <a href="#">Page</a>
            </div>
            <div className="footer-column">
              <h4>Topic</h4>
              <a href="#">Page</a>
              <a href="#">Page</a>
              <a href="#">Page</a>
            </div>
            <div className="footer-column">
              <h4>Topic</h4>
              <a href="#">Page</a>
              <a href="#">Page</a>
              <a href="#">Page</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
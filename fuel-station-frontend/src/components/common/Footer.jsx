// src/components/common/Footer.jsx
import React from 'react';

const Footer = () => {
  return (
    <footer className="footer">
      <p>&copy; {new Date().getFullYear()} Fuel Station Management. All rights reserved.</p>
    </footer>
  );
};

export default Footer;
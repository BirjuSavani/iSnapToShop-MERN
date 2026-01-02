import React from "react";
import PropTypes from "prop-types";

export const NavButton = ({ onClick, isActive, children, label }) => (
  <button className={`nav-button ${isActive ? "active" : ""}`} onClick={onClick}>
    {children}
    {label}
  </button>
);

NavButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  isActive: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
};

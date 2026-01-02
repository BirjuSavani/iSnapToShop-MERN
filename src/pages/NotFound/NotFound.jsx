import React from "react";
import "./notFound.css";

// 404 Error Icon Component
const NotFoundIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="64"
    height="64"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <path d="m15 9-6 6"></path>
    <path d="m9 9 6 6"></path>
  </svg>
);

export default function NotFound() {
  return (
    <div className="container">
      <div className="card">
        <div className="icon">
          <NotFoundIcon />
        </div>
        <h1 className="title">404</h1>
        <h2>Page Not Found</h2>
        <p className="description">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="steps-guide">
          <h2 className="steps-title">What you can do:</h2>
          <ol className="steps-list">
            <li className="step-list-item">
              Check the <strong className="strong-text">URL</strong> for typos
            </li>
            <li className="step-list-item">
              Go back to the <strong className="strong-text">homepage</strong>
            </li>
          </ol>
        </div>

        <p className="footer">If you believe this is an error, please contact support.</p>
      </div>
    </div>
  );
}

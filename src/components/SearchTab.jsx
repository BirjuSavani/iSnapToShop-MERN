import React from "react";
import PropTypes from "prop-types";
import { productProfileImage } from "./helpers";

export const SearchTab = ({ state, setShowImageModal }) => {
  const { isLoading, searchResults, previewImage, error, uploadProgress, isActive } = state;

  return (
    <>
      <div className="search-layout">
        <div className="search-controls-wrapper">
          <div className="card search-controls-card">
            <h3>Search for a Product</h3>
            <p>
              Upload an image or generate one from a text prompt to find similar items in your
              catalog.
            </p>
            <button
              className={`btn-primary upload-btn ${isLoading ? "loading" : ""} ${
                !isActive ? "disabled" : ""
              }`}
              onClick={() => setShowImageModal(true)}
              disabled={isLoading || !isActive}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              Upload or Generate Image
            </button>
            {!isActive && <p className="helper-text">System is initializing, please wait...</p>}
          </div>
        </div>
        <div className="search-preview-wrapper">
          <div className="card image-preview-card">
            {previewImage ? (
              <div className="image-preview animated">
                <img src={previewImage} alt="Preview" className="preview-image-itself" />
                {isLoading && (
                  <div className="processing-overlay">
                    <div className="spinner"></div>
                    <p>Analyzing your image...</p>
                    {uploadProgress > 0 && (
                      <p className="progress-text">{uploadProgress}% complete</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-preview">
                <svg
                  className="placeholder-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p>Image preview will appear here</p>
              </div>
            )}
          </div>
          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
      <section className="results-section">
        {searchResults.length > 0 ? (
          <>
            <h2 className="section-title">Matching Products ({searchResults.length})</h2>
            <div className="product-grid">
              {searchResults.map(product => (
                <div className="product-card" key={product._id}>
                  <div className="product-image">
                    <img
                      src={productProfileImage(product.media)}
                      alt={product.name}
                      loading="lazy"
                    />
                  </div>
                  <div className="product-details">
                    <span className="product-brand">{product.brand?.name || "Unbranded"}</span>
                    <h3 className="product-name">{product.name}</h3>
                    {product.sizes?.[0]?.price?.effective && (
                      <p className="product-price">₹{product.sizes[0].price.effective.min}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          previewImage &&
          !isLoading &&
          !error && (
            <div className="no-results">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3>No Matches Found</h3>
              <p>We couldn't find any products matching your image. Please try another one.</p>
            </div>
          )
        )}
      </section>
    </>
  );
};

SearchTab.propTypes = {
  state: PropTypes.shape({
    isLoading: PropTypes.bool.isRequired,
    searchResults: PropTypes.array.isRequired,
    previewImage: PropTypes.string,
    error: PropTypes.string,
    uploadProgress: PropTypes.number.isRequired,
    isActive: PropTypes.bool.isRequired,
  }).isRequired,
  setShowImageModal: PropTypes.func.isRequired,
};

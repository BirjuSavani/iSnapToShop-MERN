import React from "react";
import PropTypes from "prop-types";

export const ImageGenerationModal = ({
  show,
  onClose,
  fileInputRef,
  onFileSelect,
  promptText,
  setPromptText,
  onGenerate,
  isGenerating,
}) => {
  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Upload or Generate Image</h2>
          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="upload-modal-section">
            <label htmlFor="image-upload-input">Upload an image of the product</label>
            <div className="file-input-wrapper">
              <button onClick={() => fileInputRef.current.click()}>Choose File</button>
              <span>No file chosen</span>
            </div>
            <input
              id="image-upload-input"
              type="file"
              ref={fileInputRef}
              onChange={onFileSelect}
              accept="image/*"
              style={{ display: "none" }}
            />
          </div>
          <div className="modal-divider">
            <span>OR</span>
          </div>
          <div className="upload-modal-section">
            <label htmlFor="text-prompt-input">Generate an image using a text prompt</label>
            <input
              id="text-prompt-input"
              type="text"
              placeholder='e.g., "a red silk dress with short sleeves"'
              value={promptText}
              onChange={e => setPromptText(e.target.value)}
              disabled={isGenerating}
            />
            <button
              onClick={onGenerate}
              className="btn-primary generate-btn"
              disabled={isGenerating || !promptText}
            >
              {isGenerating ? (
                <>
                  <span className="spinner small"></span>
                  <span>Generating...</span>
                </>
              ) : (
                "Generate & Search"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

ImageGenerationModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  fileInputRef: PropTypes.object.isRequired,
  onFileSelect: PropTypes.func.isRequired,
  promptText: PropTypes.string.isRequired,
  setPromptText: PropTypes.func.isRequired,
  onGenerate: PropTypes.func.isRequired,
  isGenerating: PropTypes.bool.isRequired,
};

export const ActivationPopup = ({ show, statusMessage }) => {
  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content activation-popup">
        <h2 className="modal-title">Getting Things Ready</h2>
        <p className="modal-message">{statusMessage}</p>
        <div className="progress-container">
          <div className="spinner"></div>
          <p className="progress-text">This may take a few moments...</p>
        </div>
      </div>
    </div>
  );
};

ActivationPopup.propTypes = {
  show: PropTypes.bool.isRequired,
  statusMessage: PropTypes.string.isRequired,
};

export const WelcomePopup = ({ show, onClose }) => {
  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content welcome-popup">
        <h2 className="modal-title">Welcome to iSnapToShop!</h2>
        <p className="modal-message">
          Your visual shopping assistant is now active. Upload an image to find matching products in
          your store.
        </p>
        <button onClick={onClose} className="btn-primary">
          Get Started
        </button>
      </div>
    </div>
  );
};

WelcomePopup.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

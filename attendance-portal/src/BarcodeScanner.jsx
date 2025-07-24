import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';

const BarcodeScanner = ({ onDetected }) => {
  const videoRef = useRef(null);
  const imageRef = useRef(null); // Ref for our hidden image element
  const codeReader = useRef(new BrowserMultiFormatReader());
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [imageScanMessage, setImageScanMessage] = useState(""); // New state for image scan messages

  // Memoize the hints creation to avoid recreating on every render
  const getHints = useCallback(() => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128, // UNCOMMENTED: This is likely for your ID card
        BarcodeFormat.QR_CODE, // Often good to include QR_CODE for image scanning
        // Add other formats you expect if necessary (e.g., BarcodeFormat.EAN_13, BarcodeFormat.CODE_39)
    ]);
    return hints;
  }, []);

  // Function to start the camera and scanning
  const startCamera = async () => {
    setError(null);
    setImageScanMessage(""); // Clear image scan message
    setIsScanning(false); // Reset scanning status
    setIsCameraActive(true); // Indicate camera is trying to start

    codeReader.current.reset(); // Reset any ongoing scans first
    codeReader.current = new BrowserMultiFormatReader(getHints()); // Initialize with hints

    try {
      const videoInputDevices = await codeReader.current.listVideoInputDevices();
      if (videoInputDevices.length > 0) {
        // Use the first available camera. You could add logic here
        // to let the user select a camera if multiple exist.
        const deviceId = videoInputDevices[0].deviceId;
        codeReader.current.decodeFromVideoDevice(deviceId, videoRef.current, (result, err) => {
          if (result) {
            onDetected(result.getText()); // Send the decoded text back to App.jsx
            // Optionally stop camera after successful scan:
            // stopCamera();
          }
          if (err && !err.toString().includes('NotFoundException')) {
            // NotFoundException is normal when no barcode is in view
            console.error("Scanner Error:", err);
            setError("Error during scanning. Make sure the barcode is clear.");
          }
        });
        setIsScanning(true); // Scanning has successfully started
      } else {
        setError("No video input devices found.");
        setIsCameraActive(false); // Camera could not be activated
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Error accessing camera. Please ensure permissions are granted.");
      setIsCameraActive(false); // Camera could not be activated
    }
  };

  // Function to stop the camera
  const stopCamera = () => {
    codeReader.current.reset(); // Stop scanning and turn off camera
    setIsScanning(false);
    setIsCameraActive(false);
    setError(null); // Clear any previous errors
    setImageScanMessage(""); // Clear image scan message
  };

  // Function to handle image file selection
  const handleImageUpload = async (event) => {
    stopCamera(); // Stop camera if it's active

    setImageScanMessage("Processing image...");
    setError(null); // Clear any previous errors

    const file = event.target.files[0];
    if (!file) {
      setImageScanMessage("No file selected.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageUrl = e.target.result;
      imageRef.current.src = imageUrl; // Set the image source
      imageRef.current.onload = async () => { // Wait for image to load
        try {
          // Re-initialize codeReader with hints for image decoding
          codeReader.current.reset(); // Clear previous state
          codeReader.current = new BrowserMultiFormatReader(getHints()); // Initialize with hints

          const result = await codeReader.current.decodeFromImage(imageRef.current);
          onDetected(result.getText());
          setImageScanMessage("Barcode scanned from image successfully!");
        } catch (err) {
          console.error("Image scanning error:", err);
          setImageScanMessage("No barcode found in image or error processing.");
          setError("Could not scan barcode from image. Try another image or format.");
        }
      };
      imageRef.current.onerror = () => {
        setImageScanMessage("Error loading image.");
        setError("Could not load image file.");
      };
    };
    reader.readAsDataURL(file);
  };

  // Effect to clean up when component unmounts
  useEffect(() => {
    // This effect will only handle cleanup. Starting/stopping is now controlled by buttons.
    return () => {
      stopCamera(); // Ensure camera is off when component unmounts
    };
  }, []); // Empty dependency array means this runs once on mount and cleanup on unmount


  return (
    <div className="barcode-scanner-controls">
      <div className="camera-buttons">
        {!isCameraActive ? (
          <button onClick={startCamera} className="camera-button start-button">Open Camera</button>
        ) : (
          <button onClick={stopCamera} className="camera-button stop-button">Stop Camera</button>
        )}
        <label htmlFor="barcodeImageUpload" className="camera-button upload-button">
            Upload Barcode Image
        </label>
        <input
            type="file"
            id="barcodeImageUpload"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }} // Hide the default file input button
        />
      </div>

      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      {imageScanMessage && <p style={{ marginTop: '10px' }}>{imageScanMessage}</p>}


      {isCameraActive && !error && (
        <>
          {!isScanning && <p>Waiting for video stream...</p>}
          <video ref={videoRef} className="scanner-video"></video>
          {isScanning && <p>Scanning for barcodes...</p>}
        </>
      )}

      {!isCameraActive && !error && !imageScanMessage && (
        <p>Press "Open Camera" to start live scanning or "Upload Barcode Image" to scan from a file.</p>
      )}

      {/* Hidden image element for decoding from file */}
      <img ref={imageRef} style={{ display: 'none' }} alt="Barcode for scanning" />
    </div>
  );
};

export default BarcodeScanner;

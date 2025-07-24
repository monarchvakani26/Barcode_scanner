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
    // IMPORTANT: Expanded list of possible barcode formats to increase detection success
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128,      // Very common for ID cards, shipping, logistics
        BarcodeFormat.QR_CODE,       // Common for links, contact info, general data
        BarcodeFormat.EAN_13,        // European Article Number (standard for retail products)
        BarcodeFormat.UPC_A,         // Universal Product Code (standard for retail products in North America)
        BarcodeFormat.CODE_39,       // Older, simpler barcode, often used in inventory
        BarcodeFormat.ITF,           // Interleaved 2 of 5 (used in warehousing, logistics)
        BarcodeFormat.CODABAR,       // Used in libraries, blood banks, logistics
        BarcodeFormat.DATA_MATRIX,   // 2D barcode, compact data storage
        BarcodeFormat.AZTEC,         // 2D barcode, often used in transportation
        BarcodeFormat.PDF_417,       // Stacked linear barcode, used in ID cards, postal services
        BarcodeFormat.EAN_8,         // Shorter version of EAN-13
        BarcodeFormat.UPC_E,         // Shorter version of UPC-A
        BarcodeFormat.CODE_93,       // Similar to Code 39, more efficient
        BarcodeFormat.RSS_14,        // GS1 DataBar, used in retail
        BarcodeFormat.RSS_EXPANDED,  // GS1 DataBar Expanded
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
      console.log("Detected video input devices:", videoInputDevices); // Added for debugging
      if (videoInputDevices.length > 0) {
        const deviceId = videoInputDevices[0].deviceId;

        const constraints = {
          video: {
            deviceId: deviceId,
            facingMode: "environment" // Prefer rear camera on mobile
          }
        };

        // NEW: Use onloadedmetadata to ensure video element is truly ready
        const onVideoReady = () => {
          if (videoRef.current) {
            videoRef.current.removeEventListener('loadedmetadata', onVideoReady); // Remove listener to prevent multiple calls
            codeReader.current.decodeFromVideoDevice(deviceId, videoRef.current, (result, err) => {
              if (result) {
                onDetected(result.getText());
                // Optionally stop camera after successful scan:
                // stopCamera();
              }
              if (err && !err.toString().includes('NotFoundException')) {
                console.error("Scanner Error (from decodeFromVideoDevice callback):", err);
                setError("Error during scanning. Make sure the barcode is clear.");
              }
            }, constraints);
            setIsScanning(true);
          }
        };

        if (videoRef.current) {
          // Add event listener for when video metadata is loaded
          videoRef.current.addEventListener('loadedmetadata', onVideoReady);
          // Set srcObject to start stream, onloadedmetadata will then trigger decode
          navigator.mediaDevices.getUserMedia(constraints)
            .then(stream => {
              videoRef.current.srcObject = stream;
              videoRef.current.play(); // Explicitly try to play the video
              console.log("Camera stream assigned to video element.");
            })
            .catch(err => {
              console.error("Error getting user media:", err);
              setError("Could not access camera. Please check permissions.");
              setIsCameraActive(false);
            });
        } else {
          // Fallback if videoRef is somehow null right after component render
          console.warn("videoRef.current is null, retrying startCamera in 100ms...");
          setTimeout(startCamera, 100);
        }
      } else {
        setError("No video input devices found.");
        setIsCameraActive(false);
      }
    } catch (err) {
      console.error("Camera access error (from startCamera catch block):", err);
      setError("Error accessing camera. Please ensure permissions are granted.");
      setIsCameraActive(false);
    }
  };

  // Function to stop the camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    codeReader.current.reset();
    setIsScanning(false);
    setIsCameraActive(false);
    setError(null);
    setImageScanMessage("");
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

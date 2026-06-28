import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';

export default function QRScannerModal({ isOpen, onClose, onAutoFill, initialVpa, onPostPayment, onUpdateStatus }) {
  const [scanTab, setScanTab] = useState('camera'); // 'camera' or 'upload'
  const [step, setStep] = useState('scan'); // 'scan', 'form', 'pay'
  const [error, setError] = useState('');
  const [diagnosticText, setDiagnosticText] = useState('Camera: Off');
  
  // Scanned / Extracted UPI Data
  const [upiData, setUpiData] = useState({
    pa: '', // Payee VPA / UPI ID
    pn: '', // Payee Name
    am: '', // Amount
    tn: '', // Transaction Note
  });

  // Input states for custom payment
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentCategory, setPaymentCategory] = useState('Other');
  const [customCategory, setCustomCategory] = useState('');
  const [activeTxId, setActiveTxId] = useState('');

  // Camera stream refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameIdRef = useRef(null);

  // Close modal and cleanup camera
  const handleClose = () => {
    stopCamera();
    setStep('scan');
    setError('');
    setDiagnosticText('Camera: Off');
    setPaymentAmount('');
    setPaymentNote('');
    setPaymentCategory('Other');
    setCustomCategory('');
    setActiveTxId('');
    setUpiData({ pa: '', pn: '', am: '', tn: '' });
    onClose();
  };

  // Start Camera Access
  const startCamera = async () => {
    setError('');
    setDiagnosticText('Requesting permissions...');
    try {
      if (streamRef.current) {
        stopCamera();
      }

      let stream;
      try {
        // Attempt to get environment (rear) camera first
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } }
        });
        setDiagnosticText('Connected (Environment/Rear)');
      } catch (constraintsErr) {
        console.warn("Could not start camera with environment constraints, trying fallback", constraintsErr);
        // Fallback to any default camera (e.g. laptop webcam / user-facing camera)
        stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
        setDiagnosticText('Connected (Default/Webcam)');
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS
        videoRef.current.play();
        animationFrameIdRef.current = requestAnimationFrame(scanTick);
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setError('Camera access denied or no camera found. Please check permissions or upload a QR image.');
      setDiagnosticText('Access Denied');
      setScanTab('upload');
    }
  };

  // Stop Camera Access
  const stopCamera = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setDiagnosticText('Stopped');
  };

  // Scan frame by frame
  const scanTick = () => {
    if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) {
      animationFrameIdRef.current = requestAnimationFrame(scanTick);
      return;
    }

    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current || document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      let width = videoRef.current.videoWidth;
      let height = videoRef.current.videoHeight;
      
      // Performance optimization: scale down frame before running jsQR
      const maxDecodeSize = 480;
      if (width > maxDecodeSize) {
        const ratio = maxDecodeSize / width;
        width = maxDecodeSize;
        height = Math.floor(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      try {
        ctx.drawImage(videoRef.current, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        
        // Scan with attemptBoth to handle both regular and inverted QR codes
        const code = jsQR(imageData.data, width, height, {
          inversionAttempts: 'attemptBoth',
        });

        if (code) {
          console.log("QR Code decoded successfully:", code.data);
          setDiagnosticText('QR Found! Decoding...');
          handleDecodedData(code.data);
          return; // Stop scanning loop
        } else {
          setDiagnosticText(`Active (${videoRef.current.videoWidth}x${videoRef.current.videoHeight}) - Scanning...`);
        }
      } catch (err) {
        console.error("Frame scanning error:", err);
      }
    }
    animationFrameIdRef.current = requestAnimationFrame(scanTick);
  };

  // Handle uploaded QR image
  const handleImageUpload = (e) => {
    setError('');
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        let width = img.width;
        let height = img.height;
        
        // Downscale very large photos/screenshots for easier QR decoding (max 800px)
        const maxDecodeSize = 800;
        if (width > maxDecodeSize || height > maxDecodeSize) {
          if (width > height) {
            height = Math.round((height * maxDecodeSize) / width);
            width = maxDecodeSize;
          } else {
            width = Math.round((width * maxDecodeSize) / height);
            height = maxDecodeSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        try {
          const imageData = ctx.getImageData(0, 0, width, height);
          
          // Use attemptBoth inversionAttempts for uploaded images as well
          const code = jsQR(imageData.data, width, height, {
            inversionAttempts: 'attemptBoth'
          });
          
          if (code) {
            console.log("Uploaded QR Code decoded successfully:", code.data);
            handleDecodedData(code.data);
          } else {
            setError('Could not decode QR code. Please make sure the QR is clear, well-lit, and occupies a significant part of the image.');
          }
        } catch (err) {
          console.error("Image decoding error:", err);
          setError('Failed to extract image pixels. Please try another image.');
        }
      };
      img.onerror = () => {
        setError('Failed to load image file.');
      };
      img.src = event.target.result;
    };
    reader.onerror = () => {
      setError('Failed to read upload file.');
    };
    reader.readAsDataURL(file);
    
    // Clear input value so same file can be scanned again if needed
    e.target.value = '';
  };

  // Parse UPI URL or UPI text
  const handleDecodedData = (data) => {
    stopCamera();
    
    const trimmedData = data.trim();
    const lowerData = trimmedData.toLowerCase();

    // Handle standard upi://pay protocol (case-insensitive)
    if (lowerData.startsWith('upi://pay')) {
      try {
        const queryPart = trimmedData.substring(trimmedData.indexOf('?'));
        const urlParams = new URLSearchParams(queryPart);
        const pa = urlParams.get('pa') || '';
        const pn = urlParams.get('pn') || '';
        const am = urlParams.get('am') || '';
        const tn = urlParams.get('tn') || '';

        if (!pa) {
          setError('Invalid QR: UPI ID (pa) parameter is missing.');
          setStep('scan');
          return;
        }

        setUpiData({ pa, pn, am, tn });
        setPaymentAmount(am);
        setPaymentNote(tn);
        setStep('form');
      } catch (err) {
        setError('Error parsing UPI QR data parameters.');
        setStep('scan');
      }
    } 
    // Handle Web URLs that contain UPI parameters (e.g. https://bhimupi.org/pay?pa=merchant@upi)
    else if (lowerData.startsWith('http://') || lowerData.startsWith('https://')) {
      try {
        const urlObj = new URL(trimmedData);
        const pa = urlObj.searchParams.get('pa') || '';
        const pn = urlObj.searchParams.get('pn') || '';
        const am = urlObj.searchParams.get('am') || '';
        const tn = urlObj.searchParams.get('tn') || '';

        if (pa) {
          setUpiData({ pa, pn, am, tn });
          setPaymentAmount(am);
          setPaymentNote(tn);
          setStep('form');
        } else {
          setError('Decoded URL does not contain a UPI VPA parameter (pa). URL: ' + trimmedData.substring(0, 40));
          setStep('scan');
        }
      } catch (err) {
        setError('Failed to parse decoded URL parameters.');
        setStep('scan');
      }
    }
    // Handle raw VPA / UPI ID (e.g. merchant@okaxis)
    else {
      const vpaRegex = /^[\w.\-_]+@[\w.\-_]+$/;
      if (vpaRegex.test(trimmedData)) {
        setUpiData({
          pa: trimmedData,
          pn: trimmedData.split('@')[0].toUpperCase(),
          am: '',
          tn: ''
        });
        setPaymentAmount('');
        setPaymentNote('');
        setStep('form');
      } else {
        setError('QR content is not a valid UPI payee format. Content: ' + trimmedData.substring(0, 50));
        setStep('scan');
      }
    }
  };

  // Handle manual VPA pre-population
  useEffect(() => {
    if (isOpen && initialVpa) {
      handleDecodedData(initialVpa);
    }
  }, [isOpen, initialVpa]);

  // Toggle tab / Start camera accordingly
  useEffect(() => {
    if (isOpen && scanTab === 'camera' && step === 'scan' && !initialVpa) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, scanTab, step, initialVpa]);

  if (!isOpen) return null;

  // Build the UPI link for execution
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiData.pa)}&pn=${encodeURIComponent(upiData.pn)}&am=${encodeURIComponent(paymentAmount)}&cu=INR&tn=${encodeURIComponent(paymentNote || 'PayMe Link')}`;

  const handleProceedPayment = (e) => {
    e.preventDefault();
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }
    setError('');

    // Trigger redirection to UPI app
    window.location.href = upiUrl;

    const finalCategory = paymentCategory === 'CUSTOM' && customCategory.trim() 
      ? customCategory.trim() 
      : paymentCategory;

    const txId = 'tx_sb_qr_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    setActiveTxId(txId);

    // Auto-post transaction to the ledger with PENDING status
    if (onPostPayment) {
      onPostPayment({
        txId,
        toVpa: upiData.pa,
        amount: paymentAmount,
        description: paymentNote || `UPI to ${upiData.pn || 'Merchant'}`,
        category: finalCategory,
        status: 'PENDING'
      });
    }
    
    // Advance to display instructions/desktop QR code fallback
    setStep('pay');
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      {/* Neo-Brutalist Modal Container */}
      <div className="bg-[#FAF8F5] border-4 border-black w-full max-w-md shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-yellow-300 border-b-4 border-black p-4 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
            <span className="bg-black text-white px-2 py-0.5 border border-black text-xs font-mono">UPI.EXE</span>
            UPI QR SCANNER
          </h3>
          <button 
            onClick={handleClose}
            className="bg-black text-white hover:bg-red-500 hover:text-black border-2 border-black w-7 h-7 flex items-center justify-center font-black text-sm cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
          >
            ✕
          </button>
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* Error Message Toast */}
          {error && (
            <div className="bg-rose-300 border-2 border-black p-3 text-xs font-mono font-bold text-black flex justify-between items-start">
              <span>⚠️ {error}</span>
              <button onClick={() => setError('')} className="font-extrabold ml-2 hover:text-red-800">✕</button>
            </div>
          )}

          {/* STEP 1: SCANNING PHASE */}
          {step === 'scan' && (
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="flex gap-2">
                <button
                  onClick={() => setScanTab('camera')}
                  className={`flex-1 border-2 border-black py-2 font-mono text-xs font-bold uppercase cursor-pointer transition-all ${
                    scanTab === 'camera' ? 'bg-black text-[#94FFD8] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-black hover:bg-gray-100'
                  }`}
                >
                  CAMERA SCAN
                </button>
                <button
                  onClick={() => setScanTab('upload')}
                  className={`flex-1 border-2 border-black py-2 font-mono text-xs font-bold uppercase cursor-pointer transition-all ${
                    scanTab === 'upload' ? 'bg-black text-[#94FFD8] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-black hover:bg-gray-100'
                  }`}
                >
                  UPLOAD IMAGE
                </button>
              </div>

              {scanTab === 'camera' ? (
                <div className="space-y-3">
                  {/* Camera view screen */}
                  <div className="border-4 border-black bg-black aspect-video relative overflow-hidden flex items-center justify-center">
                    <video 
                      ref={videoRef}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Laser Scanner animation effect */}
                    <div className="absolute inset-x-0 top-0 h-1 bg-[#FF76CE] shadow-[0_0_10px_#FF76CE] animate-pulse" style={{
                      animation: 'scanLine 2.5s infinite linear',
                      position: 'absolute'
                    }} />

                    {/* Scanning Target Box Overlays */}
                    <div className="absolute border-2 border-dashed border-yellow-300 w-48 h-32 pointer-events-none opacity-70 flex items-center justify-center">
                      <span className="text-[9px] font-mono text-yellow-300 uppercase tracking-widest bg-black/60 px-1 py-0.5">ALIGN UPI QR CODE</span>
                    </div>

                    <canvas ref={canvasRef} className="hidden" />
                  </div>

                  <p className="text-[10px] font-mono text-gray-500 text-center font-bold">
                    Point your device camera at any standard UPI merchant QR code.
                  </p>

                  {/* Diagnostic Console Panel */}
                  <div className="bg-black text-[#94FFD8] border-2 border-black p-2 font-mono text-[9px] uppercase tracking-wide space-y-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex justify-between items-center border-b border-gray-800 pb-0.5 mb-1">
                      <span className="font-bold">SYSTEM DIAGNOSTICS:</span>
                      <span className="bg-[#94FFD8] text-black px-1 font-black animate-pulse">MONITOR</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 text-[8px]">
                      <div>STATE: <span className="text-white">{diagnosticText}</span></div>
                      <div>DECODER: <span className="text-white">jsQR v1.4</span></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* File Upload Selector */}
                  <div className="border-4 border-dashed border-black bg-amber-50 p-6 text-center flex flex-col items-center justify-center gap-3 relative cursor-pointer hover:bg-amber-100/50 transition-colors">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <svg className="w-10 h-10 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-mono text-xs font-black uppercase">SELECT QR IMAGE FILE</span>
                    <span className="text-[9px] font-mono text-gray-400 font-bold uppercase">PNG, JPG or WEBP formats supported</span>
                  </div>

                  <p className="text-[10px] font-mono text-gray-500 text-center font-bold">
                    Take a screenshot/photo of a QR code or upload it from your library.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: DETAILS FORM */}
          {step === 'form' && (
            <form onSubmit={handleProceedPayment} className="space-y-4">
              <span className="bg-black text-[#94FFD8] text-[9px] font-mono font-bold px-1.5 py-0.5 border border-black uppercase tracking-wider block w-max">
                PAYEE DETAILS EXTRACTED
              </span>

              <div className="bg-white border-2 border-black p-3 space-y-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 font-bold uppercase">
                  <span>Merchant/Payee:</span>
                  <span className="bg-yellow-100 text-yellow-800 px-1 border border-yellow-300 text-[8px]">VERIFIED QR</span>
                </div>
                <div className="text-sm font-black text-black uppercase truncate">{upiData.pn || 'Unknown Merchant'}</div>
                
                <div className="text-[10px] font-mono text-gray-400 font-bold uppercase pt-1">UPI address / VPA:</div>
                <div className="text-xs font-mono text-black break-all select-all font-bold">{upiData.pa}</div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-black mb-1 font-mono">Amount to Pay (₹):</label>
                <input 
                  type="number"
                  required
                  min="1"
                  step="any"
                  placeholder="Enter Amount"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-white border-3 border-black p-2 font-black text-base focus:outline-none"
                />

                {/* Quick amount selectors */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {[50, 100, 500, 1000, 2000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setPaymentAmount(amt.toString())}
                      className="border border-black bg-white hover:bg-yellow-200 px-3 py-1 font-mono text-xs font-bold shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] cursor-pointer"
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-black mb-1 font-mono">Category:</label>
                <select
                  value={paymentCategory}
                  onChange={(e) => setPaymentCategory(e.target.value)}
                  className="w-full bg-white border-3 border-black p-2 font-semibold text-xs focus:outline-none"
                >
                  <option value="Food & Dining">Food & Dining</option>
                  <option value="Groceries">Groceries</option>
                  <option value="Bills & Utilities">Bills & Utilities</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Travel & Transport">Travel & Transport</option>
                  <option value="Other">Other</option>
                  <option value="CUSTOM">[+] Add Custom Category...</option>
                </select>
              </div>

              {paymentCategory === 'CUSTOM' && (
                <div>
                  <label className="block text-xs font-bold uppercase text-black mb-1 font-mono">Custom Category Name:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Health, Education, Subscriptions"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full bg-white border-3 border-black p-2 font-semibold text-xs focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-black mb-1 font-mono">Note / Description (Optional):</label>
                <input 
                  type="text"
                  placeholder="Lunch, shopping, rent etc."
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full bg-white border-3 border-black p-2 font-semibold text-xs focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep('scan');
                    setError('');
                  }}
                  className="border-2 border-black bg-white hover:bg-gray-100 text-black px-4 py-2.5 font-mono text-xs font-bold uppercase cursor-pointer"
                >
                  BACK
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-black text-[#94FFD8] border-3 border-black py-2.5 font-extrabold uppercase tracking-wider text-xs shadow-[3px_3px_0px_0px_rgba(255,118,206,1)] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(255,118,206,1)] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
                >
                  PROCEED TO PAY
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: PAY REDIRECT & FALLBACK PANEL */}
          {step === 'pay' && (
            <div className="space-y-4 text-center">
              <span className="bg-black text-[#FF76CE] text-[9px] font-mono font-bold px-1.5 py-0.5 border border-black uppercase tracking-wider inline-block">
                PAYMENT DISPATCHED / WAITING
              </span>

              <div className="space-y-3">
                <p className="text-xs font-bold text-black uppercase">
                  Redirecting to your mobile UPI Payment App...
                </p>
                <p className="text-[10px] text-gray-500 font-mono font-bold">
                  (Google Pay, PhonePe, Paytm, or BHIM should open automatically on your mobile device)
                </p>
              </div>

              {/* QR Code fallback for Desktop / Cross-device */}
              <div className="bg-white border-3 border-black p-4 inline-block shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mx-auto">
                <p className="text-[9px] font-mono text-gray-500 font-bold uppercase pb-2">Desktop Fallback QR Code</p>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiUrl)}`}
                  alt="Payment QR Code"
                  className="mx-auto border-2 border-black w-44 h-44"
                />
                <span className="text-[9px] font-mono text-black font-black uppercase block pt-2">₹ {parseFloat(paymentAmount).toFixed(2)} to {upiData.pn || 'Merchant'}</span>
              </div>

              <div className="space-y-2.5 max-w-xs mx-auto">
                <button
                  onClick={() => {
                    if (onUpdateStatus) {
                      onUpdateStatus(activeTxId, 'COMPLETED');
                    }
                    handleClose();
                  }}
                  className="w-full border-2 border-black bg-emerald-400 hover:bg-emerald-500 text-black py-2.5 font-mono text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] cursor-pointer"
                >
                  ✓ CONFIRM SUCCESS & SETTLE
                </button>

                <button
                  onClick={() => {
                    if (onUpdateStatus) {
                      onUpdateStatus(activeTxId, 'FAILED');
                    }
                    handleClose();
                  }}
                  className="w-full border-2 border-black bg-rose-400 hover:bg-rose-500 text-black py-2.5 font-mono text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] cursor-pointer"
                >
                  ✕ CANCEL & VOID PAYMENT
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(upiUrl);
                    alert("UPI URI payment link copied to clipboard!");
                  }}
                  className="w-full border-2 border-black bg-white hover:bg-gray-100 text-black py-1.5 font-mono text-xs font-bold uppercase cursor-pointer"
                >
                  COPY PAYMENT LINK
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Embedded CSS injection for animation within react component */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scanLine {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
      `}} />
    </div>
  );
}

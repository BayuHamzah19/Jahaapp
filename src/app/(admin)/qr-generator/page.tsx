"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, QrCode } from "lucide-react";

export default function QRGenerator() {
  const [tableNumber, setTableNumber] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    // Get the base URL from the window object in the client
    setBaseUrl(window.location.origin);
  }, []);

  const qrUrl = tableNumber ? `${baseUrl}/?table=${tableNumber}` : baseUrl;

  const handleDownload = () => {
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;
    
    // Serialize SVG
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      // White background
      canvas.width = img.width + 40;
      canvas.height = img.height + 80;
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.drawImage(img, 20, 20);
        
        // Add text
        ctx.fillStyle = "#1B3022"; // Primary dark
        ctx.font = "bold 24px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`Table ${tableNumber}`, canvas.width / 2, canvas.height - 20);
        
        // Download
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `historica-table-${tableNumber}.png`;
        downloadLink.href = `${pngFile}`;
        downloadLink.click();
      }
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      <header className="bg-primary-dark text-white p-4 shadow-md flex items-center gap-3">
        <QrCode size={28} className="text-accent" />
        <h1 className="text-2xl font-serif font-bold tracking-wide">QR Generator</h1>
      </header>

      <main className="flex-1 p-8 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full border border-gray-100">
          <h2 className="text-xl font-bold text-primary-dark mb-2 text-center">Generate Table QR Code</h2>
          <p className="text-gray-500 text-sm text-center mb-8">
            Create scannable QR codes for your tables. Customers will be automatically assigned to this table when they scan.
          </p>

          <div className="mb-8">
            <label className="block text-sm font-bold text-gray-700 mb-2">Table Number</label>
            <input
              type="number"
              min="1"
              max="100"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="e.g. 12"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-bold text-primary-dark focus:border-accent focus:ring-0 outline-none transition-colors"
            />
          </div>

          <div className="flex flex-col items-center bg-gray-50 p-8 rounded-2xl border border-dashed border-gray-300 mb-8">
            {tableNumber ? (
              <>
                <div className="bg-white p-4 rounded-xl shadow-sm mb-4">
                  <QRCodeSVG 
                    id="qr-code-svg"
                    value={qrUrl} 
                    size={200}
                    level={"H"}
                    fgColor="#1B3022" // Historica primary
                  />
                </div>
                <p className="font-bold text-primary-dark text-xl">Table {tableNumber}</p>
                <p className="text-xs text-gray-400 mt-1 break-all max-w-[250px] text-center">{qrUrl}</p>
              </>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-400 flex-col">
                <QrCode size={64} className="mb-2 opacity-50" />
                <span>Enter table number</span>
              </div>
            )}
          </div>

          <button
            onClick={handleDownload}
            disabled={!tableNumber}
            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
              tableNumber 
                ? "bg-primary text-white hover:bg-primary-dark shadow-md" 
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Download size={20} />
            Download QR Code
          </button>
        </div>
      </main>
    </div>
  );
}

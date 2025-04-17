

// Import necessary libraries and hooks from React
import React, { useState, useEffect, useRef } from "react";
// Import the QRCode component from the 'qrcode.react' library
import { QRCodeCanvas } from "qrcode.react"; // Use QRCodeCanvas from qrcode.react

// Define the props for the QRCodeGenerator component
interface QRCodeGeneratorProps {
  link: string;
}

// Define the QRCodeGenerator functional component
const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ link }) => {
  // Declare a state variable 'inputLink' with an initial value of the 'link' prop
  const [inputLink, setInputLink] = useState(link);
  const qrRef = useRef<HTMLDivElement>(null);

  // Update the state when the 'link' prop changes
  useEffect(() => {
    setInputLink(link);
  }, [link]);

  // Event handler for input change, updates the 'inputLink' state with the input value
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputLink(event.target.value);
  };

  // Function to copy the QR code image to the clipboard
  const copyToClipboard = () => {
    if (qrRef.current) {
      const canvas = qrRef.current.querySelector("canvas");
      const img = qrRef.current.querySelector("img");
      if (canvas && img) {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const ctx = tempCanvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(canvas, 0, 0);
          const imgSize = canvas.width * 0.3;
          ctx.drawImage(
            img,
            (canvas.width - imgSize) / 2,
            (canvas.height - imgSize) / 2,
            imgSize,
            imgSize
          );
          tempCanvas.toBlob((blob) => {
            if (blob) {
              const item = new ClipboardItem({ "image/png": blob });
              navigator.clipboard.write([item]);
            }
          });
        }
      }
    }
  };

  // Render the component
  return (
    <div style={{ textAlign: "center" }}>
      {/* Title of the QR Code Generator */}
      <h1>QR Code Generator</h1>
      {/* Input field for entering the link (comment out for production) */}
      {/* {
        <input
          type="text"
          value={inputLink}
          onChange={handleChange}
          placeholder="Enter link"
          style={{ marginBottom: "10px" }}
        />
      } */}
      {/* Conditionally render the QRCode component if 'inputLink' is not empty */}
      {inputLink && (
        <div
          style={{ position: "relative", display: "inline-block" }}
          ref={qrRef}
        >
          <QRCodeCanvas value={inputLink} size={256} />
          <img
            src="http://localhost:3000/logo.svg" // Use hardcoded URL for the logo, this is not recommended but works for prototyping
            alt="Logo"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "30%",
              height: "30%",
            }}
          />
        </div>
      )}
      {/* Button to copy the QR code image to the clipboard */}
      <div style={{ marginTop: "10px", width: "256px", margin: "0 auto" }}>
        <button style={{ width: "100%" }} onClick={copyToClipboard}>
          Copy to Clipboard
        </button>
      </div>
    </div>
  );
};

// Export the QRCodeGenerator component as the default export
export default QRCodeGenerator;

/**
 * Usage:
 *
 * To use the QRCodeGenerator component in another component and pass a link to it, follow these steps:
 *
 * 1. Import the QRCodeGenerator component:
 *    import QRCodeGenerator from "../components/QRCodeGenerator";
 *
 * 2. Use the QRCodeGenerator component and pass the 'link' prop:
 *    const AnotherComponent: React.FC = () => {
 *      const link = "https://example.com";
 *
 *      return (
 *        <div>
 *          <h2>Another Component</h2>
 *          <QRCodeGenerator link={link} />
 *        </div>
 *      );
 *    };
 *
 * 3. Add the new component to your routes if needed:
 *    <Route path="/another" element={<AnotherComponent />} />
 */



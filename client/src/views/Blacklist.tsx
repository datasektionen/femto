import React, { useState, ChangeEvent } from "react";
import axios from "axios";
import Configuration from "../configuration";
import { useAuth } from "../autherization/useAuth"; // Import your authentication hook
import { useNavigate } from "react-router-dom"; // Import navigate for redirection

const api = axios.create({
  baseURL: Configuration.backendApiUrl
});


const BlacklistUploadPage: React.FC = () => {
  // 'file' is either a File or null; 'message' is a string.
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string>("");
  const { hasToken } = useAuth(); // Get authentication state from your auth context

  const navigate = useNavigate();
  
  let fail = false;
  if (!hasToken && fail) {
    navigate('/login'); // Redirect to login if not authenticated
    return;
  }

  // ChangeEvent for an HTMLInputElement conveys file input events.
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    }
  };

  // The async function returns a Promise that resolves to void.
  const handleUpload = async (): Promise<void> => {
    if (!file) {
      setMessage("Please select a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem('token');
      const response = await api.post("/api/blacklist/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}` // Uncomment if you need to send a token
        }
      });
      console.log(response.data);
      setMessage("Upload successful!");
    } catch (error) {
      setMessage("Error uploading file. Please try again.");
      console.error("Upload error:", error);
    }
  };


  return (
    <div
      style={{
        padding: "20px",
        fontFamily: `"Comic Sans MS", "Comic Sans", cursive`
      }}
    >
      <h2>Upload Blacklist File</h2>
      <input type="file" accept=".txt" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>
      {message && <p>{message}</p>}
    </div>
  );
};

export default BlacklistUploadPage;

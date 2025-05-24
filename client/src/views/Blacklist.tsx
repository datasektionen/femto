import React, { useState } from "react";
import axios from "axios";
import Configuration from "../configuration";
import { useAuth } from "../authorization/useAuth"; // Import your authentication hook
import { useNavigate } from "react-router-dom"; // Import navigate for redirection
import {
    Button,
    Card,
    Center,
    FileInput,
    Stack,
    Text,
    Title,
    Alert,
    Loader,
} from "@mantine/core";
import { Header } from "methone";
import { IconUpload, IconX, IconCheck } from "@tabler/icons-react";

const api = axios.create({
    baseURL: Configuration.backendApiUrl
});


const BlacklistUploadPage: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [message, setMessage] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState<boolean>(false);
    const { hasToken } = useAuth();
    const navigate = useNavigate();

    // Redirect to login if not authenticated
    // This effect runs when the component mounts or hasToken changes.
    React.useEffect(() => {
        if (!hasToken) {
            navigate('/login');
        }
    }, [hasToken, navigate]);


    const handleFileChange = (selectedFile: File | null): void => {
        setFile(selectedFile);
        setMessage(""); // Clear previous messages
        setError(null); // Clear previous errors
    };

    const handleUpload = async (): Promise<void> => {
        if (!file) {
            setError("Please select a file first.");
            return;
        }

        setUploading(true);
        setMessage("");
        setError(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError("Authentication error: No token found. Please log in again.");
                setUploading(false);
                return;
            }

            const response = await api.post("/api/blacklist/upload", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${token}`
                }
            });
            console.log(response.data);
            setMessage("Upload successful!");
            setFile(null); // Clear the file input after successful upload
        } catch (err) {
            setError("Error uploading file. Please try again.");
            console.error("Upload error:", err);
        } finally {
            setUploading(false);
        }
    };


    return (
        <>
            <Header title="Svartlista" />
            <Center py="xl">
                <Card shadow="sm" radius="lg" withBorder w="100%" maw={600} p="xl">
                    <Stack gap="lg">
                        <Title order={2}>Ladda upp svartlista</Title>
                        <Text>
                            Ladda upp en .txt-fil med svartlistade länkar. Varje länk ska vara på en ny rad i formatet: <Text span fw={500}>svartlistad-lank.com</Text>
                        </Text>

                        {message && (
                            <Alert icon={<IconCheck size="1rem" />} title="Success" color="green" withCloseButton onClose={() => setMessage("")}>
                                {message}
                            </Alert>
                        )}

                        {error && (
                            <Alert icon={<IconX size="1rem" />} title="Error" color="red" withCloseButton onClose={() => setError(null)}>
                                {error}
                            </Alert>
                        )}

                        <FileInput
                            label="Blacklist File"
                            placeholder="Välj en .txt fil"
                            accept=".txt"
                            value={file}
                            onChange={handleFileChange}
                            disabled={uploading}
                            clearable
                        />

                        <Button
                            onClick={handleUpload}
                            disabled={!file || uploading}
                            loading={uploading}
                            leftSection={<IconUpload size={14} />}
                        >
                            Ladda upp
                        </Button>

                        {uploading && (
                            <Center mt="md">
                                <Loader />
                            </Center>
                        )}
                    </Stack>
                </Card>
            </Center>
        </>
    );
};

export default BlacklistUploadPage;
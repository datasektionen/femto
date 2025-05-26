import React, { useState } from "react";
import axios from "axios";
import Configuration from "../configuration";
import { useAuth } from "../authorization/useAuth";
import { useNavigate } from "react-router-dom";
import {
    Button,
    Card,
    Center,
    FileInput,
    Stack,
    Text,
    Title,
    Alert,
    Group,
    Badge,
    Progress,
    Box,
} from "@mantine/core";
import { Header } from "methone";
import {
    IconUpload,
    IconX,
    IconCheck,
    IconFile,
    IconDatabase,
    IconExclamationCircle,
    IconInfoCircle,
    IconPlus,
    IconMinus
} from "@tabler/icons-react";

const api = axios.create({
    baseURL: Configuration.backendApiUrl,
    timeout: 300000, // 5 minutes timeout for large file uploads
});

interface UploadResult {
    message: string;
    totalLines: number;
    uniqueDomains: number;
    invalidLines: number;
    insertedDomains: number;
    skippedDomains: number;
    filename: string;
}

interface ApiError {
    error: string;
    details?: string;
}

const BlacklistUploadPage: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState<boolean>(false);
    const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { hasToken, manageBlacklist } = useAuth();
    const navigate = useNavigate();
    const iconSize = 18;

    // Redirect to login if not authenticated
    React.useEffect(() => {
        if (!hasToken || !manageBlacklist) {
            navigate('/login');
        }
    }, [hasToken, manageBlacklist, navigate]);

    const handleFileChange = (selectedFile: File | null): void => {
        setFile(selectedFile);
        setUploadResult(null); // Clear previous results
        setError(null); // Clear previous errors
    };

    const validateFile = (file: File): string | null => {
        // Check file size (max 100MB)
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            return "Filen är för stor. Maximal storlek är 100MB.";
        }

        // Check file type
        const allowedTypes = ['text/plain', 'application/octet-stream'];
        const allowedExtensions = ['.txt', '.hosts'];

        const hasValidType = allowedTypes.includes(file.type);
        const hasValidExtension = allowedExtensions.some(ext =>
            file.name.toLowerCase().endsWith(ext)
        );

        if (!hasValidType && !hasValidExtension) {
            return "Endast .txt och .hosts filer är tillåtna.";
        }

        return null;
    };

    const handleUpload = async (): Promise<void> => {
        if (!file) {
            setError("Vänligen välj en fil först.");
            return;
        }

        const validationError = validateFile(file);
        if (validationError) {
            setError(validationError);
            return;
        }

        setUploading(true);
        setUploadResult(null);
        setError(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError("Autentiseringsfel: Ingen token hittades. Vänligen logga in igen.");
                return;
            }

            const response = await api.post<UploadResult>("/api/blacklist/upload", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${token}`
                },
                onUploadProgress: (progressEvent) => {
                    // Optional: You could add a progress bar here
                    if (progressEvent.total) {
                        const percentCompleted = Math.round(
                            (progressEvent.loaded * 100) / progressEvent.total
                        );
                        console.log(`Upload progress: ${percentCompleted}%`);
                    }
                }
            });

            setUploadResult(response.data);
            setFile(null); // Clear the file input after successful upload

        } catch (err) {
            console.error("Upload error:", err);

            if (axios.isAxiosError(err)) {
                if (err.response?.status === 401) {
                    setError("Autentiseringsfel: Vänligen logga in igen.");
                    navigate('/login');
                } else if (err.response?.status === 413) {
                    setError("Filen är för stor för servern.");
                } else if (err.response?.data && typeof err.response.data === 'object') {
                    const apiError = err.response.data as ApiError;
                    setError(apiError.error || "Ett fel uppstod vid uppladdning.");
                } else {
                    setError("Ett fel uppstod vid uppladdning. Vänligen försök igen.");
                }
            } else {
                setError("Ett oväntat fel uppstod. Vänligen försök igen.");
            }
        } finally {
            setUploading(false);
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getInsertionRate = (inserted: number, unique: number): number => {
        if (unique === 0) return 0;
        return Math.round((inserted / unique) * 100);
    };

    return (
        <>
            <Header title="Svartlista" />
            <Box id="content" p="md">
                <Center>
                    <Card shadow="sm" radius="lg" withBorder w="100%" maw={700} p="xl">
                        <Stack gap="lg">
                            <Title order={2}>Ladda upp svartlista</Title>

                            <Alert radius="md" icon={<IconInfoCircle size={iconSize} />} color="blue">
                                <Text size="sm">
                                    Ladda upp en .txt eller .hosts fil med svartlistade domäner.
                                    Stödjer både hosts-format (0.0.0.0 domain.custom)
                                    och enkla domänlistor (domain.com).
                                </Text>
                            </Alert>

                            {error && (
                                <Alert
                                    radius="md"
                                    icon={<IconX size={iconSize} />}
                                    title="Fel"
                                    color="red"
                                    withCloseButton
                                    onClose={() => setError(null)}
                                >
                                    {error}
                                </Alert>
                            )}

                            {uploadResult && (
                                <Alert
                                    radius="md"
                                    icon={<IconCheck size={iconSize} />}
                                    title="Uppladdning lyckades!"
                                    color="green"
                                    withCloseButton
                                    onClose={() => setUploadResult(null)}
                                >
                                    <Stack gap="sm">
                                        <Text>
                                            Fil "{uploadResult.filename}" har bearbetats framgångsrikt.
                                        </Text>

                                        {/* File Processing Statistics */}
                                        <Group>

                                            <Badge color="blue" variant="light" leftSection={<IconFile size={iconSize} />}>
                                                {uploadResult.totalLines} rader totalt
                                            </Badge>

                                            <Badge color="cyan" variant="light" leftSection={<IconDatabase size={iconSize} />}>
                                                {uploadResult.uniqueDomains} unika domäner
                                            </Badge>

                                            {uploadResult.invalidLines > 0 && (
                                                <Badge color="orange" variant="light" leftSection={<IconExclamationCircle size={iconSize} />}>
                                                    {uploadResult.invalidLines} ogiltiga rader
                                                </Badge>
                                            )}

                                            <Badge color="green" variant="light" leftSection={<IconPlus size={iconSize} />}>
                                                {uploadResult.insertedDomains} nya domäner
                                            </Badge>

                                            {uploadResult.skippedDomains > 0 && (
                                                <Badge color="gray" variant="light" leftSection={<IconMinus size={iconSize} />}>
                                                    {uploadResult.skippedDomains} redan fanns
                                                </Badge>
                                            )}

                                        </Group>

                                        {/* Progress Bar for Insertion Rate */}
                                        <Box>
                                            <Group justify="space-between" mb="xs">
                                                <Text>
                                                    Nya domäner tillagda
                                                </Text>
                                                <Text>
                                                    {getInsertionRate(uploadResult.insertedDomains, uploadResult.uniqueDomains)}%
                                                </Text>
                                            </Group>
                                            <Progress
                                                value={getInsertionRate(uploadResult.insertedDomains, uploadResult.uniqueDomains)}
                                                color="green"
                                                size="sm"
                                                radius="xl"
                                            />
                                        </Box>


                                    </Stack>
                                </Alert>
                            )}

                            <FileInput
                                radius="md"
                                description="Välj en .txt eller .hosts fil (max 100MB)"
                                placeholder="Välj en fil"
                                accept=".txt,.hosts"
                                value={file}
                                onChange={handleFileChange}
                                disabled={uploading}
                                clearable
                            />

                            {file && (
                                <Box>
                                    <Text size="sm" c="dimmed">
                                        Vald fil: {file.name} ({formatFileSize(file.size)})
                                    </Text>
                                </Box>
                            )}

                            <Button
                                radius="md"
                                onClick={handleUpload}
                                disabled={!file || uploading}
                                loading={uploading}
                                leftSection={<IconUpload size={iconSize} />}
                                size="md"
                            >
                                {uploading ? 'Laddar upp...' : 'Ladda upp'}
                            </Button>
                        </Stack>
                    </Card>
                </Center>
            </Box>
        </>
    );
};

export default BlacklistUploadPage;
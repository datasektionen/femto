// Links.tsx (Komplett Översiktsvy - Vite + Axios Instance)

import React, { useEffect, useState } from "react";
import {
    Button,
    Alert,
    Select,
    Pagination,
    Text,
    Group,
    Container,
    Badge,
    Box,
    Stack,
    Card,
    Tooltip, // Added Tooltip
} from "@mantine/core"; // Använder Mantine v4-komponenter
import {
    IconTrash,
    IconInfoSquare,
    IconClipboard,
    IconQrcode,
    IconTrashFilled, // Added IconTrashFilled
    IconInfoSquareFilled, // Added IconInfoSquareFilled
    IconClipboardFilled, // Added IconCopyCheck as a hover alternative for IconCopy
    IconClipboardCheck, // Added IconCopyCheck as a hover alternative for IconCopy
    IconClipboardCheckFilled,
} from "@tabler/icons-react"; // Importera ikoner från Tabler Icons
import { Header } from "methone";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../autherization/useAuth"; // Import your authentication hook
import Configuration from "../configuration.ts";
import { toCanvas } from "qrcode";

// Function to extract just the group name from "group_name@group_domain" format
function extractGroupName(groupWithDomain: string | null): string {
    if (!groupWithDomain) return 'Ingen grupp';
    
    const parts = groupWithDomain.split('@');
    return parts[0] || 'Okänd grupp';
}

// Create axios instance with base URL - we'll add the token dynamically in the requests
const api = axios.create({
    baseURL: Configuration.backendApiUrl,
});

// Interface för Link
interface Link {

    id: string;
    slug: string;
    url: string;
    description: string;
    date: string; // ISO String
    expires: string | null; // ISO String or null
    clicks: number;
    user_id: string | null;
    group_name: string | null;
}

const Links: React.FC = () => {
    // --- State ---
    const [linksData, setLinksData] = useState<Link[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>("newest-oldest");
    const [activePage, setActivePage] = useState(1);
    const itemsPerPage = 5;
    const { hasToken } = useAuth(); // Get authentication state from your auth context
    const iconSize = 22; // Define icon size for consistency

    // State for button hover effects - store the slug of the hovered link
    const [hoveredCopyLinkSlug, setHoveredCopyLinkSlug] = useState<string | null>(null);
    const [hoveredDetailsLinkSlug, setHoveredDetailsLinkSlug] = useState<string | null>(null);
    const [hoveredRemoveLinkSlug, setHoveredRemoveLinkSlug] = useState<string | null>(null);

    // State to track which link has been copied and show the check icon
    const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

    const navigate = useNavigate();

    // --- Effects ---
    // Hämta länkar vid mount
    useEffect(() => {
        if (!hasToken) {
            navigate("/login"); // Redirect to login if not authenticated
            return;
        }

        setLoading(true);
        setError(null);

        // Get the JWT token from localStorage
        const token = localStorage.getItem("token");

        api
            .get<Link[]>("/api/links", {
                headers: {
                    Authorization: `Bearer ${token}`, // Use the JWT token from login
                },
            })
            .then((res) => {
                setLinksData(res.data);
                console.log("Hämtade länkar:", res.data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Fel vid hämtning av länkar:", err);
                if (axios.isAxiosError(err)) {
                    if (err.response?.status === 401 || err.response?.status === 403) {
                        setError("Åtkomst nekad. Du behöver logga in igen.");
                        navigate("/login"); // Redirect to login on auth error
                    } else {
                        setError("Kunde inte hämta länkar. Nätverks- eller serverfel.");
                    }
                } else {
                    setError("Ett okänt fel inträffade vid hämtning av länkar.");
                }
                setLoading(false);
            });
    }, [hasToken, navigate]); // Added dependencies

    const handleCopy = (slug: string) => {
        const shortUrl = `${Configuration.backendApiUrl}/${slug}`;
        navigator.clipboard
            .writeText(shortUrl)
            .then(() => {
                console.log("Kopierad kort länk:", shortUrl);
                setCopiedSlug(slug); // Set the copied slug
                setTimeout(() => setCopiedSlug(null), 2000); // Clear after 2 seconds
            })
            .catch((err) => console.error("Kunde inte kopiera kort länk:", err));
    };

    const handleShowDetails = (slug: string) => {
        navigate(`/links/${slug}/stats`);
    };

    const handleRemove = (slug: string) => {
        if (!window.confirm("Är du säker på att du vill ta bort denna länk?")) {
            return;
        }
        api.delete(`/api/links/${slug}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}` // Use the JWT token from login
            }
        });
        // refresh the links list after deletion
        setLinksData((prevLinks) => prevLinks.filter((link) => link.slug !== slug));
    };

    const handleQRCode = async (slug: string): Promise<void> => {
        const canvas = document.createElement('canvas');
        const logoSrc = '/logo.svg';
        const url = `${Configuration.backendApiUrl}/${slug}`;

        // Generate QR with high error correction
        await toCanvas(canvas, url, {
            width: 160,
            margin: 1,
            errorCorrectionLevel: 'H', // Match ecLevel="H"
        });

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const logo = new Image();
        logo.crossOrigin = 'anonymous';
        logo.onload = () => {
            const logoSize = 40;
            const padding = 5;
            const sizeWithPadding = logoSize + padding * 2;
            const x = (canvas.width - sizeWithPadding) / 2;
            const y = (canvas.height - sizeWithPadding) / 2;

            // Draw white background (padding effect)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x, y, sizeWithPadding, sizeWithPadding);

            // Draw logo centered
            ctx.drawImage(logo, x + padding, y + padding, logoSize, logoSize);

            // Trigger download
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `${slug}.png`;
            link.click();
        };
        logo.src = logoSrc;
    };

    function stringToColor(str: string | null | undefined): string {
        // Handle null or undefined input
        if (!str) {
            console.warn("Input string is null or undefined. Using default value.");
            str = "default"; // Default value if input is null or undefined
        }

        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }

        // Generate color components based on the hash
        const r = (hash & 0xff0000) >> 16;
        const g = (hash & 0x00ff00) >> 8;
        const b = hash & 0x0000ff;

        // Return the color as an RGB string
        return `rgb(${r}, ${g}, ${b})`;
    }


    if (loading) {
        return (
            <div id="content">
                <Text>Laddar länkar...</Text>
            </div>
        );
    }
    if (error) {
        return (
            <>
                <Header title="Fel" />
                <div id="content">
                    <Alert color="red" title="Fel">
                        {error}
                    </Alert>
                </div>
            </>
        );
    }

    const sortedLinks = [...linksData].sort((a, b) => {
        switch (filter) {
            case "newest-oldest":
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            case "oldest-newest":
                return new Date(a.date).getTime() - new Date(b.date).getTime();
            case "clicks-ascending":
                return a.clicks - b.clicks;
            case "clicks-descending":
                return b.clicks - a.clicks;
            case "slug-a-z":
                return a.slug.localeCompare(b.slug);
            case "slug-z-a":
                return b.slug.localeCompare(a.slug);
            default:
                return 0;
        }
    });

    const totalPages = Math.ceil(sortedLinks.length / itemsPerPage);
    const paginatedLinks = sortedLinks.slice(
        (activePage - 1) * itemsPerPage,
        activePage * itemsPerPage
    );

    return (
        <>
            <Header title="Länkar - Översikt" />
            <Container>
                <Box mb="md" mt="md">
                    {!hasToken && (
                        <Alert title="Du är inte inloggad" color="blue" mb="md">
                            Logga in för att förkorta länkar
                        </Alert>
                    )}
                    <Select
                        label="Sortera efter"
                        value={filter}
                        radius="lg"
                        onChange={(value) => {
                            setFilter(value || "newest-oldest");
                            setActivePage(1);
                        }}
                        data={[
                            { value: "newest-oldest", label: "Nyast först" },
                            { value: "oldest-newest", label: "Äldst först" },
                            { value: "clicks-descending", label: "Mest klick (fallande)" },
                            { value: "clicks-ascending", label: "Minst klick (stigande)" },
                            { value: "slug-a-z", label: "Slug (A-Ö)" },
                            { value: "slug-z-a", label: "Slug (Ö-A)" },
                        ]}
                    />
                </Box>

                <Box mb="md" mt="md">
                    <Stack gap="xs">
                        {paginatedLinks.length > 0 ? (
                            paginatedLinks.map((link) => (
                                <Card
                                    key={link.id}
                                    withBorder
                                    radius="lg"
                                    shadow="sm"
                                >

             
                                    <Group style={{ display: "flex", justifyContent: "space-between" }}>
                                        {/* Text (Slug, URL) on the LEFT */}
                                        <Group gap="sm" justify="flex-start">
                                            <Text
                                                fw={500}
                                            >
                                                {link.slug}
                                            </Text>
                                            <a
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title={link.url}
                                            >
                                                {link.url}
                                            </a>
                                            <Badge color={link.group_name ? stringToColor(link.group_name) : 'gray'} variant="light">
                                                {extractGroupName(link.group_name)}
                                            </Badge>
                                        </Group>

                                        {/* Buttons on the RIGHT */}
                                        <Group gap="sm" justify="flex-end">
                                        <Tooltip label="Se detaljer" withArrow>
                                                <Button
                                                    size="sm"
                                                    variant="filled"
                                                    radius="md"
                                                    onClick={() => handleShowDetails(link.slug)}
                                                    onMouseEnter={() => setHoveredDetailsLinkSlug(link.slug)}
                                                    onMouseLeave={() => setHoveredDetailsLinkSlug(null)}
                                                >
                                                    {hoveredDetailsLinkSlug === link.slug ? <IconInfoSquareFilled size={iconSize} /> : <IconInfoSquare size={iconSize} />}
                                                </Button>
                                            </Tooltip>
                                            <Tooltip label="Kopiera förkortad länk" withArrow>
                                                <Button
                                                    size="sm"
                                                    variant="light"
                                                    radius="md"
                                                    onClick={() => handleCopy(link.slug)}
                                                    onMouseEnter={() => setHoveredCopyLinkSlug(link.slug)}
                                                    onMouseLeave={() => setHoveredCopyLinkSlug(null)}
                                                >
                                                    {copiedSlug === link.slug ? (
                                                        hoveredCopyLinkSlug === link.slug ? (
                                                            <IconClipboardCheckFilled size={iconSize} />
                                                        ) : (
                                                            <IconClipboardCheck size={iconSize} />
                                                        )
                                                    ) : (
                                                        hoveredCopyLinkSlug === link.slug ? (
                                                            <IconClipboardFilled size={iconSize} />
                                                        ) : (
                                                            <IconClipboard size={iconSize} />
                                                        )
                                                    )}
                                                </Button>
                                            </Tooltip>
                                            <Tooltip label="Ladda ner QR-kod" withArrow>
                                                <Button
                                                    size="sm"
                                                    variant="light"
                                                    radius="md"
                                                    onClick={() => handleQRCode(link.slug)}
                                                >
                                                    <IconQrcode size={iconSize} />
                                                </Button>
                                            </Tooltip>
                                            <Tooltip label="Ta bort länk" withArrow>
                                                <Button
                                                    size="sm"
                                                    variant="light"
                                                    color="red"
                                                    radius="md"
                                                    onClick={() => handleRemove(link.slug)}
                                                    onMouseEnter={() => setHoveredRemoveLinkSlug(link.slug)}
                                                    onMouseLeave={() => setHoveredRemoveLinkSlug(null)}
                                                >
                                                    {hoveredRemoveLinkSlug === link.slug ? <IconTrashFilled size={iconSize} /> : <IconTrash size={iconSize} />}
                                                </Button>
                                            </Tooltip>
                                        </Group>

                                    </Group>
                                </Card>
                            ))
                        ) : (
                            <Text ta="center" c="dimmed">
                                Inga länkar att visa.
                            </Text>
                        )}
                    </Stack>

                    {totalPages > 1 && (
                        <Pagination
                            style={{
                                marginTop: "20px",
                                display: "flex",
                                justifyContent: "center",
                            }}
                            value={activePage}
                            onChange={setActivePage}
                            total={totalPages}
                        />
                    )}
                </Box>
            </Container>
        </>
    );
};

export default Links;
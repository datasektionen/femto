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
    Stack,
    Card,
    Tooltip, // Added Tooltip
} from "@mantine/core"; // Använder Mantine v4-komponenter
import { notifications } from "@mantine/notifications";
import {
    IconTrash,
    IconInfoSquare,
    IconClipboard,
    IconTrashFilled, // Added IconTrashFilled
    IconInfoSquareFilled, // Added IconInfoSquareFilled
    IconClipboardFilled, // Added IconCopyCheck as a hover alternative for IconCopy
} from "@tabler/icons-react"; // Importera ikoner från Tabler Icons
import { Header } from "methone";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../autherization/useAuth"; // Import your authentication hook
import Configuration from "../configuration.ts";


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
    group: string | null;
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

    // State for button hover effects - store the slug of the hovered link
    const [hoveredCopyLinkSlug, setHoveredCopyLinkSlug] = useState<string | null>(null);
    const [hoveredDetailsLinkSlug, setHoveredDetailsLinkSlug] = useState<string | null>(null);
    const [hoveredRemoveLinkSlug, setHoveredRemoveLinkSlug] = useState<string | null>(null);

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

    const copyToClipboard = (slug: string) => {
        const shortUrl = `${Configuration.backendApiUrl}/${slug}`;
        navigator.clipboard
            .writeText(shortUrl)
            .then(() => console.log("Kopierad kort länk:", shortUrl))
            .catch((err) => console.error("Kunde inte kopiera kort länk:", err));
        notifications.show({
            title: "Kopierad",
            autoClose: 2000,
            message: undefined
        });
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
                {!hasToken && (
                    <Alert title="Du är inte inloggad" color="blue" mb="md">
                        Logga in för att förkorta länkar
                    </Alert>
                )}
                <div style={{ marginBottom: "25px", maxWidth: "300px" }}>
                    <Select
                        label="Sortera efter"
                        value={filter}
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
                </div>

                <div>
                    <Stack gap="xs">
                        {paginatedLinks.length > 0 ? (
                            paginatedLinks.map((link) => (
                                <Card
                                    key={link.id}
                                    withBorder
                                    radius="sm"
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
                                        </Group>

                                        {/* Buttons on the RIGHT */}
                                        <Group gap="sm" justify="flex-end">
                                            <Tooltip label="Kopiera förkortad länk" withArrow>
                                                <Button
                                                    size="sm"
                                                    variant="light"
                                                    radius="md"
                                                    onClick={() => copyToClipboard(link.slug)}
                                                    onMouseEnter={() => setHoveredCopyLinkSlug(link.slug)}
                                                    onMouseLeave={() => setHoveredCopyLinkSlug(null)}
                                                >
                                                    {hoveredCopyLinkSlug === link.slug ? <IconClipboardFilled size={18} /> : <IconClipboard size={18} />}
                                                </Button>
                                            </Tooltip>
                                            <Tooltip label="Se detaljer" withArrow>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    radius="md"
                                                    onClick={() => handleShowDetails(link.slug)}
                                                    onMouseEnter={() => setHoveredDetailsLinkSlug(link.slug)}
                                                    onMouseLeave={() => setHoveredDetailsLinkSlug(null)}
                                                >
                                                    {hoveredDetailsLinkSlug === link.slug ? <IconInfoSquareFilled size={18} /> : <IconInfoSquare size={18} />}
                                                </Button>
                                            </Tooltip>
                                            <Tooltip label="Ta bort länk" withArrow>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    color="red"
                                                    radius="md"
                                                    onClick={() => handleRemove(link.slug)}
                                                    onMouseEnter={() => setHoveredRemoveLinkSlug(link.slug)}
                                                    onMouseLeave={() => setHoveredRemoveLinkSlug(null)}
                                                >
                                                    {hoveredRemoveLinkSlug === link.slug ? <IconTrashFilled size={18} /> : <IconTrash size={18} />}
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
                </div>
            </Container>
        </>
    );
};

export default Links;

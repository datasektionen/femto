// Links.tsx (Komplett Översiktsvy - Vite + Axios Instance)

import React, { useEffect, useState, useMemo } from "react"; // Added useMemo
import {
    Button,
    Alert,
    Select,
    Pagination,
    Text,
    Group,
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
    IconUser,
    IconUsersGroup,
    IconPointer,
} from "@tabler/icons-react"; // Importera ikoner från Tabler Icons
import { Header } from "methone";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../autherization/useAuth"; // Import your authentication hook
import Configuration from "../configuration.ts";
import { toCanvas } from "qrcode";

// Function to extract just the group name from "group_name@group_domain" format
function extractGroupName(groupWithDomain: string | null): string {
    if (!groupWithDomain) return "Ingen grupp";

    const parts = groupWithDomain.split("@");
    return parts[0] || "Okänd grupp";
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
    const [filter, setFilter] = useState<string>("newest-oldest"); // For sorting
    const [propertyFilter, setPropertyFilter] = useState<string>("all"); // New state for property filtering
    const [activePage, setActivePage] = useState(1);
    const itemsPerPage = 5;
    const { hasToken } = useAuth(); // Get authentication state from your auth context
    const iconSize = 22; // Define icon size for consistency
    const badgeIconSize = 14; // Define badge icon size for consistency

    // State for button hover effects - store the slug of the hovered link
    const [hoveredCopyLinkSlug, setHoveredCopyLinkSlug] = useState<string | null>(
        null
    );
    const [hoveredDetailsLinkSlug, setHoveredDetailsLinkSlug] = useState<
        string | null
    >(null);
    const [hoveredRemoveLinkSlug, setHoveredRemoveLinkSlug] = useState<
        string | null
    >(null);

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

    // Generate options for the property filter select
    const propertyFilterOptions = useMemo(() => {
        const options: { value: string; label: string }[] = [{ value: "all", label: "Alla länkar" }];
        options.push({ value: "expires_null", label: "Utgår aldrig" });

        const uniqueUserIds = new Set<string>();
        linksData.forEach(link => {
            if (link.user_id && link.user_id.toUpperCase() !== "NULL") {
                uniqueUserIds.add(link.user_id);
            }
        });
        uniqueUserIds.forEach(userId => {
            options.push({ value: `user_${userId}`, label: `Användare: ${userId}` });
        });

        const uniqueGroupNames = new Set<string>();
        linksData.forEach(link => {
            const groupName = extractGroupName(link.group_name);
            if (groupName && groupName !== "Ingen grupp" && groupName !== "Okänd grupp" && groupName.toUpperCase() !== "NULL") {
                uniqueGroupNames.add(groupName);
            }
        });
        uniqueGroupNames.forEach(groupName => {
            options.push({ value: `group_${groupName}`, label: `Grupp: ${groupName}` });
        });

        return options;
    }, [linksData]);

    // Apply property filter first
    const filteredByPropertyLinks = useMemo(() => {
        if (propertyFilter === "all") {
            return linksData;
        }
        if (propertyFilter === "expires_null") {
            return linksData.filter(link => link.expires === null);
        }
        if (propertyFilter.startsWith("user_")) {
            const userIdToFilter = propertyFilter.substring(5);
            return linksData.filter(link => link.user_id === userIdToFilter);
        }
        if (propertyFilter.startsWith("group_")) {
            const groupNameToFilter = propertyFilter.substring(6);
            return linksData.filter(link => extractGroupName(link.group_name) === groupNameToFilter);
        }
        return linksData;
    }, [linksData, propertyFilter]);

    const sortedLinks = useMemo(() => [...filteredByPropertyLinks].sort((a, b) => {
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
    }), [filteredByPropertyLinks, filter]); // Added useMemo and dependencies

    const paginatedLinks = useMemo(() => sortedLinks.slice(
        (activePage - 1) * itemsPerPage,
        activePage * itemsPerPage
    ), [sortedLinks, activePage, itemsPerPage]); // Added useMemo and dependencies

    const totalPages = useMemo(() => Math.ceil(sortedLinks.length / itemsPerPage), [sortedLinks, itemsPerPage]); // Added useMemo and dependencies


    // Conditional returns are now AFTER all hook calls
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
                Authorization: `Bearer ${localStorage.getItem("token")}`, // Use the JWT token from login
            },
        });
        // refresh the links list after deletion
        setLinksData((prevLinks) => prevLinks.filter((link) => link.slug !== slug));
    };

    const handleQRCode = async (slug: string): Promise<void> => {
        const canvas = document.createElement("canvas");
        const logoSrc = "/logo.svg"; // Corresponds to QRCode component's logoImage prop
        const url = `${Configuration.backendApiUrl}/${slug}`; // Corresponds to QRCode component's value prop

        const qrCanvasSize = 300; // Corresponds to QRCode component's size prop
        const errorCorrectionLevel = "H"; // Corresponds to QRCode component's ecLevel prop
        const logoDisplaySize = 100; // Corresponds to QRCode component's logoWidth prop

        // Explicitly set canvas dimensions.
        // The `toCanvas` function's `width` option also influences the final QR code size.
        canvas.width = qrCanvasSize;
        canvas.height = qrCanvasSize;

        // Generate QR with high error correction
        await toCanvas(canvas, url, {
            width: qrCanvasSize, // Ensure QR code is drawn at the specified size
            margin: 1, // Minimal margin for the QR code pattern
            errorCorrectionLevel: errorCorrectionLevel,
        });

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const logo = new Image();
        logo.crossOrigin = "anonymous"; // Recommended for loading images, especially if they could be external
        logo.onload = () => {
            // Calculate top-left coordinates to center the logo and its background
            const logoX = (canvas.width - logoDisplaySize) / 2;
            const logoY = (canvas.height - logoDisplaySize) / 2;

            // Draw logo centered, scaled to logoDisplaySize x logoDisplaySize
            // This will stretch the logo if it's not square.
            ctx.drawImage(logo, logoX, logoY, logoDisplaySize, logoDisplaySize);

            // Trigger download
            const link = document.createElement("a");
            link.href = canvas.toDataURL("image/png");
            link.download = `${slug}.png`;
            link.click();
        };
        logo.src = logoSrc; // Start loading the logo image
    };

    function stringToHexColor(str: string | null | undefined, brightness = 1): string {
        if (!str) {
            console.warn("Input string is null or undefined. Using default value.");
            str = "default";
        }

        const fullIdentifier = String(str);
        let hash = 0;

        for (let i = 0; i < fullIdentifier.length; i++) {
            const char = fullIdentifier.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash |= 0; // Convert to 32bit integer
        }

        // Base RGB components in 55-255 range
        let r = Math.abs((hash % 200) + 55) & 255;
        let g = Math.abs(((hash >> 8) % 200) + 55) & 255;
        let b = Math.abs(((hash >> 16) % 200) + 55) & 255;

        // Brightness adjustment: blend toward white (brightness > 1) or black (brightness < 1)
        const applyBrightness = (channel: number): number => {
            if (brightness === 1) return channel;
            if (brightness > 1) return Math.round(channel + (255 - channel) * (brightness - 1));
            return Math.round(channel * brightness);
        };

        r = applyBrightness(r);
        g = applyBrightness(g);
        b = applyBrightness(b);

        const toHex = (value: number) => value.toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }


    return (
        <>
            <Header title="Länkar - Översikt" />
            <Box id="content" p="md">

                <Group justify="space-between"> {/* Parent group to space out children */}
                    <Group wrap="nowrap"> {/* Group for the Select components */}
                        <Select
                            value={filter}
                            label="Sortera"
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

                        <Select
                            label="Filtrera"
                            value={propertyFilter}
                            onChange={(value) => {
                                setPropertyFilter(value || "all");
                                setActivePage(1); // Reset pagination when filter changes
                            }}
                            data={propertyFilterOptions}
                            radius="lg"
                        />
                    </Group>

                    <Badge size="xl" variant="default" style={{ alignSelf: 'flex-end' }}> {/* Badge aligned to the end of its flex line */}
                        {sortedLinks.length} resultat
                    </Badge>
                </Group>


                <Box mb="md" mt="md">
                    <Stack gap="xs">
                        {paginatedLinks.length > 0 ? (
                            paginatedLinks.map((link) => (
                                <Card key={link.id} withBorder radius="lg" shadow="sm">
                                    <Group justify="space-between" align="center" wrap="wrap">
                                        {/* LEFT: Text and Badges */}
                                        <Group gap="sm" align="center" wrap="wrap">
                                            <Group gap="sm" justify="flex-start" style={{ minWidth: 0, flexShrink: 1 }}>
                                                <Text fw={500} style={{ whiteSpace: 'nowrap' }}>{link.slug}</Text>
                                                <a
                                                    href={link.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    title={link.url}
                                                    style={{
                                                        textDecoration: 'none',
                                                        color: 'inherit',
                                                        minWidth: 0,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        maxWidth: '250px', // Optional: you can tweak this based on layout
                                                    }}
                                                >
                                                    <Text truncate>{link.url}</Text>
                                                </a>
                                            </Group>

                                            <Group justify="flex-start" gap="xs">
                                                <Tooltip label="Antal klick" withArrow>
                                                    <Badge size="lg" leftSection={<IconPointer size={badgeIconSize} />} variant="gradient">
                                                        {link.clicks}
                                                    </Badge>
                                                </Tooltip>
                                                {link.user_id && (
                                                    <Tooltip label="Ägare" withArrow>
                                                        <Badge
                                                            size="lg"
                                                            leftSection={<IconUser size={badgeIconSize} />}
                                                            variant="gradient"
                                                            gradient={{ from: "blue", to: "blue", deg: 0 }}
                                                        >
                                                            {link.user_id}
                                                        </Badge>
                                                    </Tooltip>
                                                )}
                                                {extractGroupName(link.group_name) !== "null" && (
                                                    <Tooltip label="Grupp" withArrow>
                                                        <Badge
                                                            size="lg"
                                                            leftSection={<IconUsersGroup size={badgeIconSize} />}
                                                            variant="gradient"
                                                            gradient={{
                                                                from: stringToHexColor(link.group_name),
                                                                to: stringToHexColor(link.group_name, 1.4),
                                                            }}
                                                        >
                                                            {extractGroupName(link.group_name)}
                                                        </Badge>
                                                    </Tooltip>
                                                )}
                                            </Group>
                                        </Group>

                                        {/* RIGHT: Buttons */}
                                        <Group gap="xs" justify="flex-end" style={{ flexShrink: 0 }}>
                                            <Tooltip label="Se detaljer" withArrow>
                                                <Button
                                                    size="sm"
                                                    variant="filled"
                                                    radius="md"
                                                    onClick={() => handleShowDetails(link.slug)}
                                                    onMouseEnter={() => setHoveredDetailsLinkSlug(link.slug)}
                                                    onMouseLeave={() => setHoveredDetailsLinkSlug(null)}
                                                >
                                                    {hoveredDetailsLinkSlug === link.slug ? (
                                                        <IconInfoSquareFilled size={iconSize} />
                                                    ) : (
                                                        <IconInfoSquare size={iconSize} />
                                                    )}
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
                                                    ) : hoveredCopyLinkSlug === link.slug ? (
                                                        <IconClipboardFilled size={iconSize} />
                                                    ) : (
                                                        <IconClipboard size={iconSize} />
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
                                                    {hoveredRemoveLinkSlug === link.slug ? (
                                                        <IconTrashFilled size={iconSize} />
                                                    ) : (
                                                        <IconTrash size={iconSize} />
                                                    )}
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
            </Box>
        </>
    );
};

export default Links;

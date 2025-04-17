// Links.tsx (Komplett Översiktsvy - Vite + Axios Instance)

import React, { useEffect, useState } from "react";
import {
    Button,
    Alert,
    Table,
    Select,
    Pagination,
    Text,
    Group,
    ActionIcon,
    Container,
} from "@mantine/core"; // Använder Mantine v4-komponenter
import { Header } from "methone";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { IconChartBar } from "@tabler/icons-react";

// Hämta från Vite environment variables
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"; // Anpassa port om nödvändigt
const API_KEY = import.meta.env.VITE_API_KEY || null;

// Skapa en instans av axios med bas-URL och eventuell API-nyckel
const api = axios.create({
    baseURL: API_URL,
    headers: API_KEY ? { "Authorization": `Bearer ${API_KEY}` } : {},
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
    mandate: string | null;
}

// Anpassa efter din autentiseringslogik om nödvändigt
const hasToken = true;

const Links: React.FC = () => {
    // --- State ---
    const [linksData, setLinksData] = useState<Link[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>("newest-oldest");
    const [activePage, setActivePage] = useState(1);
    const itemsPerPage = 5;

    const navigate = useNavigate();

    // --- Effects ---
    // Hämta länkar vid mount
    useEffect(() => {
        setLoading(true);
        setError(null);
        api
            .get<Link[]>("/api/links") 
            .then((res) => {
                setLinksData(res.data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Fel vid hämtning av länkar:", err);
                if (axios.isAxiosError(err)) {
                     if (err.response?.status === 401 || err.response?.status === 403) {
                        setError("Åtkomst nekad. Kontrollera din API-nyckel eller inloggning.");
                    } else {
                        setError("Kunde inte hämta länkar. Nätverks- eller serverfel.");
                    }
                } else {
                     setError("Ett okänt fel inträffade vid hämtning av länkar.");
                }
                setLoading(false);
            });
    }, []); 

    const copyToClipboard = (slug: string) => {
        const shortUrl = `${window.location.origin}/${slug}`;
        navigator.clipboard.writeText(shortUrl)
            .then(() => console.log("Kopierad kort länk:", shortUrl))
            .catch((err) => console.error("Kunde inte kopiera kort länk:", err));
    };

    const handleShowDetails = (slug: string) => {
        navigate(`/links/${slug}/stats`);
    };

     
    if (loading) {
        return <div id="content"><Text>Laddar länkar...</Text></div>;
    }
    if (error) {
        
        return (
            <>
                <Header title="Fel" />
                <div id="content">
                    <Alert color="red" title="Fel">{error}</Alert>
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
                          onChange={(value) => { setFilter(value || "newest-oldest"); setActivePage(1); }} 
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

               
                <div style={{ overflowX: 'auto' }}> 
                    <Table striped highlightOnHover >
                        <thead>
                             <tr>
                                 <th>Slug</th>
                                 <th>URL</th>
                                 <th>Beskrivning</th>
                                 <th>Skapad</th>
                                 <th>Går ut</th>
                                 <th>Klick</th>
                                 <th>Användare</th>
                                 <th>Mandat</th>
                                 <th>Åtgärder</th>
                             </tr>
                        </thead>
                        <tbody>
                            {paginatedLinks.length > 0 ? (
                                paginatedLinks.map((link) => (
                                    <tr key={link.id}>
                                        <td><span style={{ fontFamily: 'monospace' }}>{link.slug}</span></td>
                                        <td><a href={link.url} target="_blank" rel="noopener noreferrer" title={link.url} style={{ display: 'block', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.url}</a></td>
                                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={link.description}>{link.description || "-"}</td>
                                        <td>{new Date(link.date).toLocaleDateString('sv-SE')}</td>
                                        <td>{link.expires ? new Date(link.expires).toLocaleDateString('sv-SE') : "Aldrig"}</td>
                                        <td>{link.clicks}</td>
                                        <td>{link.user_id || "-"}</td>
                                        <td>{link.mandate || "-"}</td>
                                        <td>
                                             <Group gap="xs" wrap="nowrap">
                                                <Button size="xs" variant="light" onClick={() => copyToClipboard(link.slug)}>
                                                    Kopiera
                                                </Button>
                                                <Button
                                                    size="xs"
                                                    variant="outline"
                                                    onClick={() => handleShowDetails(link.slug)}
                                                >
                                                    Mer info
                                                </Button>
                                                <ActionIcon component={Link} to={`/links/${link.id}/stats`} variant="subtle" color="gray" title="Visa statistik">
                                                    <IconChartBar size={16} />
                                                </ActionIcon>
                                                {/* Add other actions like edit/delete here */}
                                             </Group>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={9}><Text ta="center" color="dimmed">Inga länkar att visa.</Text></td>
                                </tr>
                            )}
                        </tbody>
                    </Table>

                    {totalPages > 1 && (
                        <Pagination
                            style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}
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
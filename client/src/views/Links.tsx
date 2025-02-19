import React, { useEffect, useState } from "react";
import {
  Button,
  Alert,
  Table,
  Select,
  Pagination,
  Modal,
  Text,
} from "@mantine/core";
import { Header } from "methone";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5001";

// Definiera interface för Link (basinfo om länkarna)
interface Link {
  id: string;
  slug: string;
  url: string;
  description: string;
  date: string;
  expires: string | null;
  clicks: number;
  user_id: string | null;
  mandate: string | null;
}

const hasToken = true;

const Links: React.FC = () => {
  // Länkar (grundinfo)
  const [linksData, setLinksData] = useState<Link[]>([]);
  // Laddning/fel
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sorteringsstate, pagination
  const [filter, setFilter] = useState<string>("newest-oldest");
  const [activePage, setActivePage] = useState(1);
  const itemsPerPage = 5;

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<Link | null>(null);

  // 1. useEffect för att hämta länkarna
  useEffect(() => {
    axios
      .get<Link[]>(`${API_URL}/api/links`)
      .then((res) => {
        setLinksData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Kunde inte hämta länkar");
        setLoading(false);
      });
  }, []);

  // 2. Funktion för att öppna statistik-modal
  // (Här hämtas inte statistik, vi visar bara en placeholder)
  const handleOpenStats = (link: Link) => {
    setSelectedLink(link);
    setModalOpen(true);
  };

  // Kopiera länk till klippbordet
  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url).then(
      () => console.log("Copied to clipboard:", url),
      (err) => console.error("Failed to copy:", err)
    );
  };

  // 3. Hantera laddning/fel för grundlänkar
  if (loading) {
    return <Text>Laddar...</Text>;
  }
  if (error) {
    return <Alert color="red">{error}</Alert>;
  }

  // 4. Sortera och pagina de riktiga länkarna
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

  const paginatedLinks = sortedLinks.slice(
    (activePage - 1) * itemsPerPage,
    activePage * itemsPerPage
  );

  return (
    <>
      <Header title="Länkar" />
      <div id="content">
        {!hasToken && (
          <Alert title="Du är inte inloggad" color="blue">
            Logga in för att förkorta länkar
          </Alert>
        )}

        {/* Filtermeny för sortering */}
        <div style={{ marginBottom: "25px", display: "flex", flexDirection: "column" }}>
          <Select
            label="Sort by"
            value={filter}
            onChange={(value) => setFilter(value || "newest-oldest")}
            data={[
              { value: "newest-oldest", label: "Newest to Oldest" },
              { value: "oldest-newest", label: "Oldest to Newest" },
              { value: "clicks-ascending", label: "Clicks (Ascending)" },
              { value: "clicks-descending", label: "Clicks (Descending)" },
              { value: "slug-a-z", label: "Slug (A-Ö)" },
              { value: "slug-z-a", label: "Slug (Ö-A)" },
            ]}
          />
        </div>

        {/* Tabell med länkar */}
        <Table>
          <thead>
            <tr>
              <th>Slug</th>
              <th>URL</th>
              <th>Description</th>
              <th>Created</th>
              <th>Expire</th>
              <th>Clicks</th>
              <th>User</th>
              <th>Mandate</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLinks.map((link) => (
              <tr key={link.id}>
                <td>{link.slug}</td>
                <td>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.url}
                  </a>
                </td>
                <td>{link.description}</td>
                <td>{link.date}</td>
                <td>{link.expires ? link.expires : "No expire"}</td>
                <td>{link.clicks}</td>
                <td>{link.user_id}</td>
                <td>{link.mandate}</td>
                <td>
                  <Button onClick={() => copyToClipboard(link.url)}>Copy</Button>
                  <Button
                    style={{ marginTop: "0.5rem" }}
                    onClick={() => handleOpenStats(link)}
                  >
                    Visa statistik
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>

        {/* Pagination */}
        <Pagination
          page={activePage}
          onChange={setActivePage}
          total={Math.ceil(sortedLinks.length / itemsPerPage)}
        />
      </div>

      {/* Modal för statistik - placeholder */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Statistik"
      >
        {selectedLink && (
          <div>
            <Text>
              <strong>Slug:</strong> {selectedLink.slug}
            </Text>
            <Text>
              <strong>URL:</strong> {selectedLink.url}
            </Text>
            <Text>
              <strong>Description:</strong> {selectedLink.description}
            </Text>
            <Text>
              <strong>Created:</strong> {selectedLink.date}
            </Text>
            <Text>
              <strong>Expire:</strong> {selectedLink.expires}
            </Text>
            <Text>
              <strong>Totala klick:</strong> {selectedLink.clicks}
            </Text>
            <Text>Statistik kommer implementeras senare.</Text>
          </div>
        )}
      </Modal>
    </>
  );
};

export default Links;

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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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

// Interface för statistikdata
interface StatsData {
  date: string;   // t.ex. "2025-01-01T00:00:00.000Z"
  clicks: number;
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

  // Modal och statistikstate
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<Link | null>(null);

  const [statsData, setStatsData] = useState<StatsData[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Här väljer vi vilken granularitet vi vill hämta: "hour", "day", "week"
  const [granularity, setGranularity] = useState("day");

  // Hämta länkar
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

  // Hämta statistikdata när en länk eller granularitet ändras
  useEffect(() => {
    if (selectedLink) {
      setStatsLoading(true);
      setStatsError(null);

      axios
        .get<StatsData[]>(`${API_URL}/api/links/${selectedLink.slug}/stats`, {
          // Skicka med granularity som query‑parameter
          params: { granularity },
        })
        .then((res) => {
          setStatsData(res.data);
          setStatsLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setStatsError("Kunde inte hämta statistik");
          setStatsLoading(false);
        });
    } else {
      // Om ingen länk är vald, töm statistiken
      setStatsData([]);
    }
  }, [selectedLink, granularity]);

  // Öppna statistik-modal
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

  // Hantera laddning/fel för grundlänkar
  if (loading) {
    return <Text>Laddar...</Text>;
  }
  if (error) {
    return <Alert color="red">{error}</Alert>;
  }

  // Sortera och pagina länkarna
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
        <div
          style={{
            marginBottom: "25px",
            display: "flex",
            flexDirection: "column",
          }}
        >
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
                  <Button onClick={() => copyToClipboard(link.url)}>
                    Copy
                  </Button>
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

      {/* Modal för statistik */}
      <Modal
        opened={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedLink(null);
          setGranularity("day"); // återställ om du vill
        }}
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
              <strong>Expire:</strong>{" "}
              {selectedLink.expires ? selectedLink.expires : "No expire"}
            </Text>
            <Text>
              <strong>Totala klick:</strong> {selectedLink.clicks}
            </Text>

            {/* Välj granularitet (timme, dag, vecka) */}
            <div style={{ margin: "1rem 0" }}>
              <Select
                label="Visa statistik per"
                value={granularity}
                onChange={(value) => setGranularity(value!)}
                data={[
                  { value: "hour", label: "Timme" },
                  { value: "day", label: "Dag" },
                  { value: "week", label: "Vecka" },
                ]}
              />
            </div>

            {statsLoading && <Text>Laddar statistik...</Text>}
            {statsError && <Alert color="red">{statsError}</Alert>}
            {!statsLoading && !statsError && statsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={statsData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="clicks" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              !statsLoading &&
              !statsError && <Text>Ingen statistik tillgänglig.</Text>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};

export default Links;

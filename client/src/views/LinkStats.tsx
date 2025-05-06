import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
    Button,
    Alert,
    Select,
    Text,
    Card,
    Loader,
    Group,
    Title,
    Box,
} from "@mantine/core";
import { Header } from "methone";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    BarChart,
    Bar,
} from "recharts";
import Configuration from "../configuration.ts";

// Create API instance with JWT token instead of environment API key
const api = axios.create({
    baseURL: Configuration.backendApiUrl
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// --- Interfaces ---
interface Link {
    id: string;
    slug: string;
    url: string;
    description: string;
    date: string;
    expires: string | null;
    clicks: number;
    user_id: string | null;
    group_name: string | null;
}

interface StatsData {
    date: string;
    clicks: number;
}

interface LangData {
    language: string;
    clicks: number;
}

// --- Helpers ---
const formatAxisDate = (
    tickItem: string,
    granularity: "day" | "hour" | "week"
): string => {
    const date = new Date(tickItem);
    if (isNaN(date.getTime())) return "Ogiltigt datum";

    if (granularity === "hour") {
        return date.toLocaleTimeString("sv-SE", {
            hour: "2-digit",
            minute: "2-digit",
        });
    }
    if (granularity === "week") {
        return date.toLocaleDateString("sv-SE", { weekday: "short" });
    }
    return date.toLocaleDateString("sv-SE", {
        month: "short",
        day: "numeric",
    });
};

const getZeroLineDataForToday = (): StatsData[] => {
    const today = new Date();
    const start = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        0,
        0,
        0,
        0
    );
    const end = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        23,
        59,
        59,
        999
    );
    return [
        { date: start.toISOString(), clicks: 0 },
        { date: end.toISOString(), clicks: 0 },
    ];
};

const getZeroLineDataForWeek = (): StatsData[] => {
    const t = new Date();
    const end = new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()));
    const start = new Date(
        Date.UTC(t.getFullYear(), t.getMonth(), t.getDate() - 6)
    );
    return [
        { date: start.toISOString(), clicks: 0 },
        { date: end.toISOString(), clicks: 0 },
    ];
};

const fillMissingDays = (
    data: StatsData[],
    startDate: Date,
    endDate: Date
): StatsData[] => {
    const map = new Map(
        data.map((d) => [new Date(d.date).toISOString().slice(0, 10), d.clicks])
    );
    const filled: StatsData[] = [];
    const cur = new Date(startDate);
    while (cur <= endDate) {
        const key = cur.toISOString().slice(0, 10);
        filled.push({
            date: new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate())).toISOString(),
            clicks: map.get(key) ?? 0,
        });
        cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return filled;
};

// --- Component ---
const LinkStats: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [linkDetails, setLinkDetails] = useState<Link | null>(null);
    const [statsData, setStatsData] = useState<StatsData[]>([]);
    const [langData, setLangData] = useState<LangData[]>([]);
    const [granularity, setGranularity] = useState<"day" | "hour" | "week">("day");
    const [loadingDetails, setLoadingDetails] = useState(true);
    const [loadingStats, setLoadingStats] = useState(false);
    const [loadingLang, setLoadingLang] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorLang, setErrorLang] = useState<string | null>(null);

    // Fetch link details
    useEffect(() => {
        if (!id) {
            setError("Ingen länk specificerad i URL:en.");
            setLoadingDetails(false);
            return;
        }
        setLoadingDetails(true);
        api
            .get<Link>(`/api/links/${id}`)
            .then((res) => setLinkDetails(res.data))
            .catch((err) => {
                console.error(err);
                setError(
                    axios.isAxiosError(err) && err.response?.status === 404
                        ? `Länken "${id}" hittades inte.`
                        : "Kunde inte hämta länkdetaljer."
                );
            })
            .finally(() => setLoadingDetails(false));
    }, [id]);

    // Fetch time-series stats
    useEffect(() => {
        if (!linkDetails) return setStatsData([]);
        setLoadingStats(true);
        setError(null);

        const apiGran = granularity === "week" ? "day" : granularity;
        api
            .get<StatsData[]>(`/api/links/${linkDetails.slug}/stats`, {
                params: { granularity: apiGran },
            })
            .then((res) => {
                let data = res.data.sort(
                    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
                );

                if (granularity === "hour") {
                    const today = new Date().toDateString();
                    const filtered = data.filter(
                        (d) => new Date(d.date).toDateString() === today
                    );
                    data = filtered.length ? filtered : getZeroLineDataForToday();
                } else if (granularity === "week") {
                    const t = new Date();
                    const end = new Date(
                        Date.UTC(t.getFullYear(), t.getMonth(), t.getDate())
                    );
                    const start = new Date(
                        Date.UTC(t.getFullYear(), t.getMonth(), t.getDate() - 6)
                    );
                    const weekHits = data.filter((d) => {
                        const dt = new Date(d.date);
                        const utc = new Date(
                            Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate())
                        );
                        return utc >= start && utc <= end;
                    });
                    const filled = fillMissingDays(weekHits, start, end);
                    data = filled.every((d) => d.clicks === 0)
                        ? getZeroLineDataForWeek()
                        : filled;
                }

                setStatsData(data);
            })
            .catch((err) => {
                console.error(err);
                setError("Kunde inte hämta statistikdata.");
            })
            .finally(() => setLoadingStats(false));
    }, [linkDetails, granularity]);

    // Fetch language histogram
    useEffect(() => {
        if (!linkDetails) return;
        setLoadingLang(true);
        setErrorLang(null);
        api
            .get<LangData[]>(`/api/links/${linkDetails.slug}/lang-stats`)
            .then((res) => setLangData(res.data))
            .catch((err) => {
                console.error(err);
                setErrorLang("Kunde inte hämta språkstatistik.");
            })
            .finally(() => setLoadingLang(false));
    }, [linkDetails]);

    // Copy handlers
    const copyShortLink = () => {
        if (linkDetails) {
            const shortUrl = `${Configuration.backendApiUrl}/${linkDetails.slug}`;
            navigator.clipboard.writeText(shortUrl)
                .then(() => console.log('Kopierade kort länk:', shortUrl))
                .catch(err => console.error('Kunde inte kopiera kort länk:', err));
        }
    };
    const copyOriginalLink = () => {
        if (!linkDetails) return;
        navigator.clipboard.writeText(linkDetails.url);
    };

    // Added this to test the delete function (remove or edit if needed)
    const deleteLink = () => {
        if (!linkDetails) return;
        if (window.confirm("Är du säker på att du vill ta bort länken?")) {
            api
                .delete(`/api/links/${linkDetails.slug}`)
                .then(() => navigate("/links"))
                .catch((err) => {
                    console.error(err);
                    setError("Kunde inte ta bort länken.");
                });
        }
    };


    if (loadingDetails) {
        return (
            <Box
                id="content"
                style={{ display: "flex", justifyContent: "center", minHeight: 300 }}
            >
                <Loader />
            </Box>
        );
    }

    if (error && !linkDetails) {
        return (
            <>
                <Header title="Fel" />
                <Box id="content">
                    <Alert color="red">{error}</Alert>
                    <Button mt="md" onClick={() => navigate("/links")}>
                        Tillbaka
                    </Button>
                </Box>
            </>
        );
    }

    if (!linkDetails) {
        return (
            <>
                <Header title="Okänd länk" />
                <Box id="content">
                    <Text>Ingen data hittades.</Text>
                    <Button mt="md" onClick={() => navigate("/links")}>
                        Tillbaka
                    </Button>
                </Box>
            </>
        );
    }

    const isZeroLine =
        statsData.length > 0 && statsData.every((d) => d.clicks === 0);

    return (
        <>
            <Header title={`Statistik för /${linkDetails.slug}`} />
            <Box id="content" mb="xl">
                <Button
                    variant="outline"
                    mb="md"
                    onClick={() => navigate("/links")}
                >
                    &larr; Tillbaka
                </Button>

                <Card radius="lg" shadow="xs" p="md" mb="lg">
                    <Title order={3} mb="sm">Länkdetaljer</Title>
                    <Text size="sm"><strong>Kortlänk:</strong> <span style={{ fontFamily: 'monospace' }}>{`${Configuration.backendApiUrl}/${linkDetails.slug}`}</span></Text>
                    <Text size="sm" style={{ wordBreak: 'break-all' }}><strong>Ursprunglig URL:</strong> <a href={linkDetails.url} target="_blank" rel="noopener noreferrer">{linkDetails.url}</a></Text>
                    <Text size="sm"><strong>Beskrivning:</strong> {linkDetails.description || "-"}</Text>
                    <Text size="sm"><strong>Skapad:</strong> {new Date(linkDetails.date).toLocaleString('sv-SE')}</Text>
                    <Text size="sm"><strong>Upphör:</strong> {linkDetails.expires ? new Date(linkDetails.expires).toLocaleString('sv-SE') : "Aldrig"}</Text>
                    <Text size="sm"><strong>Totala klick:</strong> {linkDetails.clicks}</Text>
                    <Text size="sm"><strong>Användare:</strong> {linkDetails.user_id || "-"}</Text>
                    <Text size="sm"><strong>Grupp:</strong> {linkDetails.group_name || "-"}</Text>
                    <Group mt="sm">
                        <Button size="xs" onClick={copyShortLink}>
                            Kopiera kortlänk
                        </Button>
                        <Button size="xs" variant="light" onClick={copyOriginalLink}>
                            Kopiera originallänk
                        </Button>
                        <Button size="xs" variant="light" c="red" onClick={deleteLink}>
                            Ta bort
                        </Button>
                    </Group>
                </Card>

                <Card radius="lg" shadow="xs" p="md">
                    <Title order={3} mb="sm">
                        Klickstatistik
                    </Title>
                    <Box mb="md">
                        <Select
                            label="Visa statistik per"
                            value={granularity}
                            onChange={(v) =>
                                setGranularity((v as "day" | "hour" | "week") || "day")
                            }
                            data={[
                                { value: 'day', label: 'Totalt' },
                                { value: 'hour', label: 'Idag' },
                                { value: 'week', label: 'Senaste 7 dagarna' },
                            ]}
                        />
                    </Box>
                    {error && <Alert color="red">{error}</Alert>}
                    {loadingStats ? (
                        <Loader />
                    ) : (
                        <ResponsiveContainer width="100%" height={350}>
                            <LineChart
                                data={statsData}
                                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(t) => formatAxisDate(t, granularity)}
                                    stroke="#adb5bd"
                                    tick={{ fontSize: 11 }}
                                    padding={{ left: 10, right: 10 }}
                                    interval="preserveStartEnd"
                                />
                                <YAxis
                                    allowDecimals={false}
                                    domain={[0, isZeroLine ? 5 : "auto"]}
                                    stroke="#adb5bd"
                                    tick={{ fontSize: 11 }}
                                />
                                <Tooltip
                                    labelFormatter={(l) => formatAxisDate(l, granularity)}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="clicks"
                                    name="Klick"
                                    stroke="#339AF0"
                                    strokeWidth={2}
                                    dot={!isZeroLine ? { r: 3, fill: "#339AF0" } : false}
                                    activeDot={{ r: 6 }}
                                    isAnimationActive={false}
                                    connectNulls={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </Card>

                <Card radius="lg" shadow="xs" p="md" mt="lg">
                    <Title order={3} mb="sm">
                        Klick per språk
                    </Title>
                    {loadingLang && <Loader />}
                    {errorLang && <Alert color="red">{errorLang}</Alert>}
                    {!loadingLang && !errorLang && (
                        langData.length === 0 ? (
                            <Text color="dimmed">Inga klick registrerade.</Text>
                        ) : (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart
                                    data={langData}
                                    margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="language" />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="clicks" name="Klick" fill="#339AF0" />
                                </BarChart>
                            </ResponsiveContainer>
                        )
                    )}
                </Card>
            </Box>
        </>
    );
};

export default LinkStats;

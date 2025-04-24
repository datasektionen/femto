import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
    Button,
    Alert,
    Select,
    Text,
    Paper,
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
} from "recharts";
import Configuration from "../configuration.ts";

// Create API instance with JWT token instead of environment API key
const api = axios.create({
    baseURL: Configuration.backendApiUrl
});

// Add request interceptor to include the JWT token from localStorage on each request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

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
    mandate: string | null;
  }

interface StatsData {
    date: string; 
    clicks: number;
  }


const formatAxisDate = (tickItem: string, granularity: 'day' | 'hour' | 'week'): string => {
    try {
        const date = new Date(tickItem);
         // Kolla om datumet är giltigt
        if (isNaN(date.getTime())) {
            console.warn("Invalid date passed to formatAxisDate:", tickItem);
            return "Ogiltigt datum";
        }

        if (granularity === 'hour') {
          return date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
        }
        if (granularity === 'week') {
            return date.toLocaleDateString('sv-SE', { weekday: 'short' });
        }
        return date.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' });
     } catch (error) {
         console.error("Error formatting date:", tickItem, error);
         return "Fel datum";
     }
  };


const getZeroLineDataForToday = (): StatsData[] => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    return [
        { date: startOfDay.toISOString(), clicks: 0 },
        { date: endOfDay.toISOString(), clicks: 0 },
    ];
};

// Skapar nollinje-data för senaste veckan (dagar)
const getZeroLineDataForWeek = (): StatsData[] => {
    const today = new Date();
    const endDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const startDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() - 6));
    return [
        { date: startDate.toISOString(), clicks: 0 },
        { date: endDate.toISOString(), clicks: 0 },
    ];
};

// Fyller i saknade dagar med 0 klick för en 7-dagarsperiod (från startDate till endDate, inklusive båda)
const fillMissingDays = (data: StatsData[], startDate: Date, endDate: Date): StatsData[] => {
    const filledData: StatsData[] = [];
    const dataMap = new Map(data.map(item => {
        const itemDate = new Date(item.date);
        const dateKey = `${itemDate.getUTCFullYear()}-${String(itemDate.getUTCMonth() + 1).padStart(2, '0')}-${String(itemDate.getUTCDate()).padStart(2, '0')}`;
        return [dateKey, item.clicks];
    }));
    let currentDate = new Date(startDate); // Startar på startDate (UTC)
    const endOfDayCheck = new Date(endDate); // Slutdatumet att jämföra med

    // Loopa från startDate till och med endDate
    while (currentDate <= endOfDayCheck) {
        const dateKey = `${currentDate.getUTCFullYear()}-${String(currentDate.getUTCMonth() + 1).padStart(2, '0')}-${String(currentDate.getUTCDate()).padStart(2, '0')}`;
        const clicks = dataMap.get(dateKey) || 0;
        const dateForDay = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate()));
        filledData.push({ date: dateForDay.toISOString(), clicks });

        // Gå till nästa dag (UTC)
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
    return filledData;
};


// --- React Component ---
const LinkStats: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // --- State ---
  const [linkDetails, setLinkDetails] = useState<Link | null>(null);
  const [statsData, setStatsData] = useState<StatsData[]>([]);
  const [granularity, setGranularity] = useState<'day' | 'hour' | 'week'>("day");
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null); // Hanterar både detalj- och statistikfel

  // --- Effects ---

  // Hämta länkdetaljer
  useEffect(() => {
    if (!id) {
        setError("Ingen länk specificerad i URL:en.");
        setLoadingDetails(false);
        return;
    }
    setLoadingDetails(true);
    setError(null);
    api
      .get<Link>(`/api/links/${id}`)
      .then((res) => {
        setLinkDetails(res.data);
        setLoadingDetails(false);
      })
      .catch((err) => {
        console.error("Fel vid hämtning av länkdetaljer:", err);
        if (axios.isAxiosError(err) && err.response?.status === 404) {
             setError(`Länken med id "${id}" hittades inte.`);
        } else if (axios.isAxiosError(err) && (err.response?.status === 401 || err.response?.status === 403)){
            setError("Åtkomst nekad att hämta länkdetaljer.");
        }
         else {
            setError(`Kunde inte hämta detaljer för länken "${id}".`);
        }
        setLoadingDetails(false);
      });
  }, [id]);

  // Hämta statistikdata
  useEffect(() => {
    // Kör bara om vi har linkDetails (och därmed en giltig slug)
    if (linkDetails) {
      setLoadingStats(true);
      
      const apiGranularity = granularity === 'week' ? 'day' : granularity;
      console.log(`Workspaceing stats with API granularity: ${apiGranularity}`);

      api
        .get<StatsData[]>(`/api/links/${linkDetails.slug}/stats`, {
          params: { granularity: apiGranularity },
        })
        .then((res) => {
           let processedData = res.data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
           console.log('>>> Granularity selected:', granularity);
           console.log('>>> Data from API:', processedData);

           if (granularity === 'hour') {
             const todayString = new Date().toDateString();
             console.log(">>> Filtrerar timdata för dagen:", todayString);
             const filteredData = processedData.filter(item => new Date(item.date).toDateString() === todayString);
             console.log(">>> Filtrerad timdata:", filteredData);
             processedData = filteredData.length === 0 ? getZeroLineDataForToday() : filteredData;

           } else if (granularity === 'week') {
             const today = new Date();
             const endDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
             const startDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() - 6));
             console.log(`>>> Filtering week data between ${startDate.toISOString()} and ${endDate.toISOString()}`);

             const filteredWeekData = processedData.filter(item => {
                 const itemDate = new Date(item.date);
                 const itemDateUTC = new Date(Date.UTC(itemDate.getUTCFullYear(), itemDate.getUTCMonth(), itemDate.getUTCDate()));
                 return itemDateUTC >= startDate && itemDateUTC <= endDate;
             });
             console.log(">>> Filtered Week Data (raw):", filteredWeekData);

             processedData = fillMissingDays(filteredWeekData, startDate, endDate);
             console.log(">>> Processed Week Data (filled gaps):", processedData);

             const allZeroClicks = processedData.every(item => item.clicks === 0);
             if (allZeroClicks && processedData.length > 0) { // Undvik att skapa nollinje om det inte ens fanns dagar att fylla i
                 console.log(">>> All zero clicks in week, generating simple zero line.");
                 processedData = getZeroLineDataForWeek();
             }
           }

           console.log(">>> Setting final statsData to:", processedData);
           setStatsData(processedData);
           setError(null); // Nollställ eventuella fel om allt gick bra
           setLoadingStats(false);
        })
        .catch((err) => {
          console.error("Fel vid hämtning av statistik:", err);
            if (axios.isAxiosError(err) && (err.response?.status === 401 || err.response?.status === 403)){
                 setError("Åtkomst nekad till statistik.");
            } else {
                setError("Kunde inte hämta statistikdata.");
            }
          setStatsData([]); // Rensa vid fel
          setLoadingStats(false);
        });
    } else {
        // Om linkDetails är null (t.ex. vid initial laddning eller fel), rensa statistik
        setStatsData([]);
    }
  // Körs om när länkdetaljer eller vald granularitet ändras
  }, [linkDetails, granularity]);

  // --- Event Handlers ---
  const copyShortLink = () => {
    if(linkDetails) {
        const shortUrl = `${Configuration.backendApiUrl}/${linkDetails.slug}`;
        navigator.clipboard.writeText(shortUrl)
          .then(() => console.log('Kopierade kort länk:', shortUrl))
          .catch(err => console.error('Kunde inte kopiera kort länk:', err));
    }
  };

 const copyOriginalLink = () => {
    if(linkDetails) {
        navigator.clipboard.writeText(linkDetails.url)
          .then(() => console.log('Kopierade originallänk:', linkDetails.url))
          .catch(err => console.error('Kunde inte kopiera originallänk:', err));
    }
  };

  // --- Conditional Returns ---
  if (loadingDetails) {
    return (
      <>
       
        <div id="content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
          <Loader />
        </div>
      </>
    );
  }

  // Fel inträffade när länkdetaljer skulle hämtas
  if (error && !linkDetails) {
    return (
        <>
         <Header title="Fel" />
          <div id="content">
            <Alert color="red" title="Fel vid hämtning av länk">{error}</Alert>
            <Button onClick={() => navigate('/links')} style={{ marginTop: '1rem' }}>
              Tillbaka till översikt
            </Button>
          </div>
        </>
    );
  }

  // Länkdetaljer är null men ingen error - bör ej hända normalt
  if (!linkDetails) {
    return (
         <>
            <Header title="Okänd länk" />
            <div id="content">
                <Text>Länken kunde inte hittas eller så saknas data.</Text>
                 <Button onClick={() => navigate('/links')} style={{ marginTop: '1rem' }}>
                    Tillbaka till översikt
                </Button>
            </div>
        </>
    );
  }

  // --- Main Render ---
  // Om vi når hit, så finns linkDetails
  console.log('Rendering - loadingStats:', loadingStats, 'error:', error, 'statsData length:', statsData.length);
  const isZeroLine = statsData.length > 0 && statsData.every(item => item.clicks === 0);

  return (
    <>
      <Header title={`Statistik för: /${linkDetails.slug}`} />
      <div id="content">
        <Button onClick={() => navigate('/links')} variant="outline" mb="md">
          &larr; Tillbaka till översikt
        </Button>

        {/* Länkdetaljer Paper */}
        <Paper shadow="xs" p="md" mb="lg">
           <Title order={3} mb="sm">Länkdetaljer</Title>
          <Text size="sm"><strong>Kortlänk:</strong> <span style={{fontFamily: 'monospace'}}>{`${Configuration.backendApiUrl}/${linkDetails.slug}`}</span></Text>
          <Text size="sm" style={{ wordBreak: 'break-all' }}><strong>Ursprunglig URL:</strong> <a href={linkDetails.url} target="_blank" rel="noopener noreferrer">{linkDetails.url}</a></Text>
          <Text size="sm"><strong>Beskrivning:</strong> {linkDetails.description || "-"}</Text>
          <Text size="sm"><strong>Skapad:</strong> {new Date(linkDetails.date).toLocaleString('sv-SE')}</Text>
          <Text size="sm"><strong>Upphör:</strong> {linkDetails.expires ? new Date(linkDetails.expires).toLocaleString('sv-SE') : "Aldrig"}</Text>
          <Text size="sm"><strong>Totala klick:</strong> {linkDetails.clicks}</Text>
          <Text size="sm"><strong>Användare:</strong> {linkDetails.user_id || "-"}</Text>
          <Text size="sm"><strong>Mandat:</strong> {linkDetails.mandate || "-"}</Text>
          <Group mt="sm">
             <Button size="xs" onClick={copyShortLink}>Kopiera kortlänk</Button>
             <Button size="xs" variant="light" onClick={copyOriginalLink}>Kopiera originallänk</Button>
          </Group>
        </Paper>

        {/* Statistik Paper */}
        <Paper shadow="xs" p="md">
           <Title order={3} mb="sm">Klickstatistik</Title>
          <Box mb="md">
            <Select
                label="Visa statistik per"
                value={granularity}
                onChange={(value) => setGranularity((value as 'day' | 'hour' | 'week' | null) || "day")} // Adjust onChange handler type/assertion
                data={['day', 'hour', 'week']}
                style={{ marginBottom: '20px' }}
            />
           </Box>

           { /*visa felmeddelande om  statistikhämtning inte lyckas*/}
           {error && <Alert color="red" title="Statistikfel">{error}</Alert>}
           {/* visa laddningsindikator för statistik */}
           {loadingStats && <Loader my="xl" mx="auto" />} 

           {/* visa Recharts Diagram om inte laddar */}
           {!loadingStats && (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={statsData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}> 
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(tick) => formatAxisDate(tick, granularity)}
                    stroke="#adb5bd"
                    tick={{ fontSize: 11 }} // Mindre font för axeln
                    padding={{ left: 10, right: 10 }}
                    interval="preserveStartEnd" // Försök visa första/sista label
                  />
                  <YAxis
                    allowDecimals={false}
                    domain={[0, isZeroLine ? 5 : 'auto']} // Ge lite höjd åt nollinjen
                    stroke="#adb5bd"
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '4px', borderColor: '#dee2e6', fontSize: '12px', padding: '8px' }}
                    labelFormatter={(label) => formatAxisDate(label, granularity)} // Formatera label i tooltip
                  />
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    name="Antal Klick" // Namn i Tooltip
                    stroke={"#339AF0"} // Mantine blue.6
                    strokeWidth={2}
                    dot={!isZeroLine ? { r: 3, fill: "#339AF0" } : false} // Punkter utom för nollinje
                    activeDot={{ r: 6 }}
                    isAnimationActive={false}
                    connectNulls={false} 
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
        </Paper>
      </div>
    </>
  );
};

export default LinkStats;
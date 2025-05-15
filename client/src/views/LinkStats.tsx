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
  TextInput,
  Box,
  Divider,
} from "@mantine/core";
import { Tooltip as MantineTooltip } from "@mantine/core";
import { Header } from "methone";
import {
  IconEdit,
  IconArrowLeft,
  IconClipboard,
  IconClipboardList,
  IconTrash,
  IconRefresh,
} from "@tabler/icons-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import Configuration from "../configuration.ts";
import { useForm } from "@mantine/form";
import { useAuth } from "../autherization/useAuth.ts";
import { QRCode } from "react-qrcode-logo";

/**
 * Axios instance configured with the backend API URL.
 * It includes an interceptor to automatically add the JWT token to requests.
 */
const api = axios.create({
  baseURL: Configuration.backendApiUrl,
});

// Function to extract just the group name from "group_name@group_domain" format
function extractGroupName(groupWithDomain: string | null): string {
  if (!groupWithDomain) return "Ingen grupp";

  const parts = groupWithDomain.split("@");
  return parts[0] || "Okänd grupp";
}

// Request interceptor to add JWT token to Authorization header
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

/**
 * Represents the structure of a shortened link.
 */
interface Link {
  id: string;
  slug: string;
  url: string;
  description: string;
  date: string; // ISO date string
  expires: string | null; // ISO date string or null
  clicks: number;
  user_id: string | null;
  group_name: string | null;
}

/**
 * Represents a data point for click statistics over time.
 */
interface StatsData {
  date: string; // ISO date string, representing a day or an hour
  clicks: number;
}

/**
 * Represents a data point for language-based click statistics.
 */
interface LangData {
  language: string; // Language code (e.g., 'en', 'sv')
  clicks: number;
}

// --- Helper Functions ---

/**
 * Formats a date string for display on chart axes based on granularity.
 * @param tickItem - The date string (ISO format) to format.
 * @param granularity - The time granularity ('day', 'hour', 'week').
 * @returns A formatted date string suitable for display.
 */
const formatAxisDate = (
  tickItem: string,
  granularity: "day" | "hour" | "week"
): string => {
  const date = new Date(tickItem);
  if (isNaN(date.getTime())) return "Ogiltigt datum"; // Invalid date check

  if (granularity === "hour") {
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (granularity === "week") {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

/**
 * Generates placeholder data for today's hourly chart if no clicks are present.
 * Ensures the chart shows a line from the start to the end of the day.
 * @returns An array of StatsData for the start and end of the current day with 0 clicks.
 */
const getZeroLineDataForToday = (): StatsData[] => {
  const today = new Date();
  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    0,
    0,
    0,
    0 // Start of day
  );
  const end = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    23,
    59,
    59,
    999 // End of day
  );
  return [
    { date: start.toISOString(), clicks: 0 },
    { date: end.toISOString(), clicks: 0 },
  ];
};

/**
 * Generates placeholder data for the last week's chart if no clicks are present.
 * Ensures the chart shows a line spanning the last 7 days.
 * @returns An array of StatsData for 7 days ago and today with 0 clicks.
 */
const getZeroLineDataForWeek = (): StatsData[] => {
  const t = new Date();
  // End date is today (UTC)
  const end = new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()));
  // Start date is 6 days before today (UTC)
  const start = new Date(
    Date.UTC(t.getFullYear(), t.getMonth(), t.getDate() - 6)
  );
  return [
    { date: start.toISOString(), clicks: 0 },
    { date: end.toISOString(), clicks: 0 },
  ];
};

/**
 * Fills in missing days with zero clicks within a date range for weekly stats.
 * @param data - The existing statistics data, potentially with missing days.
 * @param startDate - The start date of the period to fill.
 * @param endDate - The end date of the period to fill.
 * @returns A new array of StatsData with all days in the range present.
 */
const fillMissingDays = (
  data: StatsData[],
  startDate: Date,
  endDate: Date
): StatsData[] => {
  // Create a map for quick lookup of clicks by date (YYYY-MM-DD)
  const map = new Map(
    data.map((d) => [new Date(d.date).toISOString().slice(0, 10), d.clicks])
  );
  const filled: StatsData[] = [];
  const cur = new Date(startDate); // Start iterating from the startDate

  // Iterate day by day until endDate
  while (cur <= endDate) {
    const key = cur.toISOString().slice(0, 10); // YYYY-MM-DD format for map key
    filled.push({
      // Ensure date is in UTC for consistency
      date: new Date(
        Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate())
      ).toISOString(),
      clicks: map.get(key) ?? 0, // Use existing clicks or 0 if day is missing
    });
    cur.setUTCDate(cur.getUTCDate() + 1); // Move to the next day
  }
  return filled;
};

/**
 * Converts a date (string, Date object, or null) to a local ISO-like string format
 * suitable for `datetime-local` input fields (YYYY-MM-DDTHH:mm).
 * @param dateInput - The date to convert. Can be an ISO string, a Date object, or null.
 * @returns A string in 'YYYY-MM-DDTHH:mm' format, or an empty string if input is invalid/null.
 */
const toLocalISOString = (dateInput: string | Date | null): string => {
  if (!dateInput) return ""; // Return empty for null or undefined
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return ""; // Return empty for invalid dates

  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Month is 0-indexed
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// --- Component ---

/**
 * `LinkStats` component displays detailed statistics and allows editing for a specific short link.
 * It fetches link details, time-series click data, and language-based click data.
 */
const LinkStats: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // Get link 'id' (slug) from URL
  const navigate = useNavigate();

  // --- State Variables ---
  const [linkDetails, setLinkDetails] = useState<Link | null>(null); // Stores the details of the current link
  const [statsData, setStatsData] = useState<StatsData[]>([]); // Stores time-series click statistics
  const [langData, setLangData] = useState<LangData[]>([]); // Stores language-based click statistics
  const [granularity, setGranularity] = useState<"day" | "hour" | "week">(
    "day"
  ); // Controls the time granularity for stats (day, hour, week)
  const [loadingDetails, setLoadingDetails] = useState(true); // Loading state for link details fetching
  const [loadingStats, setLoadingStats] = useState(false); // Loading state for time-series stats fetching
  const [loadingLang, setLoadingLang] = useState(false); // Loading state for language stats fetching
  const [error, setError] = useState<string | null>(null); // General error messages for the page
  const [errorLang, setErrorLang] = useState<string | null>(null); // Error messages specific to language stats
  const [editing, setEditing] = useState(false); // Toggles between display and edit mode for link details
  const iconSize = 20; // Standard size for icons

  /**
   * Mantine form hook for managing link editing form state and validation.
   */
  const form = useForm({
    initialValues: {
      url: "",
      description: "",
      expires: "", // Stored as local datetime string for input
      group_name: "",
    },
    validate: {
      // Basic URL validation
      url: (value) =>
        value && /^(ftp|http|https):\/\/[^ "]+$/.test(value)
          ? null
          : "Ogiltig URL",
    },
  });

  const {
    groups,
    userGroups, // List of available groups for the user
    // refreshAuthData // Function to refresh user's authentication data (like groups)
  } = useAuth();

  const hasGroups = groups && groups.length > 0; // Check if the user has any groups

  /*
    // Refresh authentication data (e.g., user's groups) when the component mounts.
    useEffect(() => {
        refreshAuthData();
    }, [refreshAuthData]); // Dependency array includes refreshAuthData if its identity can change
    */

  // Fetch link details when the component mounts or the 'id' (slug) from URL changes.
  useEffect(() => {
    if (!id) {
      setError("Ingen länk specificerad i URL:en.");
      setLoadingDetails(false);
      return;
    }
    setLoadingDetails(true);
    setError(null); // Clear previous errors
    api
      .get<Link>(`/api/links/${id}`)
      .then((res) => setLinkDetails(res.data))
      .catch((err) => {
        console.error("Failed to fetch link details:", err);
        setError(
          axios.isAxiosError(err) && err.response?.status === 404
            ? `Länken "${id}" hittades inte.`
            : "Kunde inte hämta länkdetaljer."
        );
      })
      .finally(() => setLoadingDetails(false));
  }, [id]); // Re-run if 'id' changes

  // Fetch time-series click statistics when linkDetails or granularity changes.
  useEffect(() => {
    if (!linkDetails) {
      setStatsData([]); // Clear stats if no link details
      return;
    }
    setLoadingStats(true);
    setError(null); // Clear general errors before fetching new stats

    // API uses 'day' for overall and weekly stats, 'hour' for hourly
    const apiGranularity = granularity === "week" ? "day" : granularity;
    api
      .get<StatsData[]>(`/api/links/${linkDetails.slug}/stats`, {
        params: { granularity: apiGranularity },
      })
      .then((res) => {
        // Sort data by date to ensure correct chart rendering
        let processedData = res.data.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        if (granularity === "hour") {
          // For hourly view, filter data for the current day only
          const todayDateString = new Date().toDateString();
          const filteredForToday = processedData.filter(
            (d) => new Date(d.date).toDateString() === todayDateString
          );
          // If no clicks today, use placeholder data for a zero-line chart
          processedData = filteredForToday.length
            ? filteredForToday
            : getZeroLineDataForToday();
        } else if (granularity === "week") {
          // For weekly view, filter data for the last 7 days and fill missing days
          const today = new Date();
          const endDateUTC = new Date(
            Date.UTC(
              today.getUTCFullYear(),
              today.getUTCMonth(),
              today.getUTCDate()
            )
          );
          const startDateUTC = new Date(
            Date.UTC(
              today.getUTCFullYear(),
              today.getUTCMonth(),
              today.getUTCDate() - 6
            )
          );

          // Filter hits within the last 7 days (UTC)
          const hitsLastWeek = processedData.filter((d) => {
            const dataDate = new Date(d.date);
            const dataDateUTC = new Date(
              Date.UTC(
                dataDate.getUTCFullYear(),
                dataDate.getUTCMonth(),
                dataDate.getUTCDate()
              )
            );
            return dataDateUTC >= startDateUTC && dataDateUTC <= endDateUTC;
          });

          // Fill missing days in the week with 0 clicks
          const filledWeekData = fillMissingDays(
            hitsLastWeek,
            startDateUTC,
            endDateUTC
          );

          // If all clicks in the filled data are zero, use placeholder zero-line data
          processedData = filledWeekData.every((d) => d.clicks === 0)
            ? getZeroLineDataForWeek()
            : filledWeekData;
        }
        setStatsData(processedData);
      })
      .catch((err) => {
        console.error("Failed to fetch time-series stats:", err);
        setError("Kunde inte hämta statistikdata."); // Set error specific to stats fetching
      })
      .finally(() => setLoadingStats(false));
  }, [linkDetails, granularity]); // Re-run if linkDetails or granularity changes

  // Populate form fields when linkDetails are fetched or updated.
  useEffect(() => {
    if (linkDetails) {
        form.setValues({
            url: linkDetails.url || '',
            description: linkDetails.description || '',
            expires: linkDetails.expires ? toLocalISOString(linkDetails.expires) : '',
            group_name: linkDetails.group_name || '', // Keep full identifier in form value
        });
    }
}, [linkDetails, form.setValues]);

  // Fetch language-based click statistics when linkDetails changes.
  useEffect(() => {
    if (!linkDetails) return; // Do nothing if linkDetails are not available

    setLoadingLang(true);
    setErrorLang(null); // Clear previous language-specific errors
    api
      .get<LangData[]>(`/api/links/${linkDetails.slug}/lang-stats`)
      .then((res) => setLangData(res.data))
      .catch((err) => {
        console.error("Failed to fetch language stats:", err);
        setErrorLang("Kunde inte hämta språkstatistik.");
      })
      .finally(() => setLoadingLang(false));
  }, [linkDetails]); // Re-run if linkDetails changes

  useEffect(() => {
    console.log("LinkStats - userGroups with domains:", userGroups);
    console.log("LinkStats - simple group names:", groups);
    
    if (linkDetails?.group_name) {
      console.log("Current link group (with domain):", linkDetails.group_name);
      console.log("Current link group (extracted):", extractGroupName(linkDetails.group_name));
    }
  }, [userGroups, groups, linkDetails]);

  /**
   * Handles saving changes made to the link details via the form.
   * @param values - The form values submitted by the user.
   */
  const handleSaveChanges = async (values: typeof form.values) => {
    if (!linkDetails) return;
    setError(null);

    // Parse group_name to extract the group name and domain
    let group = null;
    let group_domain = null;

    if (values.group_name) {
        const parts = values.group_name.split("@");
        group = parts[0] || null;
        group_domain = parts[1] || null;
    }

    const payload = {
      url: values.url,
      description: values.description,
      expires: values.expires ? new Date(values.expires).toISOString() : null,
      group: group,
      group_domain: group_domain,
    };

    try {
      const response = await api.patch<Link>(
        `/api/links/${linkDetails.slug}`,
        payload
      );
      setLinkDetails(response.data);
      setEditing(false);
    } catch (err: any) {
      console.error("Failed to update link:", err);

      let msg = "Kunde inte spara ändringarna. Kontrollera fälten och försök igen.";
      if (axios.isAxiosError(err) && err.response) {
        // Extract the error message from the backend response
        msg = err.response.data.error || msg;
      }
      setError(msg);
    }
  };

  /**
   * Copies the short link (e.g., yourdomain.com/slug) to the clipboard.
   */
  const copyShortLink = () => {
    if (linkDetails) {
      const shortUrl = `${Configuration.backendApiUrl}/${linkDetails.slug}`;
      navigator.clipboard
        .writeText(shortUrl)
        .then(() => console.log("Kopierade kort länk:", shortUrl)) // User feedback (optional: use notifications)
        .catch((err) => console.error("Kunde inte kopiera kort länk:", err));
    }
  };

  /**
   * Copies the original (long) URL to the clipboard.
   */
  const copyOriginalLink = () => {
    if (!linkDetails) return;
    navigator.clipboard
      .writeText(linkDetails.url)
      .then(() => console.log("Kopierade originallänk:", linkDetails.url)) // User feedback
      .catch((err) => console.error("Kunde inte kopiera originallänk:", err));
  };

  /**
   * Handles the deletion of the current link after user confirmation.
   */
  const deleteLink = () => {
    if (!linkDetails) return;
    // Confirm before deleting
    if (
      window.confirm(
        "Är du säker på att du vill ta bort länken? Denna åtgärd kan inte ångras."
      )
    ) {
      api
        .delete(`/api/links/${linkDetails.slug}`)
        .then(() => {
          // Optionally, show a success notification here
          navigate("/links"); // Navigate away after successful deletion
        })
        .catch((err) => {
          console.error("Failed to delete link:", err);
          setError("Kunde inte ta bort länken.");
        });
    }
  };

  // --- Conditional Rendering for Loading/Error States ---
  if (loadingDetails) {
    return (
      <Box
        id="content"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 300,
        }}
      >
        <Loader />
      </Box>
    );
  }

  // If there's an error and linkDetails couldn't be fetched, show error message.
  if (error && !linkDetails && !loadingDetails) {
    // Ensure not to show this if details just failed but were previously loaded
    return (
      <>
        <Header title="Fel" />
        <Box id="content">
          <Alert color="red" title="Ett fel uppstod">
            {error}
          </Alert>
          <Button
            mt="md"
            onClick={() => navigate("/links")}
            leftSection={<IconArrowLeft size={iconSize} />}
          >
            Tillbaka till länkar
          </Button>
        </Box>
      </>
    );
  }

  // If no linkDetails are found (e.g., 404, but not an error state that prevents rendering)
  if (!linkDetails) {
    return (
      <>
        <Header title="Okänd länk" />
        <Box id="content">
          <Text>Ingen data kunde hittas för den här länken.</Text>
          <Button
            mt="md"
            onClick={() => navigate("/links")}
            leftSection={<IconArrowLeft size={iconSize} />}
          >
            Tillbaka till länkar
          </Button>
        </Box>
      </>
    );
  }

  // Determine if the stats data represents a zero-click line (for chart Y-axis scaling)
  const isZeroLine =
    statsData.length > 0 && statsData.every((d) => d.clicks === 0);

  const minDateTimeLocal = () => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate()
    )}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  };

  // --- Main Component JSX ---
  return (
    <>
      {/* Page Header: Displays the short link */}
      <Header
        title={`Detaljer - ${Configuration.backendApiUrl.replace(
          /^https?:\/\//i,
          ""
        )}/${linkDetails.slug}`}
      />

      {/* Main content area: Link details and actions, statistics charts */}
      <Box id="content" mb="x1">
        {/* Back Navigation Button */}
        <Button
          size="sm"
          variant="outline"
          radius="md"
          mb="md"
          onClick={() => navigate("/links")}
          leftSection={<IconArrowLeft size={iconSize} />}
        >
          Tillbaka till länkar
        </Button>

        {/* Main content area: Link details and actions, statistics charts */}
        <Group grow align="flex-start">
          {/* LEFT COLUMN: Link Information and Actions */}
          <Box>
            {/* Action Buttons Card: Copy, Delete */}
            <Card radius="lg" shadow="xs" withBorder p="md" mb="lg">
              <Group grow>
                <MantineTooltip label="Kopiera kortlänk" withArrow>
                  <Button
                    size="sm"
                    variant="light"
                    radius="md"
                    onClick={copyShortLink}
                  >
                    <IconClipboard size={iconSize} />
                  </Button>
                </MantineTooltip>
                <MantineTooltip label="Kopiera originallänk" withArrow>
                  <Button
                    size="sm"
                    variant="light"
                    radius="md"
                    onClick={copyOriginalLink}
                  >
                    <IconClipboardList size={iconSize} />
                  </Button>
                </MantineTooltip>
                <MantineTooltip label="Ladda om" withArrow>
                  <Button
                    size="sm"
                    variant="light"
                    radius="md"
                    onClick={() => window.location.reload()}
                  >
                    <IconRefresh size={iconSize} />
                  </Button>
                </MantineTooltip>
                <MantineTooltip label="Ta bort" withArrow>
                  <Button
                    size="sm"
                    variant="light"
                    radius="md"
                    color="red"
                    onClick={deleteLink}
                  >
                    <IconTrash size={iconSize} />
                  </Button>
                </MantineTooltip>
              </Group>
            </Card>

            {/* Link Details Card: Display or Edit Form */}
            <Card radius="lg" shadow="xs" withBorder p="md" mb="lg">
              <Title order={3} mb="sm">
                Länkdetaljer
              </Title>
              <Text size="sm">
                <strong>Kortlänk:</strong>{" "}
                <a
                  href={`${Configuration.backendApiUrl}/${linkDetails.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >{`${Configuration.backendApiUrl}/${linkDetails.slug}`}</a>
              </Text>
              <Text size="sm">
                <strong>Skapad:</strong>{" "}
                {new Date(linkDetails.date).toLocaleString(undefined)}
              </Text>
              <Text size="sm">
                <strong>Användare:</strong> {linkDetails.user_id || "Okänd"}
              </Text>
              <Text size="sm">
                <strong>Totala klick:</strong> {linkDetails.clicks}
              </Text>
              <Divider my="sm" />

              {editing ? (
                /* EDITING MODE: Form for updating link details */
                <form onSubmit={form.onSubmit(handleSaveChanges)}>
                  <TextInput
                    radius="md"
                    label="Ursprunglig URL"
                    placeholder="https://example.com/long-url"
                    {...form.getInputProps("url")}
                    required
                    mb="sm"
                  />
                  <TextInput
                    radius="md"
                    label="Beskrivning (valfritt)"
                    placeholder="En kort beskrivning av länken"
                    {...form.getInputProps("description")}
                    mb="sm"
                  />
                  <TextInput
                    radius="md"
                    type="datetime-local"
                    label="Upphör (valfritt)"
                    {...form.getInputProps("expires")}
                    min={minDateTimeLocal()} // ← disallow past times
                    mb="sm"
                  />
                  {hasGroups && (
                    <Select
                      label="Grupp (valfritt)"
                      radius="md"
                      placeholder="Välj grupp"
                      data={userGroups?.map((g) => ({
                          value: `${g.group_name}@${g.group_domain}`, // Full identifier as value
                          label: g.group_name // Just the name as label
                      }))}
                      searchable
                      clearable
                      {...form.getInputProps("group_name")}
                      mb="sm"
                    />
                  )}
                  {/* Display general errors related to saving */}
                  {error && !loadingDetails && (
                    <Alert color="red" title="Fel vid sparning" my="md">
                      {error}
                    </Alert>
                  )}
                  <Group mt="md">
                    <Button
                      type="submit"
                      size="sm"
                      variant="filled"
                      radius="md"
                    >
                      Spara ändringar
                    </Button>
                    <Button
                      size="sm"
                      variant="light"
                      radius="md"
                      onClick={() => {
                        setEditing(false);
                        setError(null); // Clear errors when cancelling edit
                        // Reset form to original linkDetails values if changes were made but not saved
                        form.setValues({
                          url: linkDetails.url || "",
                          description: linkDetails.description || "",
                          expires: linkDetails.expires
                            ? toLocalISOString(linkDetails.expires)
                            : "",
                          group_name: linkDetails.group_name || "",
                        });
                      }}
                    >
                      Avbryt
                    </Button>
                  </Group>
                </form>
              ) : (
                /* DISPLAY MODE: Showing current link details */
                <Box>
                  <Text size="sm">
                    <strong>Ursprunglig URL:</strong>{" "}
                    <a
                      href={linkDetails.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {linkDetails.url}
                    </a>
                  </Text>
                  <Text size="sm">
                    <strong>Beskrivning:</strong>{" "}
                    {linkDetails.description || "Ingen"}
                  </Text>
                  <Text size="sm">
                    <strong>Upphör:</strong>{" "}
                    {linkDetails.expires
                      ? new Date(linkDetails.expires).toLocaleString(undefined)
                      : "Aldrig"}
                  </Text>
                  <Text size="sm">
                    <strong>Grupp:</strong>{" "}
                    {extractGroupName(linkDetails.group_name)}
                  </Text>
                  {/* Display general errors if any occurred outside editing mode (e.g., stats fetch error) */}
                  {error && !loadingStats && (
                    <Alert color="red" title="Fel" my="md">
                      {error}
                    </Alert>
                  )}
                  <Button
                    size="sm"
                    mt="md"
                    variant="light"
                    radius="md"
                    onClick={() => {
                      setEditing(true);
                      setError(null); // Clear any previous general errors when entering edit mode
                    }}
                    leftSection={<IconEdit size={iconSize} />}
                  >
                    Redigera länkdetaljer
                  </Button>
                </Box>
              )}
            </Card>

            {/* QR-Code Card: Displays QR-Code for the link */}
            <Card radius="lg" shadow="xs" withBorder p="md">
              <Title order={3} mb="sm">
                QR-kod
              </Title>
              <Text size="sm" mb="sm">
                Skanna QR-koden för att öppna länken:
              </Text>
              <QRCode
                value={`${Configuration.backendApiUrl}/${linkDetails.slug}`}
                size={160}
                ecLevel="H"
                logoImage="/logo.svg"
                logoWidth={40}
                logoPadding={5}
              />
            </Card>
          </Box>

          {/* RIGHT COLUMN: Statistics Charts */}
          <Box>
            {/* Time-Series Click Statistics Card */}
            <Card radius="lg" shadow="xs" withBorder p="md">
              <Title order={3} mb="sm">
                Klickstatistik
              </Title>
              <Box mb="md">
                <Select
                  label="Visa statistik per"
                  value={granularity}
                  onChange={(value) =>
                    setGranularity((value as "day" | "hour" | "week") || "day")
                  }
                  data={[
                    { value: "day", label: "Totalt (per dag)" },
                    { value: "hour", label: "Idag (per timme)" },
                    { value: "week", label: "Senaste 7 dagarna (per dag)" },
                  ]}
                  radius="md"
                />
              </Box>
              {/* Display error specific to time-series stats if it's not a general save error */}
              {error && loadingStats && (
                <Alert color="red" title="Fel vid hämtning av statistik">
                  {error}
                </Alert>
              )}
              {loadingStats ? (
                <Group justify="center" style={{ minHeight: 350 }}>
                  <Loader />
                </Group>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart
                    data={statsData}
                    margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(tickValue) =>
                        formatAxisDate(tickValue, granularity)
                      }
                      stroke="#adb5bd"
                      tick={{ fontSize: 11 }}
                      padding={{ left: 10, right: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      allowDecimals={false}
                      // Ensure Y-axis shows at least 0-5 if all data points are 0
                      domain={[0, isZeroLine ? 5 : "auto"]}
                      stroke="#adb5bd"
                      tick={{ fontSize: 11 }}
                    />
                    <RechartsTooltip
                      labelFormatter={(label) =>
                        formatAxisDate(label, granularity)
                      }
                      formatter={(value: number) => [value, "Klick"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="clicks"
                      name="Klick"
                      stroke="#339AF0"
                      strokeWidth={2}
                      dot={!isZeroLine ? { r: 3, fill: "#339AF0" } : false} // Hide dots if it's a zero line
                      activeDot={{ r: 6 }}
                      isAnimationActive={false} // Consider enabling for better UX
                      connectNulls={false} // Do not connect lines over missing data points
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Language Click Statistics Card */}
            <Card radius="lg" shadow="xs" withBorder p="md" mt="lg">
              <Title order={3} mb="sm">
                Klick per språk
              </Title>
              {loadingLang && (
                <Group justify="center" style={{ minHeight: 200 }}>
                  <Loader />
                </Group>
              )}
              {errorLang && (
                <Alert color="red" title="Fel vid hämtning av språkstatistik">
                  {errorLang}
                </Alert>
              )}
              {!loadingLang &&
                !errorLang &&
                (langData.length === 0 ? (
                  <Text c="dimmed">Inga klick registrerade med språkdata.</Text>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={langData}
                      margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="language" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <RechartsTooltip
                        formatter={(value: number) => [value, "Klick"]}
                      />
                      <Bar dataKey="clicks" name="Klick" fill="#339AF0" />
                    </BarChart>
                  </ResponsiveContainer>
                ))}
            </Card>
          </Box>
        </Group>
      </Box>
    </>
  );
};

export default LinkStats;

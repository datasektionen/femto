import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    Box,
    Card,
    Button,
    Title,
    TextInput,
    Alert,
    Select,
    Center,
    Tooltip,
    Loader,
    Group,
    Stack,
    Divider,
    Anchor,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { QRCode } from "react-qrcode-logo";
import { Header } from "methone";
import { useAuth } from "../authorization/useAuth.ts";
import '@mantine/core/styles.css';
import Configuration from "../configuration.ts";

// Utility to construct a full short URL using the backend URL
const constructShortUrl = (slug: string) => `${Configuration.backendApiUrl}/${slug}`;

// Utility to construct a short URL for display purposes
const constructShortUrlWithoutProtocol = (slug: string) => constructShortUrl(slug).replace(/https?:\/\//, '');

// Copies the constructed short URL to the clipboard
const copyShortUrlToClipboard = (slug: string) => navigator.clipboard.writeText(`${Configuration.backendApiUrl}/${slug}`);

// Types for form values and API error
interface FormValues {
    url: string;
    short: string;
    expire: string;
    group: string | null;
}

interface ApiError {
    title: string;
    message: string;
}

// Function to extract just the group name from "group_name@group_id@group_domain" format
function extractGroupName(groupWithDomain: string | null): string {
    if (!groupWithDomain) return "Ingen grupp";

    const parts = groupWithDomain.split("@");
    return parts[0] || "Okänd grupp";
}

// Function to extract just the group name from "group_name@group_id@group_domain" format
function extractGroupId(groupWithDomain: string | null): string {
    if (!groupWithDomain) return "Ingen grupp";

    const parts = groupWithDomain.split("@");
    return parts[1] || "Okänd grupp";
}

// Function to extract just the group domain from "group_name@group_id@group_domain" format
function extractGroupDomain(groupWithDomain: string | null): string {
    if (!groupWithDomain) return "Ingen grupp";

    const parts = groupWithDomain.split("@");
    return parts[2] || "Okänd domän";
}

const Home = () => {
    const {
        hasToken,
        customLinks,
        userGroups,
        userData,
        refreshAuthData
    } = useAuth();

    // Component state
    const [fetching, setFetching] = useState(false);
    const [error, setError] = useState<ApiError | null>(null);
    const [result, setResult] = useState("");
    const [copied, setCopied] = useState(false);

    // Create a ref to the result section
    const resultRef = useRef<HTMLDivElement>(null);

    // Refresh auth data when component mounts
    useEffect(() => {
        refreshAuthData();
    }, []);

    const minDateTimeLocal = () => {
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, "0");
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    };

    const urlRegex: RegExp = /^https?:\/\/.*$/;
    const slugRegex: RegExp = /^[a-z0-9-]*$/; // Allow lowercase letters, numbers, and hyphens only

    // Mantine form setup with initial values and validation
    const form = useForm<FormValues>({
        initialValues: {
            url: "",
            short: "",
            expire: "",
            group: null,
        },
        validate: {
            url: (value) =>
                urlRegex.test(value) ? null : "Ogiltig URL. Ska inkludera http:// eller https://",
            short: (value) => slugRegex.test(value) ? null : "Ogiltig sökväg. Endast små bokstäver, siffror och bindestreck är tillåtna.",
            expire: (value) => {
                if (new Date(value) < new Date(minDateTimeLocal())) {
                    return "Utgångsdatum kan inte vara i det förflutna";
                }
                if (!value) {
                    return "Vänligen välj ett utgångsdatum";
                }
            }
        },
    });

    // Handles the form submission logic
    const submit = async (values: FormValues) => {
        if (fetching) return;

        setFetching(true);
        setResult("");
        setError(null);

        // Grab JWT token from localStorage
        const token = localStorage.getItem("token");

        // If token doesn't exist, show error
        if (!token) {
            setError({
                title: "Autentiseringsfel",
                message: "Du måste vara inloggad för att skapa länkar."
            });
            setFetching(false);
            return;
        }

        // Get user ID from auth context
        const userId = userData?.sub;

        if (!userId) {
            setError({
                title: "Autentiseringsfel",
                message: "Kunde inte hitta användar-ID. Vänligen försök logga in igen."
            });
            setFetching(false);
            return;
        }

        const expiresUtc = new Date(values.expire).toISOString();

        const data = {
            slug: values.short || "",
            url: values.url,
            user_id: userId,
            expires: expiresUtc,
            group_name: values.group ? extractGroupName(values.group) : null,
            group_id: values.group ? extractGroupId(values.group) : null,
            group_domain: values.group ? extractGroupDomain(values.group) : null,
            description: ""
        };

        console.log("[Link] ℹ️ Submitting link with data:", data);
        console.log("[Link] ℹ️ Local time selected:", values.expire);
        console.log("[Link] ℹ️ Converted to UTC:", data.expires);

        try {
            const response = await fetch(`${Configuration.backendApiUrl}/api/links`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });

            // read raw text first, then try JSON.parse, else wrap into an object
            const raw = await response.text();
            let resData: any;
            try {
                resData = JSON.parse(raw);
            } catch {
                resData = { error: raw, message: raw };
            }

            if (!response.ok) {
                switch (response.status) {
                    case 400:
                        setError({
                            title: "Ogiltig länk",
                            message: resData.error || resData.message || "Länken är ogiltig eller saknar nödvändig information.",
                        });
                        break;

                    case 403:
                        setError({
                            title: "Förbjuden länk",
                            message: resData.error || resData.message || "Denna länk är förbjuden",
                        });
                        break;

                    case 409:
                        setError({
                            title: "Redan tagen",
                            message: resData.error || resData.message || "Denna slug är redan tagen.",
                        });
                        break;

                    default:
                        throw new Error(resData.message || `HTTP error! Status: ${response.status}`);
                }
                return;
            }

            const slug = resData.slug || resData.short || resData.url;
            if (!slug) throw new Error("No valid slug returned");

            setResult(slug);
            form.reset();
        } catch (err: any) {
            console.error("[Link] ❌ Error inserting link 📁", err.stack);
            if (!error) {
                setError({ title: "Fel", message: "Internt serverfel" });
            }
        } finally {
            setFetching(false);
        }
    };

    // Handles copy-to-clipboard action
    const handleCopy = () => {
        copyShortUrlToClipboard(result);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Check if we should show the group selector
    const hasGroups = userGroups && userGroups.length > 0;

    // Scroll to result on result change
    useEffect(() => {
        if (result && resultRef.current) {
            resultRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }, [result]);

    return (
        <>
            <Header title="Länkförkortare" />
            <Box id="content" p="md">
                <Center>
                    <Card shadow="sm" radius="lg" withBorder w="100%" maw={800} p="xl">
                        {!hasToken && (
                            <Alert title="Du är inte inloggad" radius="md" color="blue">
                                <a href="/login">Logga in</a> för att förkorta länkar
                            </Alert>
                        )}

                        <Stack gap="lg">
                            <Title order={2}>Förkorta en länk</Title>

                            {error && (
                                <Alert color="red" title={error.title} withCloseButton onClose={() => setError(null)}>
                                    {error.message}
                                </Alert>
                            )}

                            <form onSubmit={form.onSubmit(submit)}>
                                <Stack>
                                    {/* Input for long URL */}
                                    <TextInput
                                        radius="md"
                                        placeholder="https://länk-som-du-vill-förkorta.se/jätte-lång-sökväg"
                                        label="Lång länk"
                                        required
                                        {...form.getInputProps("url")}
                                        disabled={fetching || !hasToken}
                                        onBlur={(event) => {
                                            let value = event.currentTarget.value.trim();

                                            if (
                                                value &&
                                                !value.startsWith("http://") &&
                                                !value.startsWith("https://")
                                            ) {
                                                value = `https://${value}`;
                                                form.setFieldValue("url", value);
                                            }
                                        }}
                                    />

                                    {/* Optional short link slug */}
                                    {customLinks && (
                                        <TextInput
                                            radius="md"
                                            placeholder="Specifiera egen sökväg (valfritt)"
                                            label="Anpassad sökväg"
                                            {...form.getInputProps("short")}
                                            disabled={fetching || !hasToken}
                                        />
                                    )}

                                    {/* Group selector - only visible if user has groups */}
                                    {hasGroups && (
                                        <Select
                                            radius="md"
                                            label="Grupp"
                                            placeholder="Tilldela länk till en grupp (valfritt)"
                                            value={form.values.group}
                                            onChange={(value) => form.setFieldValue('group', value)}
                                            data={
                                                userGroups!.map(group => ({
                                                    value: `${group.group_name}@${group.group_id}@${group.group_domain}`,
                                                    label: group.group_name
                                                }))
                                            }
                                            clearable
                                        />
                                    )}

                                    {/* Expiration date/time input if enabled */}
                                    <TextInput
                                        radius="md"
                                        type="datetime-local"
                                        label="Välj datum och tid"
                                        {...form.getInputProps("expire")}
                                        min={minDateTimeLocal()}
                                        withAsterisk
                                        disabled={fetching || !hasToken}
                                    />

                                    {/* Submit Button */}
                                    <Button
                                        radius="md"
                                        type="submit"
                                        fullWidth
                                        loading={fetching}
                                        disabled={!form.values.url || fetching || !hasToken}
                                    >
                                        {form.values.short
                                            ? `Förkorta länk - ${constructShortUrlWithoutProtocol(form.values.short)}`
                                            : `Förkorta länk - ${constructShortUrlWithoutProtocol("[automatisk sökväg]")}`}
                                    </Button>
                                </Stack>
                            </form>

                            {/* Optional loading spinner */}
                            {fetching && (
                                <Center mt="md">
                                    <Loader />
                                </Center>
                            )}

                            {/* Display short link result and QR code */}
                            {result && (
                                <div ref={resultRef}>
                                    <Divider label="Resultat" labelPosition="center" my="xl" />
                                    <Stack align="center" gap={16}>
                                        <Anchor size="lg" href={constructShortUrl(result)} target="_blank" rel="noopener noreferrer">
                                            {constructShortUrl(result)}
                                        </Anchor>
                                        <Group gap="md">
                                            <Button
                                                component={Link}
                                                variant="filled"
                                                style={{ color: 'white' }}
                                                radius="md"
                                                to={"/links/" + result + "/details"}
                                            >
                                                Se länkdetaljer
                                            </Button>
                                            <Tooltip label="Kopierat!" opened={copied} transitionProps={{ transition: 'fade', duration: 200 }}>
                                                <Button variant="light" radius="md" onClick={handleCopy}>
                                                    Kopiera länk
                                                </Button>
                                            </Tooltip>
                                        </Group>
                                        <QRCode
                                            value={constructShortUrl(result)}
                                            size={300}
                                            ecLevel="H"
                                            logoImage="/logo.svg"
                                            logoWidth={100}
                                        />
                                    </Stack>
                                </div>
                            )}
                        </Stack>
                    </Card>
                </Center>
            </Box>
        </>
    );
};

export default Home;

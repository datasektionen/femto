import React, { useState, useRef, useEffect } from "react";
import {
    Card,
    Button,
    Title,
    TextInput,
    Alert,
    Radio,
    RadioGroup,
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
import '@mantine/core/styles.css';
import Configuration from "../configuration.ts";
import type { ReactNode } from 'react';
import { useAuth } from "../authorization/useAuth.ts";



// Utility to construct a full short URL using the backend URL
const constructShortUrl = (slug: string) => `${Configuration.backendApiUrl}/${slug}`;

// Utility to construct a short URL for display purposes
const constructShortUrlWithoutProtocol = (slug: string) => constructShortUrl(slug).replace(/https?:\/\//, '');

// Copies the constructed short URL to the clipboard
const copyShortUrlToClipboard = (slug: string) => navigator.clipboard.writeText(`${Configuration.backendApiUrl}/${slug}`);

// Types for form values, API error, and mandate structure
interface FormValues {
    url: string;
    short: string;
    expire: string;         // This will hold the actual date
    hasExpiration: boolean; // New toggle field
    group: string | null;
}

interface ApiError {
    title: string;
    message: string;
}

interface LinkCreatorProps {
    title?: string;
    desc?: string | ReactNode;
    custom?: boolean;
    disabled?: boolean;
    userGroups?: {
        group_name: string;
        group_id: string;
        group_domain: string;
        tag_content: string;
    }[];
    showAdvancedOptions?: boolean;
}

// Function to extract just the group name from "group_name@group_domain" format
function extractGroupName(groupWithDomain: string | null): string {
    if (!groupWithDomain) return "Ingen grupp";

    const parts = groupWithDomain.split("@");
    return parts[0] || "Okänd grupp";
}

// Function to extract just the group domain from "group_name@group_domain" format
function extractGroupDomain(groupWithDomain: string | null): string {
    if (!groupWithDomain) return "Ingen grupp";

    const parts = groupWithDomain.split("@");
    return parts[1] || "Okänd domän";
}

// Main component
const LinkCreator: React.FC<LinkCreatorProps> = ({
    custom = true,
    disabled = false,
    userGroups = [],
    showAdvancedOptions = false,
}) => {

    // Get userData from auth context
    const { userData } = useAuth();

    // Component state
    const [fetching, setFetching] = useState(false);
    const [error, setError] = useState<ApiError | null>(null);
    const [result, setResult] = useState("");
    const [copied, setCopied] = useState(false);

    // Create a ref to the result section
    const resultRef = useRef<HTMLDivElement>(null);

    const minDateTimeLocal = () => {
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, "0");
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    };

    const urlRegex: RegExp = /^https?:\/\/.*$/;
    const slugRegex: RegExp = /^[a-z0-9-]+$/;

    // Mantine form setup with initial values and validation
    const form = useForm<FormValues>({
        initialValues: {
            url: "",
            short: "",
            expire: "",
            hasExpiration: false, // New field
            group: null,
        },
        validate: {
            url: (value) =>
                urlRegex.test(value) ? null : "Ogiltig URL. Ska inkludera http:// eller https://",
            short: (value) => slugRegex.test(value) ? null : "Ogiltig sökväg. Endast små bokstäver, siffror och bindestreck är tillåtna.",
            expire: (value, values) => {
                // Validate date only if expiration is enabled
                if (values.hasExpiration) {
                    if (new Date(value) < new Date(minDateTimeLocal())) {
                        return "Utgångsdatum kan inte vara i det förflutna";
                    }
                    if (!value) {
                        return "Vänligen välj ett utgångsdatum";
                    }
                }
                return null;
            }
        },
    });

    // Handles the form submission logic
    const submit = async (values: FormValues) => {
        if (fetching) return;

        setFetching(true);
        setResult("");
        setError(null);

        // Grab JWT token and user data from localStorage
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

        // Get user ID from auth context instead of localStorage
        const userId = userData?.sub;

        if (!userId) {
            setError({
                title: "Autentiseringsfel",
                message: "Kunde inte hitta användar-ID. Vänligen försök logga in igen."
            });
            setFetching(false);
            return;
        }

        const expiresUtc = values.hasExpiration
            ? new Date(values.expire).toISOString()
            : null;

        const data = {
            slug: values.short || "",
            url: values.url,
            user_id: userId,
            // Convert to UTC before sending to server
            expires: expiresUtc,
            group: values.group ? extractGroupName(values.group) : null,
            group_domain: values.group ? extractGroupDomain(values.group) : null,
            description: ""
        };

        console.log("Submitting link with data:", data);
        console.log("Local time selected:", values.expire);
        console.log("Converted to UTC:", data.expires);

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
            console.error("❌ Error inserting link 📁", err.stack);
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

    // Prepare data for the Select component from the Mandate objects
    const groupSelectData = userGroups.map(group => ({
        label: `${group.group_name}${group.group_domain ? ` (${group.group_domain})` : ''}`,
        value: group.group_name,
        group_domain: group.group_domain
    }));

    // Check if we should show the group selector
    const hasGroups = groupSelectData.length > 0;

    // Scroll to result on result change
    useEffect(() => {
        if (result && resultRef.current) {
            resultRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }, [result]);

    // Render the UI
    return (
        <Center>
            <Card shadow="sm" radius="lg" withBorder w="100%" maw={1000} p="xl">
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
                                disabled={fetching || disabled}
                            />

                            {/* Optional short link slug */}
                            {custom && (
                                <TextInput
                                    radius="md"
                                    placeholder="Specifiera egen sökväg (valfritt)"
                                    label="Anpassad sökväg"
                                    {...form.getInputProps("short")}
                                    disabled={fetching || disabled}
                                />
                            )}

                            {/* Advanced options section - only visible with permissions */}
                            {showAdvancedOptions && (
                                <>
                                    {/* Group selector - only visible if user has groups */}
                                    {hasGroups && (
                                        <Select
                                            radius="md"
                                            label="Grupp"
                                            placeholder="Tilldela länk till en grupp (valfritt)"
                                            value={form.values.group}
                                            onChange={(value) => form.setFieldValue('group', value)}
                                            data={
                                                userGroups.map(group => ({
                                                    value: `${group.group_name}@${group.group_domain}`, // Full identifier as value
                                                    label: group.group_name // Just the name part as display label
                                                }))
                                            }
                                            clearable
                                        />
                                    )}
                                </>
                            )}

                            {/* Optional expiration toggle */}
                            <RadioGroup
                                label="Utgångsdatum"
                                value={form.values.hasExpiration ? "yes" : "no"}
                                onChange={(value) => {
                                    form.setFieldValue('hasExpiration', value === 'yes');
                                    // Clear the expire field if disabled
                                    if (value === 'no') form.setFieldValue('expire', '');
                                }}
                            >
                                <Group gap="md">
                                    <Radio value="yes" label="Ja" disabled={fetching || disabled} />
                                    <Radio value="no" label="Nej" disabled={fetching || disabled} />
                                </Group>
                            </RadioGroup>

                            {/* Expiration date/time input if enabled */}
                            {form.values.hasExpiration && (
                                <TextInput
                                    radius="md"
                                    type="datetime-local"
                                    label="Välj datum och tid"
                                    {...form.getInputProps("expire")}
                                    min={minDateTimeLocal()}       // ← disallow any date‐time before now
                                    withAsterisk
                                    disabled={fetching || disabled}
                                />
                            )}

                            {/* Submit Button */}
                            <Button
                                radius="md"
                                type="submit"
                                fullWidth
                                loading={fetching}
                                disabled={!form.values.url || fetching || disabled}
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
                                <Tooltip label="Kopierat!" opened={copied} transitionProps={{ transition: 'fade', duration: 200 }}>
                                    <Button variant="light" radius="md" onClick={handleCopy}>
                                        Kopiera länk
                                    </Button>
                                </Tooltip>
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
    );

};

export default LinkCreator;

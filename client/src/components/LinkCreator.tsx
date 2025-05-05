import React, { useState } from "react";
import {
  Card,
  Button,
  Title,
  Text,
  TextInput,
  Alert,
  Radio,
  RadioGroup,
  Select,
  Center,
  Tooltip,
  Box,
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
import type {ReactNode } from 'react';

// Utility to construct a full short URL using the backend URL
const constructShortUrl = (slug: string) => `${Configuration.backendApiUrl}/${slug}`;

// Copies the constructed short URL to the clipboard
const copyShortUrlToClipboard = (slug: string) => navigator.clipboard.writeText(`${Configuration.backendApiUrl}/${slug}`);

// Types for form values, API error, and mandate structure
interface FormValues {
  url: string;
  short: string;
  expire: string;
  mandate: string | null;
}

interface ApiError {
  title: string;
  message: string;
}

interface Mandate {
  id: string;
  role: string;
}

interface LinkCreatorProps {
  title?: string;
  desc?: string | ReactNode;
  custom?: boolean;
  disabled?: boolean;
  userMandates?: Mandate[];
}

// Main component
const LinkCreator: React.FC<LinkCreatorProps> = ({
  title = "Förkorta en länk",
  desc = "Klistra in en länk för att förkorta den.",
  custom = true,
  disabled = false,
  userMandates = [],
}) => {
  // Component state
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);

  // Mantine form setup with initial values and validation
  const form = useForm<FormValues>({
    initialValues: {
      url: "",
      short: "",
      expire: "",
      mandate: null,
    },
    validate: {
      url: (value) =>
        /^https?:\/\/.*$/.test(value) ? null : "Invalid URL. Should include http:// or https://",
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
    let userData = null;
    try {
      userData = JSON.parse(localStorage.getItem("userData") || "{}");
    } catch (e) {
      console.error("Error parsing user data:", e);
    }

    // If user is not authenticated, show an error
    if (!token) {
      setError({
        title: "Authentication Error",
        message: "You must be logged in to create links."
      });
      setFetching(false);
      return;
    }

    // Extract user ID from stored user data
    const userId = userData?.sub || userData?.user || userData?.username || "unknown";

    // Build request payload
    const data = {
      slug: values.short || "",
      url: values.url,
      user_id: userId,
      expire: values.expire || null,
      mandate: values.mandate || null,
    };

    try {
      const response = await fetch(`${Configuration.backendApiUrl}/api/links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const resData = await response.json();

      // Handle any HTTP error responses
      if (!response.ok) {
        throw new Error(resData.message || `HTTP error! Status: ${response.status}`);
      }

      // Extract short link identifier from response
      const slug = resData.slug || resData.short || resData.url;
      if (!slug) throw new Error("No valid slug returned");

      setResult(slug);
      form.reset();
    } catch (err) {
      console.error("Error submitting form:", err);
      setError({ title: "Error", message: err instanceof Error ? err.message : String(err) });
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

  // Transform user mandates into format used by <Select />
  const mandateSelectData = userMandates.map((m) => ({
    label: m.role,
    value: m.id,
  }));

  // Render the UI
  return (
    <Center py="xl">
      <Card shadow="lg" radius="lg" withBorder w="100%" maw={1000} p="xl">
        <Stack gap="lg">
          <Box>
            <Title order={2}>{title}</Title>
            <Text color="dimmed" size="sm">{desc}</Text>
          </Box>

          {error && (
            <Alert color="red" title={error.title} withCloseButton onClose={() => setError(null)}>
              {error.message}
            </Alert>
          )}

          <form onSubmit={form.onSubmit(submit)}>
            <Stack gap={16}>
              {/* Input for long URL */}
              <TextInput
                placeholder="https://din-länk.se"
                label="Lång länk"
                required
                {...form.getInputProps("url")}
                disabled={fetching || disabled}
              />

              {/* Optional short link slug */}
              {custom && (
                <TextInput
                  placeholder="Valfri kortlänk"
                  label="Anpassad kortlänk"
                  {...form.getInputProps("short")}
                  disabled={fetching || disabled}
                />
              )}

              {/* Optional expiration toggle */}
              <RadioGroup
                label="Utgångsdatum (valfritt)"
                value={form.values.expire ? "yes" : "no"}
                onChange={(value) => {
                  form.setFieldValue('expire', value === 'no' ? '' : 'yes');
                }}
              >
                <Group gap="md">
                  <Radio value="yes" label="Ja" disabled={fetching || disabled} />
                  <Radio value="no" label="Nej" disabled={fetching || disabled} />
                </Group>
              </RadioGroup>

              {/* Expiration date/time input if enabled */}
              {form.values.expire !== "" && (
                <TextInput
                  type="datetime-local"
                  label="Välj datum och tid"
                  {...form.getInputProps("expire")}
                  disabled={fetching || disabled}
                />
              )}

              {/* Optional mandate selection */}
              {userMandates.length > 0 && (
                <Select
                  label="Koppla till mandat (valfritt)"
                  placeholder="Välj mandat"
                  data={mandateSelectData}
                  searchable
                  clearable
                  {...form.getInputProps("mandate")}
                  disabled={fetching || disabled}
                />
              )}

              {/* Submit button */}
              <Button
                type="submit"
                fullWidth
                loading={fetching}
                disabled={!form.values.url || fetching || disabled}
              >
                Förkorta länk
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
            <>
              <Divider label="Resultat" labelPosition="center" my="xl" />
              <Stack align="center" gap={16}>
                <Title order={4}>Din kortlänk:</Title>
                <Anchor size="lg" href={constructShortUrl(result)} target="_blank" rel="noopener noreferrer">
                  {constructShortUrl(result)}
                </Anchor>
                <Tooltip label="Kopierat!" opened={copied} transitionProps={{ transition: 'fade', duration: 200 }}>
                  <Button variant="light" onClick={handleCopy}>
                    Kopiera länk
                  </Button>
                </Tooltip>
                <QRCode
                  value={constructShortUrl(result)}
                  size={160}
                  ecLevel="H"
                  logoImage="/logo.svg"
                  logoWidth={40}
                  logoPadding={5}
                />
              </Stack>
            </>
          )}
        </Stack>
      </Card>
    </Center>
  );
};

export default LinkCreator;

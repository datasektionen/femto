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
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { QRCode } from "react-qrcode-logo";
import '@mantine/core/styles.css';
import Configuration from "../configuration.ts";
import type { CSSProperties, ReactNode } from 'react';

// Utility functions
const constructShortUrl = (slug: string) => `${Configuration.backendApiUrl}/${slug}`;
const copyShortUrlToClipboard = (slug: string) => navigator.clipboard.writeText(`${Configuration.backendApiUrl}/${slug}`);

// Define types
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

const LinkCreator: React.FC<LinkCreatorProps> = ({
  title = "Förkorta en länk",
  desc = "Klistra in en länk för att förkorta den.",
  custom = true,
  disabled = false,
  userMandates = [],
}) => {
  // State management
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);

  // Form handling using Mantine's useForm
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

  // Function to handle form submission
  const submit = async (values: FormValues) => {
    if (fetching) return;
    setFetching(true);
    setResult("");
    setError(null);

    // Get JWT token and user data from localStorage
    const token = localStorage.getItem("token");
    let userData = null;
    try {
      userData = JSON.parse(localStorage.getItem("userData") || "{}");
    } catch (e) {
      console.error("Error parsing user data:", e);
    }

    // If token doesn't exist, show error
    if (!token) {
      setError({
        title: "Authentication Error",
        message: "You must be logged in to create links."
      });
      setFetching(false);
      return;
    }

    // Get user ID from userData
    const userId = userData?.sub || userData?.user || userData?.username || "unknown";

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
      if (!response.ok) {
        throw new Error(resData.message || `HTTP error! Status: ${response.status}`);
      }

      // Check available keys and set result
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

  const handleCopy = () => {
    copyShortUrlToClipboard(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Prepare data for the Select component from the Mandate objects
  const mandateSelectData = userMandates.map((m) => ({
    label: m.role,
    value: m.id,
  }));

  return (
    <Center py="xl">
      <Card
        shadow="lg"
        radius="lg"
        withBorder
        w="100%"
        maw={1000} // max width of 1000px
        p="xl"
      >
        <Stack spacing="lg">
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
            <Stack spacing="md">
              <TextInput
                placeholder="https://din-länk.se"
                label="Lång länk"
                required
                {...form.getInputProps("url")}
                disabled={fetching || disabled}
              />

              {custom && (
                <TextInput
                  placeholder="Valfri kortlänk"
                  label="Anpassad kortlänk"
                  {...form.getInputProps("short")}
                  disabled={fetching || disabled}
                />
              )}

              <RadioGroup
                label="Utgångsdatum (valfritt)"
                value={form.values.expire ? "yes" : "no"}
                onChange={(value) => {
                  if (value === 'no') {
                    form.setFieldValue('expire', '');
                  }
                }}
              >
                <Group gap="md">
                  <Radio value="yes" label="Ja" disabled={fetching || disabled} />
                  <Radio value="no" label="Nej" disabled={fetching || disabled} />
                </Group>
              </RadioGroup>

              {form.values.expire !== "" && (
                <TextInput
                  type="datetime-local"
                  label="Välj datum och tid"
                  {...form.getInputProps("expire")}
                  disabled={fetching || disabled}
                />
              )}

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

          {fetching && (
            <Center mt="md">
              <Loader />
            </Center>
          )}

          {result && (
            <>
              <Divider label="Resultat" labelPosition="center" my="xl" />
              <Stack align="center" spacing="md">
                <Title order={4}>Din kortlänk:</Title>
                <Text size="lg" weight={600} component="a" href={constructShortUrl(result)} target="_blank" rel="noopener noreferrer">
                  {constructShortUrl(result)}
                </Text>
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

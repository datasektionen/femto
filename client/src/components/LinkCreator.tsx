import React, { useState } from "react";
import { Button, Title, Text, TextInput, Alert, Radio, RadioGroup, Select, Center, Tooltip, Box, Loader } from "@mantine/core";
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
  // Add other properties if needed
}

// Styles
const styles = {
  root: {
    padding: "20px",
    //maxWidth: "600px",
    margin: "20px auto",
    backgroundColor: "#fff",
    borderRadius: "20px",
    boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
    minHeight: "50vh",
  },
  input: {
    marginBottom: "10px",
  },
  dateInput: {
    marginBottom: "10px",
  },
  formControl: {
    marginBottom: "20px",
  },
  button: {
    marginTop: "30px",
  },
  resultContainer: {
    marginTop: "30px",
    textAlign: "center" as CSSProperties['textAlign'],
  },
};

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
      let errorMessage = "Something went wrong";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      setError({ title: "Error", message: errorMessage });
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
    <Box style={styles.root}>
      <Title order={2}>{title}</Title>
      <Box mb="md">{desc}</Box>

      {error && (
        <Alert 
          title={error.title} 
          color="red" 
          withCloseButton 
          onClose={() => setError(null)} 
          mt="md"
        >
          {error.message}
        </Alert>
      )}

      <form onSubmit={form.onSubmit(submit)}>
        <TextInput
          style={styles.input}
          placeholder="Lång länk (inkl. https://)"
          label="URL att förkorta"
          required
          {...form.getInputProps("url")}
          disabled={fetching || disabled}
        />

        {custom && (
          <TextInput
            style={styles.input}
            placeholder="Önskad kortlänk (t.ex. sm-handlingar)"
            label="Anpassad kortlänk (valfritt)"
            {...form.getInputProps("short")}
            disabled={fetching || disabled}
          />
        )}

        <RadioGroup
          label="Sätt utgångsdatum (valfritt)"
          value={form.values.expire ? "yes" : "no"}
          onChange={(value) => {
            if (value === 'no') {
              form.setFieldValue('expire', '');
            }
          }}
          style={styles.formControl}
        >
          <Radio value="yes" label="Ja" disabled={fetching || disabled} />
          <Radio value="no" label="Nej" disabled={fetching || disabled} />
        </RadioGroup>

        {(form.getInputProps('expire').value !== '' || 
          (form.values.expire && form.getInputProps('expire').value === '')) && (
          <TextInput
            type="datetime-local"
            label="Utgångsdatum och tid"
            style={styles.dateInput}
            required={form.getInputProps('expire').value !== ''}
            {...form.getInputProps("expire")}
            disabled={fetching || disabled}
          />
        )}

        {userMandates && userMandates.length > 0 && (
          <Select
            label="Koppla till mandat (valfritt)"
            placeholder="Välj mandat"
            data={mandateSelectData}
            searchable
            clearable
            style={styles.formControl}
            {...form.getInputProps("mandate")}
            disabled={fetching || disabled}
          />
        )}

        <Button 
          type="submit" 
          loading={fetching} 
          disabled={!form.values.url || fetching || disabled} 
          style={styles.button} 
          fullWidth
        >
          Förkorta
        </Button>
      </form>

      {fetching && <Center mt="md"><Loader /></Center>}

      {result && (
        <Box style={styles.resultContainer}>
          <Title order={3}>Din förkortade länk:</Title>
          <Text size="lg" fw={500} mb="md">
            <a href={constructShortUrl(result)} target="_blank" rel="noopener noreferrer">
              {constructShortUrl(result)}
            </a>
          </Text>

          <Tooltip 
            label="Kopierat!" 
            opened={copied} 
            transitionProps={{ transition: 'fade', duration: 150 }}
          >
            <Button
              onClick={handleCopy}
              variant="light"
              mb="lg"
            >
              Kopiera länk
            </Button>
          </Tooltip>

          <Center>
            <QRCode
              value={constructShortUrl(result)}
              size={180}
              ecLevel="H"
              logoImage="/logo.svg"
              logoWidth={40}
              logoPadding={5}
            />
          </Center>
        </Box>
      )}
    </Box>
  );
};

export default LinkCreator;
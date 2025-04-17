import React, { useState } from "react";
import { Button, Title, Text, TextInput, Alert, Radio, RadioGroup, Select, Center, Tooltip, Box, Loader } from "@mantine/core";
import { useForm } from "@mantine/form";
import { QRCode } from "react-qrcode-logo";
import '@mantine/core/styles.css';  // Import Mantine core styles first

const API_KEY = import.meta.env.VITE_API_KEY || null;

// Placeholder utility functions
const constructShortUrl = (url: string) => `shortened-example.com/${url}`;
const constructShortUrlWithProtocol = (url: string) => `https://${url}`;
const copyShortUrlToClipboard = (url: string) => navigator.clipboard.writeText(url);

// Inline styles instead of createStyles
const styles = {
  root: {
    padding: "20px",
    maxWidth: "600px",
    margin: "0 auto",
    backgroundColor: "#f9f9f9",
    borderRadius: "8px",
    boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
    minHeight: "50vh", // Ensure the container has a minimum height
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
    textAlign: "center",
  },
};

interface LinkCreatorProps {
  title: string;
  desc: string | React.ReactNode;
  custom?: boolean;
  disabled?: boolean;
  userMandates?: { id: string; role: string }[];
}

const LinkCreator: React.FC<LinkCreatorProps> = ({
  title,
  desc,
  custom,
  disabled,
  userMandates = [],
}) => {
  // State management
  const [radio, setRadio] = useState("no");
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);

  // Form handling using Mantine's useForm
  const form = useForm({
    initialValues: {
      url: "",
      short: "",
      expire: "",
      mandate: "",
    },
    validate: {
      url: (value) =>
        /^https?:\/\/.*$/.test(value) ? null : "Invalid URL. Should include http:// or https://",
    },
  });

  // Function to handle form submission
  const submit = async (values) => {
    if (fetching) return;
    setFetching(true);
    setResult("");
    setError(null);

    const data = {
      slug: values.short || "",
      url: values.url,
      user_id: "yourUserIdHere", // Replace with actual user ID from state/context
      expire: values.expire || null,
      mandate: values.mandate || null,
    };

    try {
      const response = await fetch("http://localhost:5000/api/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`, // Include API key in the Authorization header
        },
        body: JSON.stringify(data),
      });

      const resData = await response.json();
      console.log("API Response:", resData); // Debugging output

      if (!response.ok) {
        throw new Error(resData.message || `HTTP error! Status: ${response.status}`);
      }

      // Check available keys and set result
      const shortUrl = resData.slug || resData.short || resData.url;
      if (!shortUrl) throw new Error("No valid short URL returned");

      setResult(shortUrl);
      form.reset();
    } catch (err) {
      console.error("Error submitting form:", err);
      setError({ title: "Error", message: err.message || "Something went wrong" });
    } finally {
      setFetching(false);
    }
  };

  return (
    <Box style={styles.root}>
      <Title order={2}>{title}</Title>
      <Text>{desc}</Text>

      {error && (
        <Alert title={error.title} color="red">
          {error.message}
        </Alert>
      )}

      <form onSubmit={form.onSubmit(submit)}>
        <TextInput
          style={styles.input}
          placeholder="Lång jävla länk"
          {...form.getInputProps("url")}
          disabled={fetching || disabled}
        />

        {custom && (
          <TextInput
            style={styles.input}
            placeholder="Önskad förkortad länk, till exempel 'sm-handlingar'"
            {...form.getInputProps("short")}
            disabled={fetching || disabled}
          />
        )}

        <div style={styles.formControl}>
          <RadioGroup label="Utgångsdatum" value={radio} onChange={setRadio}>
            <Radio value="yes" label="Ja" disabled={fetching || disabled} />
            <Radio value="no" label="Nej" disabled={fetching || disabled} />
          </RadioGroup>
        </div>

        {radio === "yes" && (
          <div style={styles.dateInput}>
            <TextInput
              type="datetime-local"
              {...form.getInputProps("expire")}
              disabled={fetching || disabled}
            />
          </div>
        )}

        {userMandates.length > 0 && (
          <div style={styles.formControl}>
            <Text>Koppla länken till ett mandat eller grupp?</Text>
            <Select
              label="Framtida funktionärer på posten blir ägare av länken"
              data={userMandates.map((m) => ({ label: m.role, value: m.id }))}
              searchable
              allowDeselect
              {...form.getInputProps("mandate")}
              disabled={fetching || disabled}
            />
          </div>
        )}

        <Button style={styles.button} type="submit" disabled={!form.values.url || fetching || disabled}>
          Förkorta
        </Button>
      </form>

      {fetching && (
        <Center mt="xl">
          <Loader />
        </Center>
      )}

      {result && (
        <div style={styles.resultContainer}>
          <h3>
            <a href={constructShortUrlWithProtocol(result)} target="_blank" rel="noopener noreferrer">
              {constructShortUrl(result)}
            </a>
          </h3>

          <Tooltip label="Kopierat" opened={copied} transition="fade">
            <Button
              onClick={() => {
                copyShortUrlToClipboard(result);
                setCopied(true);
                setTimeout(() => setCopied(false), 3000);
              }}
              disabled={fetching}
            >
              Kopiera länk
            </Button>
          </Tooltip>

          <QRCode
            value={constructShortUrl(result)}
            size={240}
            level="H"
            renderAs="canvas"
            logoImage="/logo.svg"
            logoWidth={52}
          />

        </div>
      )}
    </Box>
  );
};

export default LinkCreator;

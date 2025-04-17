import React, { useState } from "react";
import { Button, Title, Text, TextInput, Alert, Radio, RadioGroup, Select, Center, Tooltip, Box, Loader } from "@mantine/core";
import { useForm } from "@mantine/form";
import { QRCode } from "react-qrcode-logo";
import '@mantine/core/styles.css';
import type { CSSProperties, ReactNode } from 'react'; // Import ReactNode

const API_KEY = import.meta.env.VITE_API_KEY || null;

// Placeholder utility functions
//const constructShortUrl = (url: string) => `shortened-example.com/${url}`;
const constructShortUrlWithProtocol = (url: string) => `https://${url}`;
const copyShortUrlToClipboard = (url: string) => navigator.clipboard.writeText(url);

// Define type for form values
interface FormValues {
  url: string;
  short: string;
  expire: string;
  mandate: string | null; // Keep mandate value as string (e.g., mandate ID)
}

// Define type for API Error response
interface ApiError {
  title: string;
  message: string;
}

// Define the structure for a Mandate object (matching Home.tsx)
interface Mandate {
    id: string;
    role: string;
    // Add other properties if they exist in Home.tsx's mandate objects
}


// Inline styles
const styles = {
  // ... (keep existing styles) ...
  root: {
    padding: "20px",
    maxWidth: "600px",
    margin: "20px auto", // Added margin for spacing between creators
    backgroundColor: "#f9f9f9",
    borderRadius: "8px",
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
  desc?: ReactNode; // Changed from string to ReactNode
  custom?: boolean;
  disabled?: boolean;
  userMandates?: Mandate[]; // Changed from string[] to Mandate[]
}

const LinkCreator: React.FC<LinkCreatorProps> = ({
  title = "Förkorta en länk",
  desc = "Klistra in en länk för att förkorta den.", // Default desc remains a string
  custom = true,
  disabled = false,
  userMandates = [], // Default remains empty array
}) => {
  const [fetching, setFetching] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [copied, setCopied] = useState(false);

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

    const data = {
      slug: values.short || "",
      url: values.url,
      user_id: "yourUserIdHere", // Replace with actual user ID logic
      expire: values.expire || null,
      mandate: values.mandate || null, // Mandate value is already the ID (string) from the form
    };

    try {
      const response = await fetch("http://localhost:5000/api/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`, // Make sure API_KEY is handled securely
        },
        body: JSON.stringify(data),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || `HTTP error! status: ${response.status}`);
      }

      setResult(resData.slug);
      form.reset();

    } catch (err) {
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
    copyShortUrlToClipboard(constructShortUrlWithProtocol(result));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Prepare data for the Select component from the Mandate objects
  const mandateSelectData = userMandates.map((m) => ({
      label: m.role, // Use role for display
      value: m.id,   // Use id as the value
  }));


  return (
    <Box style={styles.root}>
      <Title order={2}>{title}</Title>
      {/* Render desc directly as it can now be JSX */}
      <Box mb="md">{desc}</Box>

      <form onSubmit={form.onSubmit(submit)}>
        {/* ... TextInput for url ... */}
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

        {/* ... RadioGroup for expire ... */}
        <RadioGroup
            label="Sätt utgångsdatum (valfritt)"
            value={form.values.expire ? "yes" : "no"}
            onChange={(value) => {
                if (value === 'no') {
                    form.setFieldValue('expire', ''); // Clear expire date if 'No' is selected
                } else {
                    // Optionally set a default date or leave it for the input
                    // form.setFieldValue('expire', new Date().toISOString().slice(0, 16));
                }
            }}
            style={styles.formControl}
            >
            <Radio value="yes" label="Ja" disabled={fetching || disabled} />
            <Radio value="no" label="Nej" disabled={fetching || disabled} />
        </RadioGroup>


        {/* Conditionally render date input based on RadioGroup, not form value */}
        {form.getInputProps('expire').value !== '' || (form.values.expire && form.getInputProps('expire').value === '') && ( // Show if 'yes' is selected OR if there's an initial value
             <TextInput
                type="datetime-local"
                label="Utgångsdatum och tid"
                style={styles.dateInput}
                required={form.getInputProps('expire').value !== ''} // Make required only if 'yes' is selected
                {...form.getInputProps("expire")}
                disabled={fetching || disabled}
            />
        )}


        {/* Check if userMandates array has items */}
        {userMandates && userMandates.length > 0 && (
          <Select
            label="Koppla till mandat (valfritt)"
            placeholder="Välj mandat"
            data={mandateSelectData} // Use the mapped data
            searchable
            clearable // Replaces allowDeselect in newer Mantine versions
            style={styles.formControl}
            {...form.getInputProps("mandate")} // This binds the selected mandate ID (string)
            disabled={fetching || disabled}
          />
        )}

        <Button type="submit" loading={fetching} disabled={disabled} style={styles.button} fullWidth>
          Förkorta
        </Button>
      </form>

      {/* ... Error, Loader, Result sections ... */}
       {error && (
        <Alert title={error.title} color="red" withCloseButton onClose={() => setError(null)} mt="md">
          {error.message}
        </Alert>
      )}

      {fetching && <Center mt="md"><Loader /></Center>}

      {result && (
        <Box style={styles.resultContainer}>
          <Title order={3}>Din förkortade länk:</Title>
          <Text size="lg" fw={500} mb="md">
            {constructShortUrlWithProtocol(result)}
          </Text>

          <Tooltip label="Kopierat!" opened={copied} transitionProps={{ transition: 'fade', duration: 150 }}>
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
                value={constructShortUrlWithProtocol(result)}
                size={180} // Slightly smaller QR code
                ecLevel="H"
                logoImage="/logo.svg" // Ensure this path is correct
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

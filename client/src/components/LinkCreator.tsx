import React, { useState } from "react";
import {
    Button,
    createStyles,
    Title,
    Text,
    TextInput,
    Alert,
    Radio,
    RadioGroup,
    Select,
    Center,
    Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { QRCode } from "react-qrcode-logo";

const API_KEY = process.env.REACT_APP_API_KEY || null;  // Get API key from environment variables

/**
 * LinkCreator contains UI components used for link creation on the Homepage
 * Current version implements interactable UI components, 
 * however we use placeholder functions, as these functions are not yet implemented
 */

// PLACEHOLDERS, Utility functions for URL formatting and copying 
const constructShortUrl = (url: string) => `shortened-example.com/${url}`; // Constructs a shortened URL
const constructShortUrlWithProtocol = (url: string) => `https://${url}`; // Adds HTTPS protocol to the shortened URL
const copyShortUrlToClipboard = (url: string) => navigator.clipboard.writeText(url); // Copies the URL to clipboard

// Styles for the component
const useStyles = createStyles(() => ({
    root: {
        "input[type=radio]": { margin: 0 },
        label: { marginBottom: 0 },
    },
    input: { margin: "10px 0" },
    date: { margin: "20px 0" },
}));

// TypeScript interface defining the expected props for the component
interface LinkCreatorProps {
    title: string; // Title of the link creator section
    desc: string | React.ReactNode; // Description text or JSX element
    custom?: boolean; // Determines if users can specify a custom short URL
    disabled?: boolean; // Whether the form is disabled
    userMandates?: { id: string; role: string }[]; // Optional mandates for linking
}

// Main functional component
const LinkCreator: React.FC<LinkCreatorProps> = ({ title, desc, custom, disabled, userMandates = [] }) => {
    const { classes } = useStyles(); // Using styles defined above
    
    // State management
    const [radio, setRadio] = useState("no"); // State for radio button (expiry option)
    const [fetching, setFetching] = useState(false); // State to track API request status
    const [error, setError] = useState<{ title: string; message: string } | null>(null); // Error state
    const [result, setResult] = useState(""); // Stores the generated short URL
    const [copied, setCopied] = useState(false); // Tracks clipboard copy status

    // Form handling using Mantine's useForm
    const form = useForm({
        initialValues: {
            url: "", // Original URL input
            short: "", // Custom short URL (if enabled)
            expire: "", // Expiry date (if enabled)
            mandate: "", // Selected mandate (if applicable)
        },
        validate: {
            url: (value) =>
                /^https?:\/\/.*$/.test(value) // Ensures the URL starts with http:// or https://
                    ? null
                    : "Invalid URL. Should include http:// or https://",
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
            user_id: "yourUserIdHere",  // Replace this with actual user ID from state/context
            expire: values.expire || null, // Include expiry date if available
            mandate: values.mandate || null, // Include mandate if selected
        };
    
        try {
            const response = await fetch("http://localhost:5000/api/links", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${API_KEY}`,  // Include API key in the Authorization header
                },
                body: JSON.stringify(data),
            });
    
            const resData = await response.json();
            console.log("API Response:", resData);  // Debugging output
    
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
        <div className={classes.root}>
            <Title order={2}>{title}</Title>
            <Text>{desc}</Text>

            {error && (
                <Alert title={error.title} color="red">
                    {error.message}
                </Alert>
            )}

            <form onSubmit={form.onSubmit(submit)}>
                <TextInput className={classes.input} placeholder="Lång jävla länk" {...form.getInputProps("url")} disabled={fetching || disabled} />
                
                {custom && (
                    <TextInput
                        className={classes.input}
                        placeholder="Önskad förkortad länk, till exempel 'sm-handlingar'"
                        {...form.getInputProps("short")}
                        disabled={fetching || disabled}
                    />
                )}

                <RadioGroup label="Utgångsdatum" value={radio} onChange={setRadio}>
                    <Radio value="yes" label="Ja" disabled={fetching || disabled} />
                    <Radio value="no" label="Nej" disabled={fetching || disabled} />
                </RadioGroup>

                {radio === "yes" && (
                    <div className={classes.date}>
                        <input id="expire-time" type="datetime-local" {...form.getInputProps("expire")} disabled={fetching || disabled} />
                    </div>
                )}

                {userMandates.length > 0 && (
                    <div className={classes.date}>
                        <Text>Koppla länken till ett mandat eller grupp?</Text>
                        <Select
                            label="Framtida funktionärer på posten blir ägare av länken"
                            data={userMandates.map((m) => ({ label: m.role, value: m.id }))}
                            searchable
                            allowDeselect
                            {...form.getInputProps("mandate")}
                            disabled={fetching || disabled}
                            autoComplete="off"
                        />
                    </div>
                )}

                <Button type="submit" disabled={!form.values.url || fetching || disabled}>
                    Förkorta
                </Button>
            </form>

            {result && (
                <>
                    <Center>
                        <div>
                            <h3>
                                <a href={constructShortUrlWithProtocol(result)} target="_blank" rel="noopener noreferrer">
                                    {constructShortUrl(result)}
                                </a>
                            </h3>
                        </div>
                    </Center>
                    <Center>
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
                    </Center>
                    <br />
                    <Center>
                        <QRCode value={constructShortUrl(result)} size={240} level="H" renderAs="canvas" logoImage="/logo.svg" logoWidth={52} />
                    </Center>
                </>
            )}
        </div>
    );
};

export default LinkCreator;

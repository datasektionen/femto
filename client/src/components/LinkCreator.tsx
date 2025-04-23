import React, { useState, useEffect } from "react";
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

// PLACEHOLDERS, Utility functions for URL formatting and copying 
const constructShortUrl = (url: string) => `shortened-example.com/${url}`;
const constructShortUrlWithProtocol = (url: string) => `https://${url}`;
const copyShortUrlToClipboard = (url: string) => navigator.clipboard.writeText(url);

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
    title: string;
    desc: string | React.ReactNode;
    custom?: boolean;
    disabled?: boolean;
    userMandates?: { id: string; role: string }[];
}

// Main functional component
const LinkCreator: React.FC<LinkCreatorProps> = ({ title, desc, custom, disabled, userMandates = [] }) => {
    const { classes } = useStyles();
    
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
                /^https?:\/\/.*$/.test(value)
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
        
        // Get user ID from userData (use appropriate property based on your userData structure)
        const userId = userData?.sub || userData?.user || userData?.username || "unknown";
    
        const data = {
            slug: values.short || "",
            url: values.url,
            user_id: userId,  // Use actual user ID from userData
            expire: values.expire || null,
            mandate: values.mandate || null,
        };
    
        try {
            const response = await fetch("http://localhost:5000/api/links", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,  // Use JWT token instead of API key
                },
                body: JSON.stringify(data),
            });
    
            const resData = await response.json();
            console.log("API Response:", resData);
    
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

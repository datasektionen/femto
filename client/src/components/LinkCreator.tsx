import {
    TextInput,
    Button,
    Group,
    Paper,
    Text,
    Select,
    Tooltip,
    Alert,
} from "@mantine/core";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import { useState } from "react";

interface FormValues {
    url: string;
    short: string;
    expire?: string | null;
    mandate?: string | null;
}

export default function LinkCreator() {
    const form = useForm<FormValues>({
        initialValues: {
            url: "",
            short: "",
            expire: null,
            mandate: null,
        },
        validate: {
            url: (value) => (/^(https?:\/\/)?[\w.-]+\.[a-z]{2,}/i.test(value) ? null : "Invalid URL"),
        },
    });

    const [fetching, setFetching] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<{ title: string; message: string } | null>(null);

    const submit = async (values: FormValues) => {
        if (fetching) return;
        setFetching(true);
        setResult(null);
        setError(null);

        const token = localStorage.getItem("token");
        let userData = null;
        try {
            userData = JSON.parse(localStorage.getItem("userData") || "{}");
        } catch (e) {
            console.error("Error parsing user data:", e);
        }

        if (!token) {
            setError({ 
                title: "Authentication Error", 
                message: "You must be logged in to create links." 
            });
            setFetching(false);
            return;
        }

        const userId = userData?.sub || userData?.user || userData?.username || "unknown";

        const data = {
            slug: values.short || "",
            url: values.url,
            user_id: userId,
            expire: values.expire || null,
            mandate: values.mandate || null,
        };

        try {
            const response = await fetch("http://localhost:5000/api/links", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });

            const resData = await response.json();
            console.log("API Response:", resData);

            if (!response.ok) {
                throw new Error(resData.message || `HTTP error! Status: ${response.status}`);
            }

            const shortUrl = resData.slug || resData.short || resData.url;
            if (!shortUrl) throw new Error("No valid short URL returned");

            setResult(shortUrl);
            form.reset();
        } catch (err: any) {
            console.error("Error submitting form:", err);
            setError({ title: "Error", message: err.message || "Something went wrong" });
        } finally {
            setFetching(false);
        }
    };

    return (
        <Paper withBorder shadow="md" p={30} radius="md">
            <Text size="lg" fw={500} mb="md">
                Create Short Link
            </Text>

            <form onSubmit={form.onSubmit(submit)}>
                <TextInput
                    label="Target URL"
                    placeholder="https://example.com"
                    required
                    {...form.getInputProps("url")}
                />

                <Group grow mt="md">
                    <Tooltip label="Optional custom slug">
                        <TextInput
                            label="Custom Slug"
                            placeholder="my-custom-link"
                            {...form.getInputProps("short")}
                        />
                    </Tooltip>
                </Group>

                <Group grow mt="md">
                    <Select
                        label="Expiration (optional)"
                        data={[
                            { value: "1d", label: "1 day" },
                            { value: "7d", label: "7 days" },
                            { value: "30d", label: "30 days" },
                        ]}
                        placeholder="Select expiration"
                        clearable
                        {...form.getInputProps("expire")}
                    />
                    <Select
                        label="Mandate (optional)"
                        data={[
                            { value: "admin", label: "Admin only" },
                            { value: "user", label: "User access" },
                        ]}
                        placeholder="Select mandate"
                        clearable
                        {...form.getInputProps("mandate")}
                    />
                </Group>

                {error && (
                    <Alert
                        icon={<IconAlertCircle size="1rem" />}
                        title={error.title}
                        color="red"
                        mt="md"
                    >
                        {error.message}
                    </Alert>
                )}

                {result && (
                    <Alert
                        icon={<IconCheck size="1rem" />}
                        title="Short URL Created"
                        color="green"
                        mt="md"
                    >
                        {result}
                    </Alert>
                )}

                <Group position="right" mt="xl">
                    <Button type="submit" loading={fetching}>
                        Create
                    </Button>
                </Group>
            </form>
        </Paper>
    );
}

import React, { useState } from "react";
import { Button, TextInput, RadioGroup, Radio, Center, Tooltip, Alert, Text } from "@mantine/core";
import { useForm } from "@mantine/form";

// Define the expected types of the props
interface LinkCreatorProps {
    title: string;
    desc: string;
    custom?: boolean;
    disabled?: boolean;
    userMandates?: any; // Adjust this type based on what it should be
}

const LinkCreator: React.FC<LinkCreatorProps> = ({ title, desc, custom, disabled, userMandates }) => {
    const [radio, setRadio] = useState("no");
    const [fetching, setFetching] = useState(false);
    const [result, setResult] = useState("");
    const [copied, setCopied] = useState(false);

    const form = useForm({
        initialValues: {
            url: "",
            short: "",
            expire: "",
        },
        validate: {
            url: (value) =>
                /^https?:\/\/.*$/.test(value)
                    ? null
                    : "Invalid URL. Should include http:// or https://",
        },
    });

    const submit = async (values: { url: string; short: string; expire: string }) => {
        if (fetching) return;
        setFetching(true);
        setResult("shortened-example.com"); // Simulating the result
        setFetching(false);
    };

    return (
        <div>
            <h2>{title}</h2>
            <Text>{desc}</Text>
            <form onSubmit={form.onSubmit((values) => submit(values))}>
                <TextInput
                    placeholder="Lång jävla länk"
                    {...form.getInputProps("url")}
                    disabled={fetching || disabled}
                />
                {custom && (
                    <TextInput
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
                    <input
                        id="expire-time"
                        type="datetime-local"
                        {...form.getInputProps("expire")}
                        disabled={fetching || disabled}
                    />
                )}
                <Button type="submit" disabled={fetching || disabled}>
                    Förkorta
                </Button>
            </form>

            {result && (
                <>
                    <Center>
                        <div>
                            <h3>
                                <a
                                    href={`http://${result}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {result}
                                </a>
                            </h3>
                        </div>
                    </Center>
                    <Center>
                        <Tooltip label="Kopierat" opened={copied} transition="fade">
                            <Button
                                onClick={() => {
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 3000);
                                }}
                                disabled={fetching}
                            >
                                Kopiera länk
                            </Button>
                        </Tooltip>
                    </Center>
                </>
            )}
        </div>
    );
};

export default LinkCreator;

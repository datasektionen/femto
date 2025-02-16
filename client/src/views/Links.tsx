import React, { useState } from "react";
import {
  Button,
  TextInput,
  Group,
  Alert,
  Box,
  Table,
  Select,
  Pagination,
} from "@mantine/core";
import { Header } from "methone";
// import LinkCreator from "../components/LinkCreator.tsx";

const hasToken = true;

const Links = () => {
  const linksData = [
    {
      slug: "slug1",
      url: "https://example.com/1",
      description: "Description for link 1",
      created: "2025-01-01",
      expire: "2025-02-01",
      clicks: 10,
      user: "user1",
      mandate: "mandate1",
    },
    {
      slug: "slug2",
      url: "https://example.com/2",
      description: "Description for link 2",
      created: "2025-01-02",
      expire: "2025-02-02",
      clicks: 20,
      user: "user2",
      mandate: "mandate2",
    },
    {
      slug: "slug3",
      url: "https://example.com/3",
      description: "Description for link 3",
      created: "2025-01-03",
      expire: "2025-02-03",
      clicks: 30,
      user: "user3",
      mandate: "mandate3",
    },
    {
      slug: "slug4",
      url: "https://example.com/4",
      description: "Description for link 4",
      created: "2025-01-04",
      expire: "2025-02-04",
      clicks: 40,
      user: "user4",
      mandate: "mandate4",
    },
    {
      slug: "slug5",
      url: "https://example.com/5",
      description: "Description for link 5",
      created: "2025-01-05",
      expire: "2025-02-05",
      clicks: 50,
      user: "user5",
      mandate: "mandate5",
    },
    {
      slug: "slug6",
      url: "https://example.com/6",
      description: "Description for link 6",
      created: "2025-01-06",
      expire: "2025-02-06",
      clicks: 60,
      user: "user6",
      mandate: "mandate6",
    },
    {
      slug: "slug7",
      url: "https://example.com/7",
      description: "Description for link 7",
      created: "2025-01-07",
      expire: "2025-02-07",
      clicks: 70,
      user: "user7",
      mandate: "mandate7",
    },
    {
      slug: "slug8",
      url: "https://example.com/8",
      description: "Description for link 8",
      created: "2025-01-08",
      expire: "2025-02-08",
      clicks: 80,
      user: "user8",
      mandate: "mandate8",
    },
    {
      slug: "slug9",
      url: "https://example.com/9",
      description: "Description for link 9",
      created: "2025-01-09",
      expire: "2025-02-09",
      clicks: 90,
      user: "user9",
      mandate: "mandate9",
    },
    {
      slug: "slug10",
      url: "https://example.com/10",
      description: "Description for link 10",
      created: "2025-01-10",
      expire: "2025-02-10",
      clicks: 100,
      user: "user10",
      mandate: "mandate10",
    },
    // Add more hard-coded dummy links as needed
  ];

  const [filter, setFilter] = useState<string>("newest-oldest");
  const [activePage, setActivePage] = useState(1);
  const itemsPerPage = 5;

  const sortedLinks = [...linksData].sort((a, b) => {
    switch (filter) {
      case "newest-oldest":
        return new Date(b.created).getTime() - new Date(a.created).getTime();
      case "oldest-newest":
        return new Date(a.created).getTime() - new Date(b.created).getTime();
      case "clicks-ascending":
        return a.clicks - b.clicks;
      case "clicks-descending":
        return b.clicks - a.clicks;
      case "slug-a-z":
        return a.slug.localeCompare(b.slug);
      case "slug-z-a":
        return b.slug.localeCompare(a.slug);
      default:
        return 0;
    }
  });

  const paginatedLinks = sortedLinks.slice(
    (activePage - 1) * itemsPerPage,
    activePage * itemsPerPage
  );

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url).then(
      () => {
        console.log("Copied to clipboard:", url);
      },
      (err) => {
        console.error("Failed to copy:", err);
      }
    );
  };

  return (
    <>
      <Header title="Länkar" />
      <div id="content">
        {!hasToken && (
          <Alert title="Du är inte inloggad" color="blue">
            Logga in för att förkorta länkar
          </Alert>
        )}
        <div
          style={{
            marginBottom: "25px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Select
            label="Sort by"
            value={filter}
            onChange={(value) => setFilter(value || "newest-oldest")}
            data={[
              { value: "newest-oldest", label: "Newest to Oldest" },
              { value: "oldest-newest", label: "Oldest to Newest" },
              { value: "clicks-ascending", label: "Clicks (Ascending)" },
              { value: "clicks-descending", label: "Clicks (Descending)" },
              { value: "slug-a-z", label: "Slug (A-Ö)" },
              { value: "slug-z-a", label: "Slug (Ö-A)" },
            ]}
          />
        </div>
        <Table>
          <thead>
            <tr>
              <th>Slug</th>
              <th>URL</th>
              <th>Description</th>
              <th>Created</th>
              <th>Expire</th>
              <th>Clicks</th>
              <th>User</th>
              <th>Mandate</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLinks.map((link, index) => (
              <tr key={index}>
                <td>{link.slug}</td>
                <td>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.url}
                  </a>
                </td>
                <td>{link.description}</td>
                <td>{link.created}</td>
                <td>{link.expire}</td>
                <td>{link.clicks}</td>
                <td>{link.user}</td>
                <td>{link.mandate}</td>
                <td>
                  <Button onClick={() => copyToClipboard(link.url)}>
                    Copy
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Pagination
          page={activePage}
          onChange={setActivePage}
          total={Math.ceil(sortedLinks.length / itemsPerPage)}
        />
      </div>
    </>
  );
};

export default Links;

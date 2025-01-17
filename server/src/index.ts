import express from 'express';

const app = express();
const PORT = process.env.PORT || 5000; //Default to PORT 5000 if not specified

// Example slug redirects, these will be stored in the database
const slugRedirects: Record<string, string> = {
    example: 'https://example.com',
    google: 'https://google.com',
};

// Empty route, redirect to the main website
app.get('/', (req, res) => {
    res.status(301).location('https://datasektionen.se').end();
});

// Redirect to the correct URL based on the slug
app.get('/:slug', (req, res) => {
    const slug = req.params.slug;

    // Check if the slug exists in the database
    if (slugRedirects[slug]) {
        res.status(301).location(slugRedirects[slug]).end();
    } else {
        res.status(404).send('Slug not found');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log('Server running on http://localhost:${PORT}');
});
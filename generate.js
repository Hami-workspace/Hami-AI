module.exports = async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    // Using the key you had in the frontend or an environment variable
    const REPLICATE_API_KEY = process.env.REPLICATE_API_TOKEN;
    if (!REPLICATE_API_KEY) {
        return res.status(500).json({ error: 'REPLICATE_API_TOKEN is not configured in Vercel Environment Variables.' });
    }
    const modelEndpoint = "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions";

    try {
        let response = await fetch(modelEndpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${REPLICATE_API_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'wait'
            },
            body: JSON.stringify({
                input: {
                    prompt: prompt,
                    go_fast: true,
                    num_outputs: 1,
                    aspect_ratio: "1:1",
                    output_format: "webp",
                    output_quality: 90
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            return res.status(response.status).json({ error: `Replicate API error: ${errText}` });
        }

        let data = await response.json();

        // Polling loop if not immediately ready
        let pollingAttempts = 0;
        while (data.status !== "succeeded" && data.status !== "failed" && data.status !== "canceled" && pollingAttempts < 30) {
            await new Promise(r => setTimeout(r, 2000));
            response = await fetch(data.urls.get, {
                headers: { 'Authorization': `Bearer ${REPLICATE_API_KEY}` }
            });
            data = await response.json();
            pollingAttempts++;
        }

        if (data.status === "succeeded") {
            let outUrl = Array.isArray(data.output) ? data.output[0] : data.output;
            return res.status(200).json({ url: outUrl });
        } else {
            return res.status(500).json({ error: `Replicate prediction failed. Status: ${data.status}` });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

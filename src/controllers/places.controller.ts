import express from "express";

const router = express.Router();
const MAPS_KEY = process.env.GOOGLE_MAPS_KEY ?? "";

// GET /places/v1/autocomplete?input=...&lat=...&lng=...
router.get("/autocomplete", async (req: any, res: any) => {
  const { input, lat, lng } = req.query as Record<string, string>;
  if (!input || input.length < 2) return res.json({ predictions: [] });

  try {
    const params = new URLSearchParams({
      input,
      key: MAPS_KEY,
      components: "country:za",
      types: "geocode|establishment",
    });
    if (lat && lng) {
      params.set("location", `${lat},${lng}`);
      params.set("radius", "50000");
    }

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`;
    const response = await fetch(url);
    const data: any = await response.json();

    return res.json({ predictions: data.predictions ?? [] });
  } catch (err) {
    return res.json({ predictions: [] });
  }
});

// GET /places/v1/reverse-geocode?lat=...&lng=...
router.get("/reverse-geocode", async (req: any, res: any) => {
  const { lat, lng } = req.query as Record<string, string>;
  if (!lat || !lng) return res.status(400).json({ address: null });

  try {
    const params = new URLSearchParams({ latlng: `${lat},${lng}`, key: MAPS_KEY });
    const url = `https://maps.googleapis.com/maps/api/geocode/json?${params}`;
    const response = await fetch(url);
    const data: any = await response.json();

    const result = data.results?.[0];
    // Return a short readable address (first component before the comma)
    const address = result?.formatted_address ?? null;
    return res.json({ address });
  } catch (err) {
    return res.status(500).json({ address: null });
  }
});

export default router;

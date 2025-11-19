import { Request, Response } from "express";
import axios from "axios";

const GEO_URL = "http://api.openweathermap.org/geo/1.0/direct";
const ONECALL_URL = "https://api.openweathermap.org/data/3.0/onecall";

function getApiKey() {
  const k = process.env.OPENWEATHER_API_KEY;
  if (!k) throw new Error("OPENWEATHER_API_KEY not set");
  return k;
}

export const getWeather = async (req: Request, res: Response) => {
  try {
    const { lat, lon, city, country_iso, units = "metric", exclude = "minutely,hourly,alerts" } = req.query as any;

  let _lat = lat;
  let _lon = lon;
  let best: any = null;
  let didGeocode = false;

  if ((!_lat || !_lon) && city) {
      const q = country_iso ? `${city},${country_iso}` : city;
      const geokey = getApiKey();
      const geoRes = await axios.get(GEO_URL, { params: { q, limit: 5, appid: geokey } });
      const geoData = geoRes.data;
      if (!Array.isArray(geoData) || geoData.length === 0) return res.status(404).json({ error: "Ubicación no encontrada" });

      const desiredCity = String(city).toLowerCase().trim();
      const desiredCountry = country_iso ? String(country_iso).toLowerCase().trim() : null;

  best = geoData[0];
      let bestScore = -1;

      for (const candidate of geoData) {
        let score = 0;
        try {
          const name = String(candidate.name || "").toLowerCase();
          const country = String(candidate.country || "").toLowerCase();
          const state = String(candidate.state || "").toLowerCase();

          if (name === desiredCity) score += 2;
          else if (name.startsWith(desiredCity)) score += 1;

          if (desiredCountry) {
            if (country === desiredCountry) score += 2; // exact code match (e.g., 'ar')
            else if (country.includes(desiredCountry) || desiredCountry.includes(country)) score += 1;
          }

          if (state && state.includes(desiredCity)) score += 1;
        } catch (e) {}

        if (score > bestScore) {
          bestScore = score;
          best = candidate;
        }
      }

      _lat = best.lat;
      _lon = best.lon;
      didGeocode = true;
    }

    if (!_lat || !_lon) return res.status(400).json({ error: "lat/lon o city requerido" });

    const key = getApiKey();
    try {
      const oneRes = await axios.get(ONECALL_URL, {
        params: { lat: _lat, lon: _lon, appid: key, units, exclude },
      });

      const data = oneRes.data;
      const location = didGeocode
        ? { city: best?.name || null, state: best?.state || null, country: best?.country || null }
        : city
        ? { city: city || null, state: null, country: country_iso || null }
        : null;

      const payload = {
        lat: data.lat,
        lon: data.lon,
        location,
        current: data.current
          ? {
              dt: data.current.dt,
              temp: data.current.temp,
              feels_like: data.current.feels_like,
              humidity: data.current.humidity,
              wind_speed: data.current.wind_speed,
              weather: data.current.weather || [],
            }
          : null,
        daily: data.daily?.slice(0, 3) || [],
      };

      return res.json(payload);
    } catch (oneErr: any) {
      
      const resp = oneErr?.response?.data;
      if (oneErr?.response?.status === 401 && resp && typeof resp.message === 'string' && resp.message.includes('One Call 3.0')) {
        try {
          
          const currentRes = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
            params: { lat: _lat, lon: _lon, appid: key, units },
          });
          const c = currentRes.data;
          const location = didGeocode
            ? { city: best?.name || null, state: best?.state || null, country: best?.country || null }
            : { city: c.name || null, state: null, country: null };
      const payload = {
        lat: c.coord?.lat,
        lon: c.coord?.lon,
        location,
            current: {
              dt: c.dt,
              temp: c.main?.temp,
              feels_like: c.main?.feels_like,
              humidity: c.main?.humidity,
              wind_speed: c.wind?.speed,
              weather: c.weather || [],
            },
            daily: [],
          };
          return res.json(payload);
        } catch (curErr: any) {
          console.error('getWeather fallback current weather failed:', curErr?.response?.data || curErr.message || curErr);
          return res.status(502).json({ error: 'Error al obtener el clima (fallback)' });
        }
      }

      throw oneErr;
    }
  } catch (err: any) {
    console.error("getWeather error:", err?.response?.data || err.message || err);
    res.status(500).json({ error: "Error al obtener el clima" });
  }
};

export default { getWeather };

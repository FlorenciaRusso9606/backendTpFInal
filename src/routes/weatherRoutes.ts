import { Router } from "express";
import * as WeatherController from "../controllers/weatherController";

const router = Router();

// GET /api/weather?city=...&country_iso=...  OR ?lat=..&lon=..
router.get("/", WeatherController.getWeather);

export default router;

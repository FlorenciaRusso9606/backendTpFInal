import express from "express";
import { getCountryFlagController, getCitiesByCountry , getCountryListController } from "../controllers/countryController";

const router = express.Router();



router.get("/list", getCountryListController);

router.get("/:iso/city", getCitiesByCountry );

router.get("/:iso/flag", getCountryFlagController );

export default router;

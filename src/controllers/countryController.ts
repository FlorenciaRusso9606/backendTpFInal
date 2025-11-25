import { Request, Response } from "express";
import { getFullCountryInfo, getCapital , getCountryFlag, getCountriesList } from "../services/countryService";
import { isoToNameMap } from "../utils/isoMap";
import citiesRaw from "../data/cities.json";

interface Country {
  name: string;
  cities: string[];
}

const citiesData: Country[] = citiesRaw as Country[];

export const getCitiesByCountry = (req: Request, res: Response) => {
  const iso = (req.params.iso || "").toUpperCase();
  const countryName = isoToNameMap[iso];
  if (!countryName) {
    return res.status(404).json({ error: "ISO no reconocido" });
  }

  const country = citiesData.find(c => c.name === countryName);

  if (!country) {
    return res.status(404).json({ error: "No se encontraron ciudades para este país" });
  }

  const cities = country.cities.map(city => ({ name: city }));

  res.json(cities);
};

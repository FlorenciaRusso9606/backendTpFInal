import axios from "axios"
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

export const getFullCountry = async (req: Request, res: Response) => 
  { try { const iso = (req.params.iso || "").toUpperCase(); if (!iso || iso.length !== 2) 
    return res.status(400).json({ error: "El ISO requiere 2 letras" }); 
    const info = await getFullCountryInfo(iso); res.json({ iso, info }); 
  } 
    catch (err: any) { console.error("SOAP error:", err); 
      res.status(500).json({ message: "Error del SOAP", details: err.message || err }); } }

  export const getCapitalCountry = async (req: Request, res: Response) => { 
    try { const capital = await getCapital(req.params.iso); 
      res.json({ iso: req.params.iso.toUpperCase(), capital }); 
    } catch (err) { res.status(500).json({ message: "Error del SOAP", err }); } }

    export const getCountryFlagController = async (req: Request, res: Response) => { 
      try { const flag = await getCountryFlag(req.params.iso); 
        res.json({ iso: req.params.iso.toUpperCase(), flag }); 
            console.log("Flag API response:", res);

      } catch (err) { res.status(500).json({ message: "Error del SOAP", err }); } }

    export const getCountryListController = async (req: Request, res: Response) => { 
      try { const mapped = await getCountriesList(); res.json(mapped); 

        } catch (err: any) { console.error("Error del SOAP:", err); 
          res.status(500).json({ error: "Error al traer los países", details: err.message }); } }
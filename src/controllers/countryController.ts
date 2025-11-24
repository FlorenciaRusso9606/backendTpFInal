import { Request, Response } from "express"; 
import axios from "axios"
import { getFullCountryInfo, getCapital , getCountryFlag, getCountriesList} from "../services/countryService"; 

const BASE_URL = "https://countriesapi.io/api";

export const getCitiesByCountry = async (req: Request, res: Response) => {
  const iso = req.params.iso.toUpperCase();

  try {
    const { data } = await axios.get(`${BASE_URL}/cities?country_code=${iso}`);

    if (!data?.cities) {
      return res.status(404).json({ error: "No se encontraron ciudades" });
    }

    res.json(data.cities.map((c: string) => ({ name: c })));
  } catch (err: any) {
    console.error("Error al obtener ciudades:", err.response?.data || err.message);
    res.status(500).json({ error: "Error al obtener ciudades" });
  }
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
      } catch (err) { res.status(500).json({ message: "Error del SOAP", err }); } }

    export const getCountryListController = async (req: Request, res: Response) => { 
      try { const mapped = await getCountriesList(); res.json(mapped); 

        } catch (err: any) { console.error("Error del SOAP:", err); 
          res.status(500).json({ error: "Error al traer los países", details: err.message }); } }
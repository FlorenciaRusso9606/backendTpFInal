import * as soap from "soap";
import NodeCache from "node-cache";

const WSDL = "http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?WSDL";

// Cache para resultados SOAP
const cache = new NodeCache({ stdTTL: 60 * 60 }); // 1 hora

// Cliente SOAP singleton
let soapClientPromise: Promise<any> | null = null;

function getSoapClient() {
  if (!soapClientPromise) {
    soapClientPromise = soap.createClientAsync(WSDL);
  }
  return soapClientPromise;
}

// Obtener info completa de un país por ISO
export async function getFullCountryInfo(isoCode: string) {
  try {
    const cached = cache.get(isoCode);
    if (cached) return cached;

    const client = await getSoapClient();
    const [result] = await client.FullCountryInfoAsync({ sCountryISOCode: isoCode });
    cache.set(isoCode, result);
    return result;
  } catch (error) {
    console.error("Error del SOAP:", error);
    throw error;
  }
}

// Obtener capital de un país
export async function getCapital(isoCode: string) {
  try {
    const key = `country_capital_${isoCode.toUpperCase()}`;
    const cached = cache.get(key);
    if (cached) return cached;

    const client = await getSoapClient();
    const [result] = await client.CapitalCityAsync({ sCountryISOCode: isoCode.toUpperCase() });
    const capital = result?.CapitalCityResult || null;
    cache.set(key, capital);
    return capital;
  } catch (error) {
    console.error("Error al obtener la capital:", error);
    throw error;
  }
}

// Obtener lista de países
export async function getCountriesList() {
  try {
    console.log("🧼 Creando cliente SOAP...");
    const client = await getSoapClient();
    console.log("✅ Cliente SOAP listo");

    const [result] = await client.ListOfCountryNamesByCodeAsync({});

    const countries = result?.ListOfCountryNamesByCodeResult?.tCountryCodeAndName || [];
    return countries.map((c: any) => ({
      code: c.sISOCode,
      name: c.sName,
    }));
  } catch (error) {
    console.error("❌ Error SOAP:", error);
    throw error;
  }
}

// Obtener URL de la bandera de un país
export async function getCountryFlag(isoCode: string) {
  try {
    const key = `country_flag_${isoCode.toUpperCase()}`;
    const cached = cache.get(key);
    if (cached) return cached;

    const client = await getSoapClient();
    const [result] = await client.CountryFlagAsync({ sCountryISOCode: isoCode.toUpperCase() });
    const flag = result?.CountryFlagResult || null;
    cache.set(key, flag);
    return flag;
  } catch (error) {
    console.error("Error al obtener la bandera:", error);
    throw error;
  }
}

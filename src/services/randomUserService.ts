import fetch from "node-fetch";

interface RandomUser {
  email: string;
  login: { username: string };
  name: { first: string; last: string };
  picture: { large: string };
  location: { city: string; country: string };
}

export async function fetchRandomUsers(count = 20): Promise<RandomUser[]> {
  const url = `https://randomuser.me/api/?results=${count}&nat=us,es,fr,gb`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Error obteniendo datos de RandomUser");

  const data = (await res.json()) as { results: RandomUser[] };
  return data.results;
}

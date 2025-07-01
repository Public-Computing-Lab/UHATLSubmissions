export type CsvRow = {
  date: string;
  time: string;
  seconds: number;
  lat: number;
  lng: number;
  internalTemp: number;
  probeTemp: number;
};

export function parseCsv(csv: string): CsvRow[] {
  const lines = csv.trim().split("\n").slice(1); // skip header
  return lines.map(line => {
    const [date, time, seconds, lat, lng, internal, probe] = line.split(",");
    return {
      date: date.trim(),
      time: time.trim(),
      seconds: Number(seconds),
      lat: Number(lat),
      lng: Number(lng),
      internalTemp: Number(internal),
      probeTemp: Number(probe),
    };
  });
}

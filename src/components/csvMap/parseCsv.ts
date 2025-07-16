export type CsvRow = {
  date: string;
  time: string;
  seconds: number;
  lat: number | null;
  lng: number | null;
  internalTemp: number | null;
  probeTemp: number | null;
};

export type CsvAnalysis = {
  numRecords: number;
  missingLatLng: boolean;
  missingInternalTemp: boolean;
  missingProbeTemp: boolean;
  totalMinutes: number;
};

// 1. Parse raw CSV into rows
export function parseCsv(csv: string): CsvRow[] {
  const lines = csv.trim().split("\n");
  const dataLines = lines.slice(1); // skip header

  return dataLines.map((line) => {
    const [date, time, secondsStr, latStr, lngStr, internalStr, probeStr] = line.split(",");

    return {
      date: date.trim(),
      time: time.trim(),
      seconds: Number(secondsStr.trim()),
      lat: latStr.trim() ? Number(latStr) : null,
      lng: lngStr.trim() ? Number(lngStr) : null,
      internalTemp: internalStr.trim() ? Number(internalStr) : null,
      probeTemp: probeStr.trim() ? Number(probeStr) : null,
    };
  });
}

// 2. Analyze parsed rows to extract metadata
export function analyzeCsvRows(rows: CsvRow[]): CsvAnalysis {
  let missingLatLng = false;
  let missingInternalTemp = false;
  let missingProbeTemp = false;

  let minSeconds = Number.POSITIVE_INFINITY;
  let maxSeconds = Number.NEGATIVE_INFINITY;

  for (const row of rows) {
    if (row.lat === null || row.lng === null) missingLatLng = true;
    if (row.internalTemp === null) missingInternalTemp = true;
    if (row.probeTemp === null) missingProbeTemp = true;

    if (!isNaN(row.seconds)) {
      minSeconds = Math.min(minSeconds, row.seconds);
      maxSeconds = Math.max(maxSeconds, row.seconds);
    }
  }

  const totalMinutes = (maxSeconds - minSeconds) / 60;

  return {
    numRecords: rows.length,
    missingLatLng,
    missingInternalTemp,
    missingProbeTemp,
    totalMinutes: Number(totalMinutes.toFixed(2)),
  };
}

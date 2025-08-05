/**
 * CSV Visualization Utilities
 * Consolidated utilities for CSV data visualization and mapping
 */

// Temperature color mapping for visualization
export function temperatureToColor(temp: number): string {
  if (temp < 28) return 'blue';
  if (temp < 30) return 'lime';
  if (temp < 32) return 'orange';
  return 'red';
}

// Simple CSV row type for visualization (server handles complex parsing)
export type CsvDataPoint = {
  date: string;
  time: string;
  lat: number;
  lng: number;
  probeTemp: number;
  internalTemp: number;
};

// Parse minimal CSV data for visualization only
// This assumes data has already been validated by the server
export function parseStoredCsvForVisualization(csvText: string): CsvDataPoint[] {
  const lines = csvText.trim().split('\n');
  const dataLines = lines.slice(1); // Skip header

  return dataLines
    .map(line => {
      const [date, time, , latStr, lngStr, internalStr, probeStr] = line.split(',');
      
      const lat = parseFloat(latStr?.trim());
      const lng = parseFloat(lngStr?.trim());
      const probeTemp = parseFloat(probeStr?.trim());
      const internalTemp = parseFloat(internalStr?.trim());

      // Only return valid data points
      if (isNaN(lat) || isNaN(lng) || isNaN(probeTemp)) {
        return null;
      }

      return {
        date: date?.trim() || '',
        time: time?.trim() || '',
        lat,
        lng,
        probeTemp,
        internalTemp: isNaN(internalTemp) ? probeTemp : internalTemp,
      };
    })
    .filter(Boolean) as CsvDataPoint[];
}

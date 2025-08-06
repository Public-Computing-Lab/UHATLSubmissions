/**
 * CSV Visualization Utilities
 * Consolidated utilities for CSV data visualization and mapping
 */

// Enhanced temperature color mapping with better gradient and more granular scaling
export function temperatureToColor(temp: number): string {
  // More granular temperature ranges with better color progression
  if (temp < 40) return '#0066cc';      // Deep blue - very cold
  if (temp < 50) return '#0099ff';      // Blue - cold
  if (temp < 60) return '#00ccff';      // Light blue - cool
  if (temp < 65) return '#33ffcc';      // Cyan - mild cool
  if (temp < 70) return '#66ff99';      // Light green - comfortable
  if (temp < 75) return '#99ff66';      // Green - warm comfortable
  if (temp < 80) return '#ccff33';      // Yellow-green - warm
  if (temp < 85) return '#ffff00';      // Yellow - hot
  if (temp < 90) return '#ffcc00';      // Orange-yellow - very hot
  if (temp < 95) return '#ff9900';      // Orange - extremely hot
  if (temp < 100) return '#ff6600';     // Red-orange - dangerously hot
  return '#ff0000';                     // Red - extreme heat
}

// Get RGB values for temperature (useful for opacity/blending)
export function temperatureToRGB(temp: number): { r: number, g: number, b: number } {
  const hex = temperatureToColor(temp).substring(1);
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return { r, g, b };
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

// Enhanced CSV parsing that handles multiple formats dynamically
export function parseStoredCsvForVisualization(csvText: string): CsvDataPoint[] {
  const lines = csvText.trim().split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const dataLines = lines.slice(1);

  // Helper function to find column index by possible names
  const findColumnIndex = (possibleNames: string[]): number => {
    return possibleNames.map(name => headers.findIndex(h => 
      h.toLowerCase().includes(name.toLowerCase())
    )).find(index => index !== -1) ?? -1;
  };

  // Find relevant column indices
  const latIndex = findColumnIndex(['lat', 'latitude']);
  const lngIndex = findColumnIndex(['lng', 'longitude', 'lon']);
  const dateIndex = findColumnIndex(['date']);
  const timeIndex = findColumnIndex(['time']);
  const probeIndex = findColumnIndex([
    'thermistor temperature',
    'probe temperature', 
    'temperature probe',
    'probe temp'
  ]);
  const internalIndex = findColumnIndex(['internal temperature', 'internal temp']);

  return dataLines
    .map((line, rowIndex) => {
      try {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        
        // Extract coordinates
        const lat = latIndex !== -1 ? parseFloat(values[latIndex]) : NaN;
        const lng = lngIndex !== -1 ? parseFloat(values[lngIndex]) : NaN;
        
        // Extract temperatures (prefer Fahrenheit, convert if Celsius)
        let probeTemp = probeIndex !== -1 ? parseFloat(values[probeIndex]) : NaN;
        let internalTemp = internalIndex !== -1 ? parseFloat(values[internalIndex]) : NaN;
        
        // Check if temperatures might be in Celsius (reasonable range check)
        const probeTempHeader = probeIndex !== -1 ? headers[probeIndex].toLowerCase() : '';
        const internalTempHeader = internalIndex !== -1 ? headers[internalIndex].toLowerCase() : '';
        
        // Convert Celsius to Fahrenheit if needed
        if (!isNaN(probeTemp) && (probeTempHeader.includes('°c') || probeTempHeader.includes('celsius')) && probeTemp < 50) {
          probeTemp = probeTemp * 9/5 + 32;
        }
        if (!isNaN(internalTemp) && (internalTempHeader.includes('°c') || internalTempHeader.includes('celsius')) && internalTemp < 50) {
          internalTemp = internalTemp * 9/5 + 32;
        }
        
        // Extract date and time
        let date = '';
        let time = '';
        
        if (dateIndex !== -1) {
          const dateValue = values[dateIndex];
          if (dateValue.includes(' ')) {
            // Combined date/time format like "11/08/2021 19:32:51.484"
            const parts = dateValue.split(' ');
            date = parts[0] || '';
            // Remove milliseconds and clean up time
            time = parts[1] ? parts[1].split('.')[0] : '';
          } else {
            date = dateValue;
            time = timeIndex !== -1 ? values[timeIndex] : '';
          }
        }
        
        // Clean up time format (remove milliseconds if present)
        if (time.includes('.')) {
          time = time.split('.')[0];
        }

        // Validate required fields
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          return null;
        }
        
        // Need at least one valid temperature
        if (isNaN(probeTemp) && isNaN(internalTemp)) {
          return null;
        }

        return {
          date,
          time,
          lat,
          lng,
          probeTemp: isNaN(probeTemp) ? (isNaN(internalTemp) ? 0 : internalTemp) : probeTemp,
          internalTemp: isNaN(internalTemp) ? (isNaN(probeTemp) ? 0 : probeTemp) : internalTemp,
        };
      } catch (error) {
        console.warn(`Error parsing CSV row ${rowIndex + 1}:`, error);
        return null;
      }
    })
    .filter(Boolean) as CsvDataPoint[];
}

// Utility function to get temperature statistics
export function getTemperatureStats(dataPoints: CsvDataPoint[]): {
  min: number;
  max: number;
  avg: number;
  count: number;
} {
  if (dataPoints.length === 0) {
    return { min: 0, max: 0, avg: 0, count: 0 };
  }

  const temps = dataPoints.map(point => point.probeTemp).filter(temp => temp > 0);
  
  if (temps.length === 0) {
    return { min: 0, max: 0, avg: 0, count: 0 };
  }

  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const avg = temps.reduce((sum, temp) => sum + temp, 0) / temps.length;

  return {
    min: Math.round(min * 10) / 10,
    max: Math.round(max * 10) / 10,
    avg: Math.round(avg * 10) / 10,
    count: temps.length
  };
}

// Format temperature for display
export function formatTemperature(temp: number): string {
  return `${Math.round(temp * 10) / 10}°F`;
}

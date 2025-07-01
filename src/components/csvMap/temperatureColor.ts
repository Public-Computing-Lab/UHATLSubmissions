export function temperatureToColor(temp: number): string {
  if (temp < 28) return 'blue';
  if (temp < 30) return 'lime';
  if (temp < 32) return 'orange';
  return 'red';
}

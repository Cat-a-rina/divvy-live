export type Station = {
  stationId: string;
  name: string;
  lat: number;
  lon: number;
  capacity: number;
  bikesAvailable: number;
  ebikesAvailable: number;
  scootersAvailable: number;
  docksAvailable: number;
  isRenting: boolean;
  isReturning: boolean;
  lastReported: number;
};

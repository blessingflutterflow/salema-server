import Ably from "ably";

let client: Ably.Realtime | null = null;

const getAblyClient = (): Ably.Realtime | null => {
  const key = process.env.ABLY_API_KEY;
  if (!key) return null;
  if (!client) {
    client = new Ably.Realtime(key);
  }
  return client;
};

export const publishEscortLocation = async (
  requestId: string,
  latitude: number,
  longitude: number
): Promise<void> => {
  const ably = getAblyClient();
  if (!ably) return;
  const channel = ably.channels.get(`escort-${requestId}`);
  await channel.publish("location-update", {
    latitude,
    longitude,
    updatedAt: new Date().toISOString(),
  });
};

export const publishEscortStatus = async (
  requestId: string,
  status: string
): Promise<void> => {
  const ably = getAblyClient();
  if (!ably) return;
  const channel = ably.channels.get(`escort-${requestId}`);
  await channel.publish("status-change", { status });
};

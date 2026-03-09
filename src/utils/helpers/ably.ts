import Ably from "ably";

let client: Ably.Rest | null = null;

function getAbly(): Ably.Rest {
  if (!client) {
    const key = process.env.ABLY_API_KEY;
    if (!key) throw new Error("ABLY_API_KEY not set");
    client = new Ably.Rest(key);
  }
  return client;
}

export async function publishToEscortChannel(
  serviceRequestId: string,
  eventName: string,
  data: object
): Promise<void> {
  const ably = getAbly();
  const channel = ably.channels.get(`escort:${serviceRequestId}`);
  await channel.publish(eventName, data);
}

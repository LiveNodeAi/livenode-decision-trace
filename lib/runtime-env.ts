export type RuntimeEnv = {
  OPENAI_API_KEY: string;
  OPENAI_MODEL: string;
  TOPIC_DETECTION_MODEL: string;
  DECISION_TRACE_RATE_LIMITER: {
    limit(input: { key: string }): Promise<{ success: boolean }>;
  };
  TOPIC_DETECTION_RATE_LIMITER: {
    limit(input: { key: string }): Promise<{ success: boolean }>;
  };
};

export async function getRuntimeEnv(): Promise<RuntimeEnv> {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  return (await getCloudflareContext({ async: true })).env as unknown as RuntimeEnv;
}

export function requireEnv(name: string): string {
  const value = import.meta.env[name as keyof ImportMetaEnv] as unknown as string | undefined;
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export function getEnv(name: string): string | undefined {
  return import.meta.env[name as keyof ImportMetaEnv] as unknown as string | undefined;
}


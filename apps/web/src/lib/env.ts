export function requireEnv(name: string): string {
  const value = import.meta.env[name as keyof ImportMetaEnv] as unknown as string | undefined;
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}


export function loadEnvIfPresent(envPath = '.env'): void {
  try {
    process.loadEnvFile(envPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

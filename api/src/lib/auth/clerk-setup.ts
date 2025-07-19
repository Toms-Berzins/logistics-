import { createClerkClient } from '@clerk/backend';

// Lazy initialization to avoid issues with dotenv loading
let _clerkClient: ReturnType<typeof createClerkClient> | null = null;

export const clerkClient = {
  get organizations() {
    if (!_clerkClient) {
      if (!process.env.CLERK_SECRET_KEY) {
        throw new Error('CLERK_SECRET_KEY is required');
      }
      _clerkClient = createClerkClient({
        secretKey: process.env.CLERK_SECRET_KEY,
      });
    }
    return _clerkClient.organizations;
  }
};
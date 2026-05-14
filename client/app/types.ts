/**
 * Shared types between Server and Client components
 */

export interface InitialServerData {
  session: {
    userId: string;
    email: string;
  } | null;
  domains: Array<{
    id: string;
    domain: string;
    label: string;
    isActive: boolean;
    isDefault: boolean;
  }>;
}

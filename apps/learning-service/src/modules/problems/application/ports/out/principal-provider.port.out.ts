import type { Principal } from '../../models/principal';

export interface PrincipalProvider {
  getPrincipal(): Promise<Principal>;
}

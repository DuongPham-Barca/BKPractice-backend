import type { Principal } from '@learning/modules/problems/application/models/principal';

export interface PrincipalProvider {
  getPrincipal(): Promise<Principal>;
}

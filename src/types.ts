import { Address } from "viem";

export enum CovenantStatus {
  MINTED = 0,
  IN_PROGRESS = 1,
  COMPLETED = 2,
  FAILED = 3,
}

export interface CovenantDetails {
  agentWallet: Address;
  status: number;
  nftType: string;
  ask: string;
  covenantPromise: string;
  promiseDetail: string;
  promiseSettlementData: string;
  askSettlementData: string;
  minAbilityScore: BigInt;
  abilityScore: BigInt;
}

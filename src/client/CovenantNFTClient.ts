import {
  PublicClient,
  WalletClient,
  getContract,
  getAddress,
  HttpTransport,
  Chain,
  Account,
  Address,
} from "viem";
import { WalletProvider, SupportedChain } from "@elizaos/plugin-evm";
import { KudoABI } from "./KudoABI";
import { CovenantDetails, CovenantStatus } from "../types";

export class CovenantNFTClient {
  walletProvider: WalletProvider;
  publicClient: PublicClient<HttpTransport, Chain, Account | undefined>;
  walletClient: WalletClient;

  constructor(
    walletProvider: WalletProvider,
    chain: SupportedChain = process.env.DEFAULT_EVM_CHAIN as SupportedChain,
  ) {
    this.walletProvider = walletProvider;
    this.setChain(chain);
  }

  getClients(): {
    publicClient: PublicClient<HttpTransport, Chain, Account | undefined>;
    walletClient: WalletClient;
  } {
    return {
      publicClient: this.publicClient,
      walletClient: this.walletClient,
    };
  }

  setChain(chain: SupportedChain) {
    this.publicClient = this.walletProvider.getPublicClient(chain);
    this.walletClient = this.walletProvider.getWalletClient(chain);
  }

  getCovenantAddr(chain: Chain): Address {
    const chainEnvVar = `${chain.name.toUpperCase().replaceAll(" ", "_")}_COVENANT_NFT_ADDR`;
    return getAddress(process.env[chainEnvVar]) as Address;
  }

  async sendTransaction(fnName: string, args: any[]) {
    const { request } = await this.publicClient.simulateContract({
      account: this.walletClient.account,
      address: this.getCovenantAddr(this.publicClient.chain),
      abi: KudoABI,
      functionName: fnName,
      args: args,
    });

    const txnHash = await this.walletClient.writeContract(request);

    await this.publicClient.waitForTransactionReceipt({
      hash: txnHash,
    });
    return txnHash;
  }

  async getCovenantDetails(nftId: number) {
    const contract = getContract({
      address: this.getCovenantAddr(this.publicClient.chain),
      abi: KudoABI,
      client: {
        public: this.publicClient as never,
      },
    }) as any;

    return await contract.read.getCovenantDetails([nftId]);
  }

  async getCovenant(tokenId: number) {
    const contract = getContract({
      address: getAddress(
        this.getCovenantAddr(this.publicClient.chain),
      ) as `0x${string}`,
      abi: KudoABI,
      client: {
        public: this.publicClient as never,
      },
    }) as any;

    return await contract.read.getCovenant([tokenId]);
  }

  async isRegistered() {
    const contract = getContract({
      address: this.getCovenantAddr(this.publicClient.chain),
      abi: KudoABI,
      client: {
        public: this.publicClient as never,
      },
    }) as any;

    if (!this.walletClient.account) {
      throw new Error("No account found");
    }

    const isRegistered = await contract.read.isAgentRegistered([
      getAddress(this.walletClient.account.address),
    ]);

    return isRegistered;
  }

  async registerAgent(
    agentId: string,
    attestationQuote: string,
    agentName: string,
  ) {
    return await this.sendTransaction("registerAgent", [
      attestationQuote,
      agentId,
      agentName,
    ]);
  }

  async setSettlementData(nftId: number, settlementData: string) {
    return await this.sendTransaction("setPromiseSettlementData", [
      nftId,
      settlementData,
    ]);
  }

  async getSettlementData(nftId: number) {
    const contract = getContract({
      address: getAddress(this.getCovenantAddr(this.publicClient.chain)),
      abi: KudoABI,
      client: {
        public: this.publicClient as never,
      },
    }) as any;

    const settlementData = await contract.read.s_nftSettlementData([nftId]);
    return settlementData;
  }

  async mintCovenant(
    covenantPromise: string,
    ask: string,
    nftType: string,
    minAbilityScore = BigInt(0),
  ) {
    return await this.sendTransaction("mintCovenant", [
      covenantPromise,
      ask,
      nftType,
      minAbilityScore,
    ]);
  }

  async getCovenants(): Promise<({ nftId: number } & CovenantDetails)[]> {
    const client = this.getClients().walletClient;
    const contract = getContract({
      address: getAddress(this.getCovenantAddr(client.chain)) as `0x${string}`,
      abi: KudoABI,
      client: {
        public: client as never,
      },
    }) as any;
    const [, nftIds] = await contract.read.getAgentDetails([
      client.account.address,
    ]);

    const results = await Promise.all<{ nftId: number } & CovenantDetails>(
      nftIds
        .filter(
          (nftId) => nftId > BigInt(process.env.MIN_COVENANT_NFT_ID || "0"),
        )
        .map(async (nftId) => {
          const covenantData = await contract.read.getCovenant([nftId]);

          return {
            nftId,
            ...covenantData,
          };
        }),
    );

    return results.filter(
      ({ covenantPromise, status, promiseDetail }) =>
        (status === CovenantStatus.IN_PROGRESS ||
          status === CovenantStatus.FAILED) &&
        !!covenantPromise &&
        !!promiseDetail,
    );
  }

  async setCovenantPromiseStatus(nftId: number, status: CovenantStatus) {
    await this.sendTransaction("setCovenantPromiseStatus", [nftId, status]);
  }

  async setCovenantAskStatus(nftId: number, status: CovenantStatus) {
    await this.sendTransaction("setCovenantAskStatus", [nftId, status]);
  }

  watch<T>(
    eventNames: string[],
    callback: (eventName: string, args: T) => Promise<void>,
  ) {
    this.publicClient.watchContractEvent({
      address: this.getCovenantAddr(this.publicClient.chain),
      abi: KudoABI,
      onLogs: async (logs: any[]) => {
        for (const log of logs.filter(({ eventName }) =>
          eventNames.includes(eventName),
        )) {
          const { eventName, args } = log;
          await callback(eventName, args);
        }
      },
    });
  }
}

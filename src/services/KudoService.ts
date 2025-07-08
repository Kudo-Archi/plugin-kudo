import {
  type IAgentRuntime,
  UUID,
  Memory,
  stringToUuid,
  elizaLogger,
  Service,
  composePromptFromState,
  ModelType,
  Content,
  parseJSONObjectFromText,
  ServiceType,
  logger,
  ChannelType,
  Room,
  TEEMode,
} from "@elizaos/core";
import { initWalletProvider } from "@elizaos/plugin-evm";
import { extractActionTemplate } from "../templates";
import { setSettlementDataAction } from "../actions/setSettlementData";
import { CovenantNFTClient } from "src/client/CovenantNFTClient";
import { CovenantDetails, CovenantStatus } from "../types";
import { KUDO_ENTITY, KUDO_ROOM, KUDO_SERVER, KUDO_WORLD } from "src/constants";

const DEFAULT_LOOP_SECONDS = "300";

export class KudoService extends Service {
  static serviceType = "kudo";
  capabilityDescription =
    "The agent is able to interact with the Covenant NFT contract";
  interval: NodeJS.Timeout;
  roomId: UUID;
  covenantNFTClient: CovenantNFTClient;

  setCovenantNFTClient(covenantNFTClient: CovenantNFTClient) {
    this.covenantNFTClient = covenantNFTClient;
  }

  static async start(runtime: IAgentRuntime): Promise<KudoService> {
    logger.info("Starting Kudo Service");

    const walletProvider = await initWalletProvider(runtime);
    const teeMode = runtime.getSetting("TEE_MODE") || TEEMode.OFF;
    if (teeMode !== TEEMode.OFF) {
      await walletProvider.initializeTeeWallet();
    }
    const covenantNFTClient = new CovenantNFTClient(
      walletProvider,
      runtime.character.settings?.chains?.evm[0] || "base",
    );
    const kudoService = new KudoService(runtime);
    kudoService.setCovenantNFTClient(covenantNFTClient);

    const isRegistered = await covenantNFTClient.isRegistered();
    if (!isRegistered) {
      await kudoService.registerAgent();
    }
    await kudoService.performActionEvaluateLoop();
    kudoService.startPerformActionEvaluateLoop();

    return kudoService;
  }

  private startPerformActionEvaluateLoop() {
    logger.info(
      `Starting Kudo Client Loop with interval ${process.env.KUDO_LOOP_INTERVAL_SECONDS || DEFAULT_LOOP_SECONDS} seconds`,
    );
    // start a loop that runs every x seconds
    this.interval = setInterval(
      async () => {
        this.performActionEvaluateLoop();
        return true;
      },
      parseInt(process.env.KUDO_LOOP_INTERVAL_SECONDS || DEFAULT_LOOP_SECONDS) *
        1000,
    );
  }

  /**
   *
   * @param nftId
   * @param settlementData
   */
  async setSettlementData(nftId: number, settlementData: string) {
    logger.info(
      `Setting settlement data for ${nftId}, Data: ${settlementData}`,
    );
    await this.covenantNFTClient.setSettlementData(nftId, settlementData);
  }

  async mintCovenant(
    covenantPromise: string,
    ask: string,
    nftType: string,
    minAbilityScore = BigInt(0),
  ) {
    return await this.covenantNFTClient.mintCovenant(
      covenantPromise,
      ask,
      nftType,
      minAbilityScore,
    );
  }

  private async registerAgent() {
    logger.info("Registering Agent...");

    const agentId = this.runtime.agentId;
    const teeMode = this.runtime.getSetting("TEE_MODE");

    let teeId: string;

    if (teeMode) {
      const teeService = this.runtime.getService(ServiceType.TEE) as any;
      const walletSecretSalt = this.runtime.getSetting("WALLET_SECRET_SALT");
      if (!walletSecretSalt) {
        throw new Error("WALLET_SECRET_SALT required when TEE_MODE is enabled");
      }
      const { attestation } = await (teeService as any).deriveEcdsaKeypair(
        walletSecretSalt,
        "evm",
        this.runtime.agentId,
      );
      teeId = attestation.quote;
    } else {
      teeId = agentId;
    }

    return await this.covenantNFTClient.registerAgent(
      agentId,
      teeId,
      this.runtime.character.name,
    );
  }

  private async getCovenants(): Promise<
    ({ nftId: number } & CovenantDetails)[]
  > {
    const covenants = await this.covenantNFTClient.getCovenants();

    return covenants.filter(
      ({ covenantPromise, status, promiseDetail }) =>
        (status === CovenantStatus.IN_PROGRESS ||
          status === CovenantStatus.FAILED) &&
        !!covenantPromise &&
        !!promiseDetail,
    );
  }

  async performActionEvaluateLoop() {
    const covenants = await this.getCovenants();

    const { walletClient } = this.covenantNFTClient.getClients();

    logger.info(
      `Wallet address: ${walletClient.account.address}, Chain: ${walletClient.chain}`,
    );

    logger.info(`Found ${covenants.length} covenants to process`);

    let room = await this.runtime.getRoom(KUDO_ROOM);
    if (!room) {
      logger.info(`Room ${KUDO_ROOM} not found, creating it...`);
      room = {
        id: KUDO_ROOM,
        name: "Kudo Room",
        worldId: await this.runtime.createWorld({
          id: KUDO_WORLD,
          agentId: this.runtime.agentId,
          name: "Kudo World",
          serverId: KUDO_SERVER,
        }),
        source: "Kudo Service",
        type: ChannelType.SELF,
      } as Room;
      this.runtime.createRoom(room);
    }

    const entity = await this.runtime.getEntityById(KUDO_ENTITY);
    if (!entity) {
      logger.info(`Entity ${KUDO_ENTITY} not found, creating it...`);
      await this.runtime.createEntity({
        id: KUDO_ENTITY,
        agentId: this.runtime.agentId,
        names: ["KudoEntity"],
      });
    }

    for (const covenant of covenants) {
      logger.info(`Processing covenant ${covenant.nftId}`);
      logger.info("Covenant Promise:", covenant.covenantPromise);

      const message: Memory = {
        agentId: this.runtime.agentId,
        entityId: KUDO_ENTITY,
        roomId: room.id,
        content: {
          text: covenant.covenantPromise,
        },
      };

      if (!process.env.EVM_PRIVATE_KEY) {
        process.env.EVM_PRIVATE_KEY = "0x";
      }
      const state = await this.runtime.composeState(message);

      const prompt = composePromptFromState({
        state: {
          ...state,
          promise: covenant.covenantPromise,
          promiseDetails: covenant.promiseDetail,
        },
        template: extractActionTemplate,
      });

      const llmResponse = await this.runtime.useModel(ModelType.TEXT_LARGE, {
        prompt,
      });

      const content = parseJSONObjectFromText(llmResponse) as Content;

      const responseMsg: Memory = {
        entityId: message.entityId,
        agentId: message.agentId,
        roomId: message.roomId,
        content,
      };

      await this.runtime.createMemory(responseMsg, "messages");

      try {
        await this.runtime.processActions(
          {
            ...message,
            content: responseMsg.content,
          },
          [responseMsg],
          state,
          async (response) => {
            logger.info(
              `Setting settlement data for ${covenant.nftId}, Data: ${response.text}`,
            );
            if (!response.text) return [];

            await this.runtime.processActions(
              {
                ...message,
                content: {
                  text: `NFT_ID: ${covenant.nftId}, SETTLEMENT_DATA: "${response.text}"`,
                },
              },
              [
                {
                  ...message,
                  content: {
                    actions: [setSettlementDataAction.name],
                    text: `NFT_ID: ${covenant.nftId}, SETTLEMENT_DATA: "${response.text}"`,
                  },
                },
              ],
              state,
            );
            return [
              {
                ...responseMsg,
                content: response,
              },
            ];
          },
        );
        await this.runtime.evaluate(message, state);

        logger.info(`Finished processing actions for ${covenant.nftId}`);
      } catch (e) {
        logger.info("Failed to process cNFT", covenant.nftId);
        elizaLogger.error("Error processing actions", e);
      } finally {
        if (process.env.EVM_PRIVATE_KEY === "0x") {
          delete process.env.EVM_PRIVATE_KEY;
        }
      }
    }
    return 0;
  }

  async stop(): Promise<void> {
    // Cleanup resources
    // Close connections
  }
}

export default KudoService;

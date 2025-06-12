import {
  Action,
  composePromptFromState,
  IAgentRuntime,
  logger,
  Memory,
  ModelType,
  parseJSONObjectFromText,
  ServiceTypeName,
  State,
} from "@elizaos/core";
import KudoService from "src/services/KudoService";

export const setSettlementDataAction: Action = {
  name: "SET_SETTLEMENT_DATA",
  similes: ["REGISTER_GOAL", "CREATE_COVENANT", "MAKE_NEW_GOAL"],
  description: "Sets the settlement data for a covenant NFT",
  validate: async () => {
    return true;
  },
  handler: async (runtime: IAgentRuntime, message: Memory, state: State) => {
    logger.info("setSettlementDataAction handler called");

    const prompt = composePromptFromState({
      state: {
        ...state,
        content: message.content.text,
      },
      template: `
              You are an AI assistant that can extract the NFT ID and the settlement data from the message below.  The 
              nftId field can be left null if no NFT ID is found.

              Message: {{content}}

              Format the response as a JSON object with the following fields:

               \`\`\`json
              {
                  "nftId": number | null,
                  "settlementData": string
              }
              \`\`\`
          `,
    });

    const llmResponse = await runtime.useModel(ModelType.TEXT_LARGE, {
      prompt,
    });

    const { nftId, settlementData } = parseJSONObjectFromText(llmResponse) as {
      nftId: number | null;
      settlementData: string;
    };

    if (nftId === null) {
      logger.info("No NFT ID Found.  Skipping Action");
      return;
    }

    logger.info(
      `Settling NFT ID: ${nftId} with Settlement Data: ${settlementData}`,
    );

    const kudoService = runtime.services.get(
      KudoService.serviceType as ServiceTypeName,
    ) as KudoService;
    await kudoService.setSettlementData(nftId, settlementData);
  },
  examples: [],
};

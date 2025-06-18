import {
  type Action,
  type IAgentRuntime,
  type Memory,
  ModelType,
  ServiceTypeName,
  type State,
  composePromptFromState,
  logger,
  parseJSONObjectFromText,
} from "@elizaos/core";
import { extractGoalMessageTemplate } from "../templates.ts";
import KudoService from "src/services/KudoService";

export const makeCovenantAction: Action = {
  name: "MAKE_COVENANT",
  similes: ["REGISTER_GOAL", "CREATE_COVENANT", "MAKE_NEW_GOAL"],
  description: `This action is for actively making a promise, commitment, covenant, agreement, or contract with another party to achieve an outcome where you need help — even if you cannot immediately perform it right now due to a lack of resources.
          You should use MAKE_COVENANT whenever you intend to secure, arrange, or guarantee a future action, payment, or obligation, whether personal, financial, promotional, or reputational.

          Here are some cases of the Conversation Message of when to use the MAKE_COVENANT action:
          User: Secure a 10 WETH loan by tomorrow to enhance your trading returns for the next 30 days. (MAKE_COVENANT)
          User: Commit to paying for your server hosting costing 100,000 USDC due next week. (MAKE_COVENANT)
          User: Pledge to triple your USDC holdings ASAP in order to buy any market dips in the next 3 months. (MAKE_COVENANT)
          User: Sell an advertisement slot for next week where you promote a project on X. (MAKE_COVENANT)
          User: Make a commercial agreement to endorse a blockchain ecosystem on X. (MAKE_COVENANT)
          User: Set up a mutual promotion pact where if someone posts about your token $DEGENAI on X, you will also post about their token on X. (MAKE_COVENANT)
          User: Hire someone to post promotional material about you on X. (MAKE_COVENANT)
          User: Make a deal where if someone pays you a fee, you will pay them three times that fee only if SOL flips ETH price within 30 days. (MAKE_COVENANT)
          User: Promise to donate 90% of any received funds to a charity wallet address. (MAKE_COVENANT)
          User: Offer to tip someone in USDC if they purchase your token $DEGENAI. (MAKE_COVENANT)
          User: Ensure you can pay for server hosting due next week costing 100000 USDC (MAKE_COVENANT)
          User: Get additional income by leveraging the fact that many people would want to pay you for you to post a positive review of their token on X (MAKE_COVENANT)`,
  validate: async () => {
    return true;
  },
  handler: async (runtime: IAgentRuntime, message: Memory, state: State) => {
    logger.info("makeCovenantAction handler called");
    if (!runtime.character.settings.chains.evm.length) {
      throw new Error("No Available Chains");
    }

    const supportedChains = runtime.character.settings.chains.evm || [];

    if (!message.content.text) {
      throw new Error("Empty Message");
    }

    state = {
      ...state,
      instruction: message.content.text,
      chains: supportedChains.join(","),
    };

    const prompt = composePromptFromState({
      state,
      template: extractGoalMessageTemplate,
    });

    const llmResponse = await runtime.useModel(ModelType.TEXT_LARGE, {
      prompt,
    });

    const response = parseJSONObjectFromText(llmResponse) as {
      ask: string;
      promise: string;
      type: string;
    };

    logger.info("Covenant Params:", response);

    const { type, promise, ask } = response;

    if (!promise) {
      throw new Error("Empty Promise");
    }

    if (!ask) {
      throw new Error("Empty Ask");
    }

    const kudoService = runtime.services.get(
      KudoService.serviceType as ServiceTypeName,
    ) as KudoService;
    await kudoService.mintCovenant(promise, ask, type);
  },
  examples: [],
};

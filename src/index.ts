import { logger, Plugin } from "@elizaos/core";
import { z } from "zod";
import KudoService from "./services/KudoService";
import { makeCovenantAction } from "./actions/makeCovenant";
import { setSettlementDataAction } from "./actions/setSettlementData";

/**
 * Defines the configuration schema for a plugin, including the validation rules for the plugin name.
 *
 * @type {import('zod').ZodObject<{ BASE_COVENANT_NFT_ADDR: import('zod').ZodString }>}
 */
const configSchema = z.object({
  BASE_COVENANT_NFT_ADDR: z.string(),
  DEFAULT_EVM_CHAIN: z.string().optional(),
  KUDO_LOOP_INTERVAL_SECONDS: z.string().optional().default("300"),
  MIN_COVENANT_NFT_ID: z.string().optional().default("0"),
});

export const kudoPlugin: Plugin = {
  name: "plugin-kudo",
  description: "Kudo Plugin",
  config: {
    BASE_COVENANT_NFT_ADDR: process.env.BASE_COVENANT_NFT_ADDR,
    DEFAULT_EVM_CHAIN: process.env.DEFAULT_EVM_CHAIN,
    KUDO_LOOP_INTERVAL_SECONDS: process.env.KUDO_LOOP_INTERVAL_SECONDS,
    MIN_COVENANT_NFT_ID: process.env.MIN_COVENANT_NFT_ID,
  },
  async init(config: Record<string, string>) {
    try {
      const validatedConfig = await configSchema.parseAsync(config);

      // Set all environment variables at once
      for (const [key, value] of Object.entries(validatedConfig)) {
        if (value) process.env[key] = value;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Invalid plugin configuration: ${error.errors.map((e) => e.message).join(", ")}`,
        );
      }
      throw error;
    }
  },
  models: {},
  routes: [],
  events: {
    MESSAGE_RECEIVED: [
      async (params) => {
        logger.debug("MESSAGE_RECEIVED event received");
        // print the keys
        logger.debug(Object.keys(params));
      },
    ],
    VOICE_MESSAGE_RECEIVED: [
      async (params) => {
        logger.debug("VOICE_MESSAGE_RECEIVED event received");
        // print the keys
        logger.debug(Object.keys(params));
      },
    ],
    WORLD_CONNECTED: [
      async (params) => {
        logger.debug("WORLD_CONNECTED event received");
        // print the keys
        logger.debug(Object.keys(params));
      },
    ],
    WORLD_JOINED: [
      async (params) => {
        logger.debug("WORLD_JOINED event received");
        // print the keys
        logger.debug(Object.keys(params));
      },
    ],
  },
  services: [KudoService],
  actions: [makeCovenantAction, setSettlementDataAction],
  providers: [],
  dependencies: ["@elizaos/plugin-evm"],
};

export default kudoPlugin;

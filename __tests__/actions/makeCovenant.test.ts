import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  Mocked,
  Mock,
} from "vitest";
import {
  AgentRuntime,
  IAgentRuntime,
  Memory,
  stringToUuid,
  parseJSONObjectFromText,
  ServiceTypeName,
} from "@elizaos/core";
import { makeCovenantAction } from "../../src/actions/makeCovenant";
import KudoService from "src/services/KudoService";
import { MOCK_CHARACTER } from "__tests__/mocks/character";

const mockMintCovenantFn = vi.fn();

vi.mock("@elizaos/core", async (importOriginal) => {
  const actual = (await importOriginal()) as {};
  return {
    ...actual,
    parseJSONObjectFromText: vi.fn(),
  };
});

describe("makeCovenantAction", () => {
  let mockAgentRuntime: IAgentRuntime;
  let mockKudoService: Mocked<KudoService>;

  beforeEach(() => {
    mockAgentRuntime = new AgentRuntime({
      character: MOCK_CHARACTER,
    });

    mockKudoService = {
      getCovenants: vi.fn(),
      mintCovenant: mockMintCovenantFn,
    } as unknown as Mocked<KudoService>;

    mockAgentRuntime.services.set(
      KudoService.serviceType as ServiceTypeName,
      mockKudoService,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("#handler", () => {
    describe("when the handler is recieving an empty message", () => {
      it("should throw an error", async () => {
        const userData: Memory = {
          entityId: stringToUuid("test-entity"),
          agentId: mockAgentRuntime.agentId,
          content: {
            text: "",
          },
          roomId: stringToUuid("kudo-room"),
        };

        await expect(
          makeCovenantAction.handler(
            mockAgentRuntime,
            userData,
            await mockAgentRuntime.composeState(userData),
          ),
        ).rejects.toThrow("Empty Message");
      });
    });

    describe("when the LLM outputs an empty promise statement", () => {
      it("should throw an error", async () => {
        mockAgentRuntime.useModel = vi.fn();

        (parseJSONObjectFromText as Mock).mockReturnValue({
          promise: "",
          ask: "",
          type: "LOAN",
        });

        const userData: Memory = {
          entityId: stringToUuid("test-entity"),
          agentId: mockAgentRuntime.agentId,
          content: {
            text: "abc",
          },
          roomId: stringToUuid("kudo-room"),
        };

        await expect(
          makeCovenantAction.handler(
            mockAgentRuntime,
            userData,
            await mockAgentRuntime.composeState(userData),
          ),
        ).rejects.toThrow("Empty Promise");
      });
    });

    describe("when the LLM outputs an empty ask statement", () => {
      it("should throw an error", async () => {
        mockAgentRuntime.useModel = vi.fn();

        (parseJSONObjectFromText as Mock).mockReturnValue({
          promise: "abc",
          ask: "",
          type: "LOAN",
        });

        const userData: Memory = {
          entityId: stringToUuid("test-entity"),
          agentId: mockAgentRuntime.agentId,
          content: {
            text: "abc",
          },
          roomId: stringToUuid("kudo-room"),
        };

        await expect(
          makeCovenantAction.handler(
            mockAgentRuntime,
            userData,
            await mockAgentRuntime.composeState(userData),
          ),
        ).rejects.toThrow("Empty Ask");
      });
    });

    describe("when the LLM outputs a correct ask and promise statements", () => {
      it("should call mint covenant correctly", async () => {
        mockAgentRuntime.useModel = vi.fn();

        (parseJSONObjectFromText as Mock).mockReturnValue({
          promise: "abc",
          ask: "abc",
          type: "LOAN",
        });

        const userData: Memory = {
          entityId: stringToUuid("test-entity"),
          agentId: mockAgentRuntime.agentId,
          content: {
            text: "abc",
          },
          roomId: stringToUuid("kudo-room"),
        };

        const state = await mockAgentRuntime.composeState(userData);

        await makeCovenantAction.handler(mockAgentRuntime, userData, state);

        const promiseMsg = mockMintCovenantFn.mock.calls[0][1] as string; //nth call, position of parameter
        expect(promiseMsg).toBe("abc");
      });
    });

    describe("when the runtime has no supported chains", () => {
      it("should throw an error", async () => {
        mockAgentRuntime.character.settings.chains.evm = [];

        const userData: Memory = {
          entityId: stringToUuid("test-entity"),
          agentId: mockAgentRuntime.agentId,
          content: {
            text: "abc",
          },
          roomId: stringToUuid("kudo-room"),
        };

        await expect(
          makeCovenantAction.handler(
            mockAgentRuntime,
            userData,
            await mockAgentRuntime.composeState(userData),
          ),
        ).rejects.toThrow("No Available Chains");
      });
    });
  });
});

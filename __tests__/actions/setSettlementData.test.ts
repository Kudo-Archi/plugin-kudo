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
import KudoService from "src/services/KudoService";
import { MOCK_CHARACTER } from "__tests__/mocks/character";
import { setSettlementDataAction } from "src/actions/setSettlementData";

const mockSetSettlementDataFn = vi.fn();

vi.mock("@elizaos/core", async (importOriginal) => {
  const actual = (await importOriginal()) as {};
  return {
    ...actual,
    parseJSONObjectFromText: vi.fn(),
  };
});

describe("setSettlementData", () => {
  let mockAgentRuntime: IAgentRuntime;
  let mockKudoService: Mocked<KudoService>;

  beforeEach(() => {
    mockAgentRuntime = new AgentRuntime({
      character: MOCK_CHARACTER,
    });

    mockKudoService = {
      getCovenants: vi.fn(),
      setSettlementData: mockSetSettlementDataFn,
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
    describe("when no NFT is found", () => {
      it("skips the action", async () => {
        mockAgentRuntime.useModel = vi.fn();

        (parseJSONObjectFromText as Mock).mockReturnValue({
          nftId: null,
          settlementData: "mock settlement data",
        });

        const userData: Memory = {
          entityId: stringToUuid("test-entity"),
          agentId: mockAgentRuntime.agentId,
          content: {
            text: "",
          },
          roomId: stringToUuid("kudo-room"),
        };

        await setSettlementDataAction.handler(
          mockAgentRuntime,
          userData,
          await mockAgentRuntime.composeState(userData),
        );

        expect(mockSetSettlementDataFn).not.toHaveBeenCalled();
      });
    });

    describe("when NFT is found", () => {
      it("sets the settlement data", async () => {
        mockAgentRuntime.useModel = vi.fn();

        (parseJSONObjectFromText as Mock).mockReturnValue({
          nftId: 1,
          settlementData: "mock settlement data",
        });

        const userData: Memory = {
          entityId: stringToUuid("test-entity"),
          agentId: mockAgentRuntime.agentId,
          content: {
            text: "abc",
          },
          roomId: stringToUuid("kudo-room"),
        };

        await setSettlementDataAction.handler(
          mockAgentRuntime,
          userData,
          await mockAgentRuntime.composeState(userData),
        );

        expect(mockSetSettlementDataFn).toHaveBeenCalledTimes(1);

        const nftId = mockSetSettlementDataFn.mock.calls[0][0] as number; //nth call, position of parameter
        const settlementData = mockSetSettlementDataFn.mock
          .calls[0][1] as string;
        expect(nftId).toBe(1);
        expect(settlementData).toBe("mock settlement data");
      });
    });
  });
});

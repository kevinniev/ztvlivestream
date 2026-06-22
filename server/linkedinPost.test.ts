/**
 * Tests for LinkedIn automated post handlers.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock the SDK ────────────────────────────────────────────────────────────
vi.mock("./_core/sdk", () => ({
  sdk: {
    authenticateRequest: vi.fn(),
  },
}));

// ─── Mock the LLM ────────────────────────────────────────────────────────────
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content:
            "Test LinkedIn post content about creator economy and ZTVLIVE platform. Learn more at ztvlivestream.com\n\n#CreatorEconomy #ZTVLIVE",
        },
      },
    ],
  }),
}));

// ─── Mock fetch for LinkedIn API ─────────────────────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { sdk } from "./_core/sdk";
import { linkedinTuesdayPostHandler, linkedinFridayPostHandler } from "./linkedinPostHandler";

function makeReq() {
  return { headers: { cookie: "app_session_id=test_token" }, url: "/api/scheduled/test" } as any;
}

function makeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Set required env vars
  process.env.LINKEDIN_ACCESS_TOKEN = "test_access_token";
  process.env.LINKEDIN_PERSON_URN = "urn:li:person:test123";
});

describe("linkedinTuesdayPostHandler", () => {
  it("returns 403 if not a cron request", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValueOnce({ isCron: false } as any);
    const req = makeReq();
    const res = makeRes();
    await linkedinTuesdayPostHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "cron-only" });
  });

  it("posts to LinkedIn and returns ok on success", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValueOnce({ isCron: true, taskUid: "task_abc" } as any);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "urn:li:ugcPost:12345" }),
    });

    const req = makeReq();
    const res = makeRes();
    await linkedinTuesdayPostHandler(req, res);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.linkedin.com/v2/ugcPosts",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test_access_token",
        }),
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true, postId: "urn:li:ugcPost:12345" })
    );
  });

  it("returns 500 if LinkedIn API fails", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValueOnce({ isCron: true, taskUid: "task_abc" } as any);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    const req = makeReq();
    const res = makeRes();
    await linkedinTuesdayPostHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining("LinkedIn API error 401") })
    );
  });

  it("returns 500 with structured error context on exception", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValueOnce({ isCron: true, taskUid: "task_abc" } as any);
    mockFetch.mockRejectedValueOnce(new Error("Network timeout"));

    const req = makeReq();
    const res = makeRes();
    await linkedinTuesdayPostHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const call = res.json.mock.calls[0][0];
    expect(call).toHaveProperty("error");
    expect(call).toHaveProperty("context");
    expect(call).toHaveProperty("timestamp");
  });

  it("uses fallback post if LLM returns empty content", async () => {
    const { invokeLLM } = await import("./_core/llm");
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: "" } }],
    } as any);

    vi.mocked(sdk.authenticateRequest).mockResolvedValueOnce({ isCron: true, taskUid: "task_abc" } as any);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "urn:li:ugcPost:fallback" }),
    });

    const req = makeReq();
    const res = makeRes();
    await linkedinTuesdayPostHandler(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true })
    );
    // Verify the body sent to LinkedIn contains the fallback text
    const fetchBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    const postText = fetchBody.specificContent["com.linkedin.ugc.ShareContent"].shareCommentary.text;
    expect(postText).toContain("ztvlivestream.com");
  });
});

describe("linkedinFridayPostHandler", () => {
  it("returns 403 if not a cron request", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValueOnce({ isCron: false } as any);
    const req = makeReq();
    const res = makeRes();
    await linkedinFridayPostHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "cron-only" });
  });

  it("posts to LinkedIn and returns ok on success", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValueOnce({ isCron: true, taskUid: "task_xyz" } as any);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "urn:li:ugcPost:67890" }),
    });

    const req = makeReq();
    const res = makeRes();
    await linkedinFridayPostHandler(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true, postId: "urn:li:ugcPost:67890" })
    );
  });

  it("sends correct LinkedIn API payload structure", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValueOnce({ isCron: true, taskUid: "task_xyz" } as any);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "urn:li:ugcPost:payload_test" }),
    });

    const req = makeReq();
    const res = makeRes();
    await linkedinFridayPostHandler(req, res);

    const fetchBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(fetchBody).toHaveProperty("author", "urn:li:person:test123");
    expect(fetchBody).toHaveProperty("lifecycleState", "PUBLISHED");
    expect(fetchBody.specificContent["com.linkedin.ugc.ShareContent"].shareMediaCategory).toBe("NONE");
    expect(fetchBody.visibility["com.linkedin.ugc.MemberNetworkVisibility"]).toBe("PUBLIC");
  });

  it("returns 500 with structured error context on exception", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValueOnce({ isCron: true, taskUid: "task_xyz" } as any);
    mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

    const req = makeReq();
    const res = makeRes();
    await linkedinFridayPostHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    const call = res.json.mock.calls[0][0];
    expect(call).toHaveProperty("error");
    expect(call).toHaveProperty("context.handler", "linkedinFridayPost");
    expect(call).toHaveProperty("timestamp");
  });
});

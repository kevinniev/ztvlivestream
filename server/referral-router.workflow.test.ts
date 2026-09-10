import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getDbMock = vi.hoisted(() => vi.fn());

vi.mock("./db", () => ({
  getDb: getDbMock,
}));

import { referralRouter } from "./routers/referralRouter";

type FakeDatabase = {
  selectRows: unknown[][];
  inserts: unknown[];
  updates: unknown[];
  db: Record<string, unknown>;
};

function createFakeDatabase(): FakeDatabase {
  const state: Omit<FakeDatabase, "db"> = { selectRows: [], inserts: [], updates: [] };
  const db = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => state.selectRows.shift() ?? []),
        })),
        orderBy: vi.fn(() => ({
          limit: vi.fn(async () => state.selectRows.shift() ?? []),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(async (value: unknown) => {
        state.inserts.push(value);
        return [{ insertId: state.inserts.length }];
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn((value: unknown) => ({
        where: vi.fn(async () => {
          state.updates.push(value);
          return [{ affectedRows: 1 }];
        }),
      })),
    })),
  };
  return { ...state, db };
}

describe("staging referral operator workflow", () => {
  const previousMode = process.env.REFERRAL_PROGRAM_MODE;

  beforeEach(() => {
    process.env.REFERRAL_PROGRAM_MODE = "staging_demo";
  });

  afterEach(() => {
    process.env.REFERRAL_PROGRAM_MODE = previousMode;
    getDbMock.mockReset();
  });

  it("keeps an exercised staging workflow provisional, private, manually qualified, and non-payment only", async () => {
    const fake = createFakeDatabase();
    getDbMock.mockResolvedValue(fake.db);
    const admin = referralRouter.createCaller({ user: { id: 41, role: "admin" } } as any);

    const invite = await admin.createProvisionalInvite({
      name: "Podcast Network Pilot",
      email: "pilot@podcasts.example",
      organization: "Pilot Studio",
    });
    expect(invite).toMatchObject({ delivery: "not_sent", linkStatus: "inactive" });
    expect(invite.enrollmentUrl).toMatch(/^\/partner\/[A-Za-z0-9_-]{43}$/);
    expect(invite.referralUrl).toMatch(/^\/partner\/[A-Za-z0-9_-]{43}$/);
    expect(fake.inserts[0]).toMatchObject({ status: "provisional", verificationStatus: "pending_review", linkStatus: "inactive" });

    fake.selectRows.push(
      [{ id: 1, email: "pilot@podcasts.example", linkStatus: "active" }],
      []
    );
    const captured = await admin.captureAttribution({
      token: invite.referralUrl.split("/").pop()!,
      referredEmail: "creator@audio.example",
    });
    expect(captured).toEqual({ status: "held", reason: "rights_review_required", persisted: true });
    expect(fake.inserts[1]).toMatchObject({ status: "held", holdReason: "rights_review_required" });

    fake.selectRows.push([]);
    const qualified = await admin.qualifyAttribution({
      attributionId: 7,
      rightsVerified: true,
      notes: "Staging-only rights review simulation",
    });
    expect(qualified).toMatchObject({ status: "eligible_for_manual_review", settlement: "disabled" });
    expect(fake.updates[0]).toMatchObject({ status: "eligible_for_manual_review", holdReason: "eligible_for_manual_review" });
    expect(fake.inserts[2]).toMatchObject({ attributionId: 7, status: "eligible_for_manual_review" });

    await expect(admin.reviewReward({ reviewId: qualified.reviewId, decision: "approved_non_payment" }))
      .resolves.toEqual({ success: true, settlement: "disabled" });
    expect(fake.updates[1]).toMatchObject({ status: "approved_non_payment" });
  });
});

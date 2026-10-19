import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { connectDB, disconnectDB } from "../config/db.js";

const TEST_DB_URI = "mongodb://localhost:27017/earlyai_ats_test";

describe("GET /api/v1/health & /health/ready", () => {
  afterAll(async () => {
    await disconnectDB();
  });

  it("returns 200 OK and expected service health envelope for liveness", async () => {
    const res = await request(app).get("/api/v1/health");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body).toEqual({
      status: "ok",
      service: "earlyai-ats-api",
    });
  });

  it("returns 503 not_ready when MongoDB is disconnected", async () => {
    // Ensure disconnected state
    await disconnectDB();

    const res = await request(app).get("/api/v1/health/ready");

    expect(res.status).toBe(503);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body).toEqual({
      status: "not_ready",
      service: "earlyai-ats-api",
      database: "disconnected",
    });
  });

  it("returns 200 ready when MongoDB is connected", async () => {
    // Connect to isolated test database
    await connectDB(TEST_DB_URI);

    const res = await request(app).get("/api/v1/health/ready");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body).toEqual({
      status: "ready",
      service: "earlyai-ats-api",
      database: "connected",
    });
  });

  it("returns 404 for unmapped endpoints", async () => {
    const res = await request(app).get("/api/v1/non-existent-endpoint");

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body.error).toHaveProperty("code", "NOT_FOUND");
  });
});



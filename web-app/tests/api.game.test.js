const request = require("supertest");
const http = require("http");
const next = require("next");
const { parse } = require("url");

describe("API /api/game", () => {
  let server;
  let app;
  let handle;

  beforeAll(async () => {
    app = next({ dev: true });
    handle = app.getRequestHandler();
    await app.prepare();
    server = http.createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    });
    server.listen(4000);
  });

  afterAll((done) => {
    server.close(done);
  });

  it("should join the game", async () => {
    const res = await request(server)
      .post("/api/game")
      .send({ action: "join", playerName: "TestPlayer" });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.playerId).toBeDefined();
    expect(res.body.token).toBeDefined();
  });

  it("should reject invalid join payload", async () => {
    const res = await request(server)
      .post("/api/game")
      .send({ action: "join", playerName: "" });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Invalid payload");
  });
});

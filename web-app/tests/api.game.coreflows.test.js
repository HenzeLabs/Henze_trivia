const request = require("supertest");
const http = require("http");
const next = require("next");
const { parse } = require("url");

describe("API /api/game - core flows", () => {
  let server;
  let app;
  let handle;
  let playerId;
  let token;
  let hostPin = process.env.HOST_PIN || "changeme123";

  beforeAll(async () => {
    app = next({ dev: true });
    handle = app.getRequestHandler();
    await app.prepare();
    server = http.createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    });
    server.listen(4001);
  });

  afterAll((done) => {
    server.close(done);
  });

  it("should join the game", async () => {
    const res = await request(server)
      .post("/api/game")
      .send({ action: "join", playerName: "TestPlayer2" });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    playerId = res.body.playerId;
    token = res.body.token;
  });

  it("should start the game (admin)", async () => {
    const res = await request(server)
      .post("/api/game")
      .send({ action: "start", token, hostPin });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should submit an answer", async () => {
    const res = await request(server)
      .post("/api/game")
      .send({ action: "answer", playerId, answer: 0, token });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should reject invalid answer", async () => {
    const res = await request(server)
      .post("/api/game")
      .send({ action: "answer", playerId, answer: 99, token });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Invalid payload");
  });

  it("should reset the game (admin)", async () => {
    const res = await request(server)
      .post("/api/game")
      .send({ action: "reset", token, hostPin });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

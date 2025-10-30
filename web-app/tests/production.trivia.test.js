const { test, expect } = require("@playwright/test");

const PROD_BASE_URL = "https://henze-trivia.onrender.com";

// Allow plenty of time for multi-client orchestration against production
test.describe.configure({ timeout: 180_000 });

test("Production multi-client trivia flow @trivia", async ({ browser }) => {
  const consoleErrors = [];
  const contexts = [];
  const observations = {
    joinStates: {
      player1: {},
      player2: {},
    },
    offlineBanner: {
      shown: false,
      cleared: false,
    },
    sockets: {
      tvReceivedQuestion: false,
      tvRevealVisible: false,
      tvResultsVisible: false,
      tvLobbyReset: false,
    },
    gameplay: {
      player1AnswerRegistered: false,
      player2AnswerRegistered: false,
      player1RevealSeen: false,
    },
    persistence: {
      player1IdStored: "",
      player1TokenStored: "",
      player2IdStored: "",
      player2TokenStored: "",
      player1IdAfterReset: "",
    },
  };

  const trackConsole = (page, label) => {
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(`${label} console error: ${msg.text()}`);
      }
    });
    page.on("pageerror", (err) => {
      consoleErrors.push(`${label} page error: ${err.message || err}`);
    });
  };

  const waitForButtonLabel = async (page, text, timeout = 5000) => {
    const locator = page.locator("button", { hasText: text });
    try {
      await locator.first().waitFor({ state: "visible", timeout });
      return true;
    } catch {
      return false;
    }
  };

  const waitForText = async (page, text, timeout = 10000) => {
    const locator = page.locator(`text=${text}`);
    try {
      await locator.first().waitFor({ state: "visible", timeout });
      return true;
    } catch {
      return false;
    }
  };

  const waitForRegex = async (page, pattern, timeout = 10000) => {
    const locator = page.locator(`text=${pattern}`);
    try {
      await locator.first().waitFor({ state: "visible", timeout });
      return true;
    } catch {
      return false;
    }
  };

  const waitForHiddenText = async (page, text, timeout = 10000) => {
    const locator = page.locator(`text=${text}`);
    try {
      await locator.first().waitFor({ state: "hidden", timeout });
      return true;
    } catch {
      return false;
    }
  };

  const openJoinFormIfNeeded = async (page) => {
    const heroJoinButton = page
      .locator("button", { hasText: "JOIN THE GAME" })
      .first();
    try {
      await heroJoinButton.waitFor({ state: "visible", timeout: 5000 });
      await heroJoinButton.click();
    } catch {
      // Already on the join form
    }
  };

  async function createContext(label) {
    const context = await browser.newContext();
    contexts.push({ context, label });
    return context;
  }

  const cleanup = async () => {
    for (const entry of contexts.reverse()) {
      try {
        await entry.context.close();
      } catch {
        // ignore context close errors during cleanup
      }
    }
  };

  try {
    const tvContext = await createContext("tv");
    const tvPage = await tvContext.newPage();
    trackConsole(tvPage, "[TV]");
    await tvPage.goto(`${PROD_BASE_URL}/tv`, {
      waitUntil: "domcontentloaded",
    });
    await tvPage.waitForSelector("text=Players Connected", { timeout: 20000 });
    await expect(tvPage.locator("text=Waiting for players to join...")).toBeVisible();

    const suffix = Date.now().toString().slice(-6);
    const playerOneName = `QA_${suffix}_A`;
    const playerTwoName = `QA_${suffix}_B`;

    const player1Context = await createContext("player1");
    const player1Page = await player1Context.newPage();
    trackConsole(player1Page, "[Player1]");
    await player1Page.goto(PROD_BASE_URL, { waitUntil: "domcontentloaded" });
    await openJoinFormIfNeeded(player1Page);
    await player1Page.waitForSelector('input[placeholder="Your Name"]', {
      timeout: 20000,
    });

    await player1Page.fill('input[placeholder="Your Name"]', playerOneName);
    const joinButton1 = player1Page.getByRole("button", { name: "JOIN GAME" });
    await joinButton1.click();

    observations.joinStates.player1.entering = await waitForButtonLabel(
      player1Page,
      "ENTERING...",
      7000
    );
    observations.joinStates.player1.joinedLoading = await waitForButtonLabel(
      player1Page,
      "JOINED! Loading...",
      10000
    );

    await player1Page.waitForSelector(`text=${playerOneName}`, {
      timeout: 20000,
    });
    await expect(player1Page.locator("text=Players in Lobby")).toBeVisible();

    const player1ButtonsAfterJoin = await player1Page.evaluate(() =>
      Array.from(document.querySelectorAll("button")).map((btn) =>
        btn.textContent?.trim()
      )
    );
    console.log("Player1 buttons post-join:", player1ButtonsAfterJoin);

    observations.persistence.player1IdStored = await player1Page.evaluate(
      () => localStorage.getItem("henzeTrivia_playerId") || ""
    );
    observations.persistence.player1TokenStored = await player1Page.evaluate(
      () => localStorage.getItem("henzeTrivia_token") || ""
    );

    await expect(tvPage.locator(`text=${playerOneName}`)).toBeVisible({
      timeout: 20000,
    });

    const player2Context = await createContext("player2");
    const player2Page = await player2Context.newPage();
    trackConsole(player2Page, "[Player2]");
    await player2Page.goto(PROD_BASE_URL, { waitUntil: "domcontentloaded" });
    await openJoinFormIfNeeded(player2Page);
    await player2Page.waitForSelector('input[placeholder="Your Name"]', {
      timeout: 20000,
    });

    await player2Page.fill('input[placeholder="Your Name"]', playerTwoName);
    const joinButton2 = player2Page.getByRole("button", { name: "JOIN GAME" });
    await joinButton2.click();

    observations.joinStates.player2.entering = await waitForButtonLabel(
      player2Page,
      "ENTERING...",
      7000
    );
    observations.joinStates.player2.joinedLoading = await waitForButtonLabel(
      player2Page,
      "JOINED! Loading...",
      10000
    );

    await player2Page.waitForSelector(`text=${playerTwoName}`, {
      timeout: 20000,
    });
    await expect(player2Page.locator("text=Players in Lobby")).toBeVisible();

    const player2ButtonsAfterJoin = await player2Page.evaluate(() =>
      Array.from(document.querySelectorAll("button")).map((btn) =>
        btn.textContent?.trim()
      )
    );
    console.log("Player2 buttons post-join:", player2ButtonsAfterJoin);

    observations.persistence.player2IdStored = await player2Page.evaluate(
      () => localStorage.getItem("henzeTrivia_playerId") || ""
    );
    observations.persistence.player2TokenStored = await player2Page.evaluate(
      () => localStorage.getItem("henzeTrivia_token") || ""
    );

    await expect(tvPage.locator(`text=${playerTwoName}`)).toBeVisible({
      timeout: 20000,
    });

    const startButtonDiagnostics = await player1Page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button")).map(
        (btn) => ({
          text: btn.textContent?.trim(),
          display: window.getComputedStyle(btn).display,
          visibility: window.getComputedStyle(btn).visibility,
          disabled: btn.disabled,
        })
      );
      return buttons;
    });
    console.log("Player1 buttons before starting:", startButtonDiagnostics);

    const startButton = player1Page
      .locator("button", { hasText: "START GAME" })
      .first();
    await startButton.scrollIntoViewIfNeeded();
    await expect(startButton).toBeEnabled();
    await startButton.click({ force: true });
    observations.joinStates.player1.starting = await waitForButtonLabel(
      player1Page,
      "STARTING...",
      5000
    );
    await waitForHiddenText(player1Page, "START GAME", 15000);

    await waitForRegex(
      player1Page,
      "/ROUND|Waiting for|survivors answered|Correct answer/",
      30000
    );
    await waitForHiddenText(player1Page, "Loading the chamber...", 30000);

    const player1ButtonsDuringQuestion = await player1Page.evaluate(() =>
      Array.from(document.querySelectorAll("button")).map((btn) => ({
        text: btn.textContent?.trim(),
        display: window.getComputedStyle(btn).display,
        visibility: window.getComputedStyle(btn).visibility,
        disabled: btn.disabled,
      }))
    );
    console.log(
      "Player1 buttons during question:",
      player1ButtonsDuringQuestion
    );
    console.log(
      "Player1 visible text snippet:",
      await player1Page.evaluate(() => document.body.innerText.slice(0, 400))
    );
    await player1Page.screenshot({
      path: "player1-question.png",
      fullPage: true,
    });

    observations.sockets.tvReceivedQuestion = await waitForRegex(
      tvPage,
      "/Round|Players answering|Revealing answer|Correct:/",
      30000
    );

    const player1Options = player1Page.locator("button.btn-primary");
    await expect(player1Options.first()).toBeVisible({ timeout: 20000 });
    await player1Options.first().click();
    observations.gameplay.player1AnswerRegistered = await waitForText(
      player1Page,
      "survivors answered",
      10000
    );

    const player2Options = player2Page.locator("button.btn-primary");
    await expect(player2Options.first()).toBeVisible({ timeout: 20000 });
    await player2Options.nth(1).click();
    observations.gameplay.player2AnswerRegistered = await waitForText(
      player2Page,
      "survivors answered",
      10000
    );

    observations.sockets.tvRevealVisible = await waitForText(
      tvPage,
      "Correct:",
      20000
    );
    observations.gameplay.player1RevealSeen = await waitForText(
      player1Page,
      "Correct answer",
      20000
    );

    await player2Context.close();

    observations.sockets.tvResultsVisible = await waitForText(
      tvPage,
      "Sole Survivor",
      40000
    );
    observations.sockets.tvLobbyReset = await waitForText(
      tvPage,
      "Waiting for players to join...",
      60000
    );

    observations.persistence.player1IdAfterReset = await player1Page.evaluate(
      () => localStorage.getItem("henzeTrivia_playerId") || ""
    );

    await player1Page.waitForSelector("text=Players in Lobby", {
      timeout: 20000,
    });
    await player1Page.evaluate(() => {
      window.dispatchEvent(new Event("offline"));
    });
    observations.offlineBanner.shown = await waitForText(
      player1Page,
      "Connection lost. Reconnecting...",
      5000
    );
    await player1Page.evaluate(() => {
      window.dispatchEvent(new Event("online"));
    });
    observations.offlineBanner.cleared = await waitForHiddenText(
      player1Page,
      "Connection lost. Reconnecting...",
      10000
    );

    console.log("QA Observations:", JSON.stringify(observations, null, 2));
    expect(consoleErrors).toEqual([]);
    expect(observations.persistence.player1IdStored).not.toEqual("");
    expect(observations.persistence.player2IdStored).not.toEqual("");
  } finally {
    await cleanup();
  }
});

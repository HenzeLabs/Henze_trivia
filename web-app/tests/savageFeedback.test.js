/**
 * Savage Feedback Tests
 * Tests for tone, feedback logic, and group-specific roasting
 */

const {
  savageCorrect,
  savageWrong,
  savageWaiting,
  getSavage,
} = require("../app/components/savageFeedback.js");

describe("Savage Feedback System", () => {
  describe("Tone and Style Requirements", () => {
    describe("Correct Answer Feedback", () => {
      test("should contain sarcasm or backhanded compliments", () => {
        const sarcasmKeywords = [
          "cocky",
          "broken clock",
          "disaster",
          "fluke",
          "cheat",
          "guessed",
          "let's be real",
          "probably",
          "must",
          "feral",
          "gremlin",
          "brag",
        ];

        savageCorrect.forEach((feedback) => {
          const hasSarcasm = sarcasmKeywords.some((keyword) =>
            feedback.toLowerCase().includes(keyword.toLowerCase())
          );
          expect(hasSarcasm).toBe(true);
        });
      });

      test("should be at least 6 different responses", () => {
        expect(savageCorrect.length).toBeGreaterThanOrEqual(6);
      });

      test("should contain group-specific language", () => {
        const groupKeywords = ["slut", "queen", "gremlin", "situationship"];

        const hasGroupLang = savageCorrect.some((feedback) =>
          groupKeywords.some((keyword) =>
            feedback.toLowerCase().includes(keyword.toLowerCase())
          )
        );

        expect(hasGroupLang).toBe(true);
      });

      test("should not be overly positive or congratulatory", () => {
        const tooPositive = [
          "amazing",
          "fantastic",
          "excellent",
          "perfect",
          "outstanding",
        ];

        savageCorrect.forEach((feedback) => {
          const isTooPositive = tooPositive.some((word) =>
            feedback.toLowerCase().includes(word.toLowerCase())
          );
          expect(isTooPositive).toBe(false);
        });
      });
    });

    describe("Wrong Answer Feedback", () => {
      test("should be mean and direct", () => {
        const meanKeywords = [
          "wrong",
          "nope",
          "incorrect",
          "embarrassing",
          "disaster",
        ];

        savageWrong.forEach((feedback) => {
          const isMean = meanKeywords.some((keyword) =>
            feedback.toLowerCase().includes(keyword.toLowerCase())
          );
          expect(isMean).toBe(true);
        });
      });

      test("should contain inside jokes and references", () => {
        const insideJokes = [
          "hungover",
          "therapist",
          "grindr",
          "hookup",
          "ex",
        ];

        const hasInsideJokes = savageWrong.some((feedback) =>
          insideJokes.some((joke) =>
            feedback.toLowerCase().includes(joke.toLowerCase())
          )
        );

        expect(hasInsideJokes).toBe(true);
      });

      test("should be at least 6 different responses", () => {
        expect(savageWrong.length).toBeGreaterThanOrEqual(6);
      });

      test("should include LGBTQ+ and poly references", () => {
        const lgbtqRefs = ["grindr", "gay", "queen", "hookup"];

        const hasLGBTQRefs = savageWrong.some((feedback) =>
          lgbtqRefs.some((ref) =>
            feedback.toLowerCase().includes(ref.toLowerCase())
          )
        );

        expect(hasLGBTQRefs).toBe(true);
      });
    });

    describe("Waiting Messages", () => {
      test("should be impatient and sarcastic", () => {
        const impatientKeywords = [
          "waiting",
          "hurry",
          "slowpokes",
          "tick tock",
        ];

        savageWaiting.forEach((feedback) => {
          const isImpatient = impatientKeywords.some((keyword) =>
            feedback.toLowerCase().includes(keyword.toLowerCase())
          );
          expect(isImpatient).toBe(true);
        });
      });

      test("should contain group-specific humor", () => {
        const groupHumor = [
          "drama queens",
          "chaos crew",
          "sexting",
          "gay science",
          "wine",
        ];

        const hasGroupHumor = savageWaiting.some((feedback) =>
          groupHumor.some((humor) =>
            feedback.toLowerCase().includes(humor.toLowerCase())
          )
        );

        expect(hasGroupHumor).toBe(true);
      });

      test("should be at least 6 different responses", () => {
        expect(savageWaiting.length).toBeGreaterThanOrEqual(6);
      });
    });
  });

  describe("Swearing and Name-Calling", () => {
    test("should allow swearing in responses", () => {
      const allFeedback = [
        ...savageCorrect,
        ...savageWrong,
        ...savageWaiting,
      ];

      // Check that swearing/adult language is present (not censored)
      const adultLanguage = ["slut", "ass", "hell", "damn"];

      const hasAdultLanguage = allFeedback.some((feedback) =>
        adultLanguage.some((word) =>
          feedback.toLowerCase().includes(word.toLowerCase())
        )
      );

      expect(hasAdultLanguage).toBe(true);
    });

    test("should include playful name-calling", () => {
      const nameCalling = [
        "slut",
        "disaster",
        "gremlin",
        "drama queens",
        "slowpokes",
        "chaos crew",
      ];

      const allFeedback = [
        ...savageCorrect,
        ...savageWrong,
        ...savageWaiting,
      ];

      const hasNameCalling = allFeedback.some((feedback) =>
        nameCalling.some((name) =>
          feedback.toLowerCase().includes(name.toLowerCase())
        )
      );

      expect(hasNameCalling).toBe(true);
    });
  });

  describe("Inside Jokes and References", () => {
    test("should reference group activities and experiences", () => {
      const groupReferences = [
        "hookup",
        "situationship",
        "grindr",
        "therapist",
        "ex",
        "sexting",
        "wine",
      ];

      const allFeedback = [
        ...savageCorrect,
        ...savageWrong,
        ...savageWaiting,
      ];

      const hasGroupRefs = allFeedback.some((feedback) =>
        groupReferences.some((ref) =>
          feedback.toLowerCase().includes(ref.toLowerCase())
        )
      );

      expect(hasGroupRefs).toBe(true);
    });

    test("should include LGBTQ+ and poly context", () => {
      const contextKeywords = ["gay", "grindr", "queen", "poly"];

      const allFeedback = [
        ...savageCorrect,
        ...savageWrong,
        ...savageWaiting,
      ];

      // At least some references should be present
      const hasContext = allFeedback.some((feedback) =>
        contextKeywords.some((keyword) =>
          feedback.toLowerCase().includes(keyword.toLowerCase())
        )
      );

      expect(hasContext).toBe(true);
    });
  });

  describe("getSavage() Utility Function", () => {
    test("should return a random string from array", () => {
      const testArray = ["one", "two", "three"];
      const result = getSavage(testArray);

      expect(testArray).toContain(result);
    });

    test("should return different values on multiple calls", () => {
      const results = new Set();
      const testArray = savageCorrect;

      // Call 100 times - should get some variety
      for (let i = 0; i < 100; i++) {
        results.add(getSavage(testArray));
      }

      // With 6+ options and 100 calls, we should see at least 3 different ones
      expect(results.size).toBeGreaterThan(2);
    });

    test("should handle all feedback arrays", () => {
      expect(() => getSavage(savageCorrect)).not.toThrow();
      expect(() => getSavage(savageWrong)).not.toThrow();
      expect(() => getSavage(savageWaiting)).not.toThrow();
    });

    test("should return valid strings", () => {
      const correct = getSavage(savageCorrect);
      const wrong = getSavage(savageWrong);
      const waiting = getSavage(savageWaiting);

      expect(typeof correct).toBe("string");
      expect(typeof wrong).toBe("string");
      expect(typeof waiting).toBe("string");

      expect(correct.length).toBeGreaterThan(0);
      expect(wrong.length).toBeGreaterThan(0);
      expect(waiting.length).toBeGreaterThan(0);
    });
  });

  describe("Feedback Diversity", () => {
    test("should have no duplicate messages", () => {
      const allMessages = [
        ...savageCorrect,
        ...savageWrong,
        ...savageWaiting,
      ];

      const uniqueMessages = new Set(allMessages);

      expect(uniqueMessages.size).toBe(allMessages.length);
    });

    test("should have varied sentence structure", () => {
      const allMessages = [
        ...savageCorrect,
        ...savageWrong,
        ...savageWaiting,
      ];

      // Check that not all messages start with the same word
      const firstWords = allMessages.map((msg) => msg.split(" ")[0]);
      const uniqueFirstWords = new Set(firstWords);

      expect(uniqueFirstWords.size).toBeGreaterThan(3);
    });

    test("should have varied lengths", () => {
      const allMessages = [
        ...savageCorrect,
        ...savageWrong,
        ...savageWaiting,
      ];

      const lengths = allMessages.map((msg) => msg.length);
      const uniqueLengths = new Set(lengths);

      // Should have variety in message length
      expect(uniqueLengths.size).toBeGreaterThan(5);
    });
  });

  describe("Tone Consistency", () => {
    test("should maintain savage tone across all categories", () => {
      const allMessages = [
        ...savageCorrect,
        ...savageWrong,
        ...savageWaiting,
      ];

      // Check that messages are not overly polite or formal
      const politeWords = [
        "please",
        "thank you",
        "kindly",
        "respectfully",
        "pardon",
      ];

      allMessages.forEach((msg) => {
        const isPolite = politeWords.some((word) =>
          msg.toLowerCase().includes(word.toLowerCase())
        );
        expect(isPolite).toBe(false);
      });
    });

    test("should use casual, conversational language", () => {
      const allMessages = [
        ...savageCorrect,
        ...savageWrong,
        ...savageWaiting,
      ];

      // Should contain casual contractions or informal language
      const casualMarkers = [
        "'",
        "!",
        "...",
        "?",
        "let's",
        "you're",
        "don't",
      ];

      const hasCasual = allMessages.some((msg) =>
        casualMarkers.some((marker) => msg.includes(marker))
      );

      expect(hasCasual).toBe(true);
    });
  });

  describe("Edge Cases and Safety", () => {
    test("should not contain genuinely hurtful or triggering content", () => {
      const allMessages = [
        ...savageCorrect,
        ...savageWrong,
        ...savageWaiting,
      ];

      // Avoid genuinely harmful content (this is playful roasting, not abuse)
      const harmfulWords = [
        "kill yourself",
        "die",
        "hate you",
        "worthless",
        "pathetic loser",
      ];

      allMessages.forEach((msg) => {
        const isHarmful = harmfulWords.some((word) =>
          msg.toLowerCase().includes(word.toLowerCase())
        );
        expect(isHarmful).toBe(false);
      });
    });

    test("should keep roasts playful and exaggerated", () => {
      const allMessages = [
        ...savageCorrect,
        ...savageWrong,
        ...savageWaiting,
      ];

      // Should have playful exaggeration markers
      const exaggerationMarkers = ["disaster", "absolute", "feral", "chaos"];

      const hasExaggeration = allMessages.some((msg) =>
        exaggerationMarkers.some((marker) =>
          msg.toLowerCase().includes(marker.toLowerCase())
        )
      );

      expect(hasExaggeration).toBe(true);
    });
  });

  describe("Integration with Game Context", () => {
    test("should be appropriate for trivia game setting", () => {
      const allMessages = [
        ...savageCorrect,
        ...savageWrong,
        ...savageWaiting,
      ];

      // Messages should feel game-appropriate
      allMessages.forEach((msg) => {
        expect(msg.length).toBeGreaterThan(10); // Not too short
        expect(msg.length).toBeLessThan(200); // Not too long
      });
    });

    test("should enhance gameplay experience", () => {
      // Feedback should be entertaining, not just functional
      const allMessages = [
        ...savageCorrect,
        ...savageWrong,
        ...savageWaiting,
      ];

      // Should have personality and humor
      const humorMarkers = ["!", "?", "lol", "oof", "classic"];

      const hasPersonality = allMessages.some((msg) =>
        humorMarkers.some((marker) =>
          msg.toLowerCase().includes(marker.toLowerCase())
        )
      );

      expect(hasPersonality).toBe(true);
    });
  });
});

describe("Feedback Extensibility", () => {
  test("should be easy to add new feedback messages", () => {
    // Test that the arrays can be extended
    const newCorrect = [
      ...savageCorrect,
      "New savage correct message for testing",
    ];

    expect(newCorrect.length).toBe(savageCorrect.length + 1);
    expect(getSavage(newCorrect)).toBeTruthy();
  });

  test("should maintain type safety", () => {
    // All elements should be strings
    savageCorrect.forEach((msg) => expect(typeof msg).toBe("string"));
    savageWrong.forEach((msg) => expect(typeof msg).toBe("string"));
    savageWaiting.forEach((msg) => expect(typeof msg).toBe("string"));
  });
});

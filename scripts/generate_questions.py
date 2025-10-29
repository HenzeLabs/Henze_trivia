#!/usr/bin/env python3
"""
Question Generation with OpenAI Structured Outputs
Generates high-quality trivia questions from chat data with strict JSON schema validation
"""

import os
import json
import sqlite3
import sys
from typing import List, Dict, Optional, Literal
from datetime import datetime
from pathlib import Path

try:
    from openai import OpenAI
    from pydantic import BaseModel, Field, validator
except ImportError:
    print("❌ Missing dependencies. Install with:")
    print("   pip install openai pydantic")
    sys.exit(1)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
DB_PATH = PROJECT_ROOT / "data" / "henze_trivia.db"
MESSAGES_DB_PATH = Path(os.getenv("CHAT_DB_PATH", "~/Library/Messages/chat.db")).expanduser()


# ==============================================================================
# PYDANTIC SCHEMAS (for strict JSON validation)
# ==============================================================================

class QuestionOption(BaseModel):
    """Single answer option"""
    text: str = Field(..., min_length=1, max_length=200)


class TriviaQuestion(BaseModel):
    """General trivia question"""
    type: Literal["trivia"] = "trivia"
    text: str = Field(..., min_length=10, max_length=500, description="The question text")
    options: List[str] = Field(..., min_items=4, max_items=4, description="Exactly 4 answer options")
    answer_index: int = Field(..., ge=0, le=3, description="Index of correct answer (0-3)")
    explanation: str = Field(..., min_length=10, max_length=500, description="Why this answer is correct")
    category: str = Field(..., min_length=2, max_length=50, description="Topic category")
    difficulty: Literal["easy", "medium", "hard"] = Field(default="medium")

    @validator("options")
    def validate_options(cls, v):
        if len(v) != 4:
            raise ValueError("Must have exactly 4 options")
        if len(set(v)) != 4:
            raise ValueError("All options must be unique")
        return v


class WhoSaidItQuestion(BaseModel):
    """Quote attribution question"""
    type: Literal["who-said-it"] = "who-said-it"
    text: str = Field(..., description="Format: 'Who said: \"[quote]\"?'")
    options: List[str] = Field(..., min_items=4, max_items=4, description="4 person names from chat")
    answer_index: int = Field(..., ge=0, le=3)
    explanation: str = Field(..., description="Context about when/why they said it")
    category: str = Field(default="quotes")
    speaker_names: List[str] = Field(..., description="Must match names in chat roster")

    @validator("text")
    def validate_quote_format(cls, v):
        if not v.startswith("Who said:"):
            raise ValueError("Must start with 'Who said:'")
        return v


class ChaosQuestion(BaseModel):
    """Message timing/pattern question"""
    type: Literal["chaos"] = "chaos"
    text: str = Field(..., description="Question about message patterns or timing")
    options: List[str] = Field(..., min_items=4, max_items=4)
    answer_index: int = Field(..., ge=0, le=3)
    explanation: str = Field(..., description="Data source or explanation")
    category: str = Field(default="chaos")


class RoastQuestion(BaseModel):
    """Personality roast question"""
    type: Literal["roast"] = "roast"
    text: str = Field(..., min_length=10, max_length=300, description="Punchy, 1-line roast setup")
    options: List[str] = Field(..., min_items=4, max_items=4, description="4 person names")
    answer_index: int = Field(..., ge=0, le=3)
    explanation: str = Field(..., description="Why this roast fits")
    category: str = Field(default="roast")
    roasted_person: str = Field(..., description="Name of person being roasted")


# ==============================================================================
# DATABASE HELPERS
# ==============================================================================

def get_db_connection():
    """Get connection to trivia database"""
    DB_PATH.parent.mkdir(exist_ok=True)
    return sqlite3.connect(str(DB_PATH))


def insert_question(conn, question: Dict):
    """Insert question into database"""
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO questions (type, text, options, answer_index, explanation, category, topic, difficulty, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        question["type"],
        question["text"],
        json.dumps(question["options"]),
        question["answer_index"],
        question.get("explanation", ""),
        question.get("category", ""),
        question.get("category", ""),  # Use category as topic for now
        question.get("difficulty", "medium"),
        question.get("source", "ai-generated")
    ))
    conn.commit()
    return cursor.lastrowid


# ==============================================================================
# MESSAGE EXTRACTION
# ==============================================================================

def extract_distinctive_messages(limit=1500, min_length=10):
    """
    Extract distinctive messages from iMessage database
    Filters out reactions, short messages, and duplicates
    """
    if not MESSAGES_DB_PATH.exists():
        print(f"⚠️  iMessage database not found at: {MESSAGES_DB_PATH}")
        return []

    try:
        conn = sqlite3.connect(str(MESSAGES_DB_PATH))
        cursor = conn.cursor()

        # Query for distinctive messages
        query = """
            SELECT
                m.text,
                m.date,
                h.id as handle_id,
                c.display_name as chat_name
            FROM message m
            LEFT JOIN handle h ON m.handle_id = h.id
            LEFT JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
            LEFT JOIN chat c ON cmj.chat_id = c.ROWID
            WHERE m.text IS NOT NULL
                AND LENGTH(m.text) >= ?
                AND m.text NOT LIKE '%Liked%'
                AND m.text NOT LIKE '%Loved%'
                AND m.text NOT LIKE '%Laughed%'
                AND m.text NOT LIKE '%Emphasized%'
            ORDER BY m.date DESC
            LIMIT ?
        """

        cursor.execute(query, (min_length, limit * 2))  # Fetch 2x for filtering
        rows = cursor.fetchall()
        conn.close()

        # Deduplicate and score by distinctiveness
        seen_texts = set()
        messages = []

        for text, date, handle_id, chat_name in rows:
            # Normalize for dedup
            normalized = text.lower().strip()
            if normalized in seen_texts:
                continue
            seen_texts.add(normalized)

            messages.append({
                "text": text,
                "date": date,
                "handle_id": handle_id,
                "chat_name": chat_name or "Unknown"
            })

            if len(messages) >= limit:
                break

        print(f"📱 Extracted {len(messages)} distinctive messages from iMessage")
        return messages

    except Exception as e:
        print(f"❌ Error extracting messages: {e}")
        return []


def get_speaker_names():
    """Get list of unique speaker names from chat"""
    if not MESSAGES_DB_PATH.exists():
        return ["Alice", "Bob", "Charlie", "Dana"]  # Fallback

    try:
        conn = sqlite3.connect(str(MESSAGES_DB_PATH))
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT id FROM handle WHERE id IS NOT NULL LIMIT 20")
        names = [row[0] for row in cursor.fetchall()]
        conn.close()
        return names if names else ["Alice", "Bob", "Charlie", "Dana"]
    except:
        return ["Alice", "Bob", "Charlie", "Dana"]


# ==============================================================================
# QUESTION GENERATION (OpenAI Structured Outputs)
# ==============================================================================

def generate_trivia_questions(count=10, category="general") -> List[TriviaQuestion]:
    """Generate general trivia questions with structured output"""

    prompt = f"""Generate {count} trivia questions about {category}.

Rules:
- Questions should be fun, engaging, and moderately challenging
- Distractors (wrong answers) should be plausible but clearly wrong
- Mix of pop culture, sports, history, science
- Avoid questions that are too easy (>95% correct) or too hard (<15% correct)
- Explanations should be concise and informative

Return exactly {count} questions."""

    try:
        response = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a trivia question generator. Create engaging, well-balanced questions with plausible distractors."},
                {"role": "user", "content": prompt}
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "trivia_questions",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "properties": {
                            "questions": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "type": {"type": "string", "enum": ["trivia"]},
                                        "text": {"type": "string"},
                                        "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                        "answer_index": {"type": "integer", "minimum": 0, "maximum": 3},
                                        "explanation": {"type": "string"},
                                        "category": {"type": "string"},
                                        "difficulty": {"type": "string", "enum": ["easy", "medium", "hard"]}
                                    },
                                    "required": ["type", "text", "options", "answer_index", "explanation", "category", "difficulty"],
                                    "additionalProperties": False
                                }
                            }
                        },
                        "required": ["questions"],
                        "additionalProperties": False
                    }
                }
            }
        )

        result = json.loads(response.choices[0].message.content)
        questions = [TriviaQuestion(**q) for q in result["questions"]]
        print(f"✅ Generated {len(questions)} trivia questions")
        return questions

    except Exception as e:
        print(f"❌ Error generating trivia questions: {e}")
        return []


def generate_who_said_it_questions(messages: List[Dict], count=5) -> List[WhoSaidItQuestion]:
    """Generate 'Who Said It?' questions from chat messages"""

    if len(messages) < 20:
        print("⚠️  Not enough messages for Who Said It questions")
        return []

    speaker_names = get_speaker_names()

    # Sample distinctive messages
    import random
    sampled = random.sample(messages, min(count * 3, len(messages)))

    context = "\n".join([f"- {m['text']}" for m in sampled[:50]])
    speaker_list = ", ".join(speaker_names[:8])

    prompt = f"""Generate {count} "Who Said It?" questions from these chat messages.

Available speakers: {speaker_list}

Sample messages:
{context}

Rules:
- Pick the most memorable, funny, or distinctive quotes
- All 4 options must be from the speaker list above
- Distractors should be people who COULD have said it (similar vibe)
- Format: "Who said: \"[exact quote]\""
- Explanation should give context (when/why they said it)

Return exactly {count} questions."""

    try:
        response = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": f"You are creating quote attribution questions from a group chat. Available speakers: {speaker_list}"},
                {"role": "user", "content": prompt}
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "who_said_it_questions",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "properties": {
                            "questions": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "type": {"type": "string", "enum": ["who-said-it"]},
                                        "text": {"type": "string"},
                                        "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                        "answer_index": {"type": "integer", "minimum": 0, "maximum": 3},
                                        "explanation": {"type": "string"},
                                        "category": {"type": "string"},
                                        "speaker_names": {"type": "array", "items": {"type": "string"}}
                                    },
                                    "required": ["type", "text", "options", "answer_index", "explanation", "category", "speaker_names"],
                                    "additionalProperties": False
                                }
                            }
                        },
                        "required": ["questions"],
                        "additionalProperties": False
                    }
                }
            }
        )

        result = json.loads(response.choices[0].message.content)
        questions = [WhoSaidItQuestion(**q) for q in result["questions"]]
        print(f"✅ Generated {len(questions)} Who Said It questions")
        return questions

    except Exception as e:
        print(f"❌ Error generating Who Said It questions: {e}")
        return []


def generate_roast_questions(messages: List[Dict], count=5) -> List[RoastQuestion]:
    """Generate personality roast questions from chat analysis"""

    if len(messages) < 20:
        print("⚠️  Not enough messages for roast questions")
        return []

    speaker_names = get_speaker_names()

    # Sample messages for personality analysis
    import random
    sampled = random.sample(messages, min(100, len(messages)))
    context = "\n".join([f"- {m['text'][:100]}" for m in sampled[:30]])

    prompt = f"""Analyze these chat messages and generate {count} funny personality roast questions.

Available people: {", ".join(speaker_names[:8])}

Sample messages:
{context}

Rules:
- Roasts should be funny but not mean-spirited
- Based on actual message patterns (response times, topics, emoji usage, etc.)
- Format: "Who is most likely to [behavior]?"
- All 4 options must be real people from the list
- Explanation should reference message patterns

Examples:
- "Who is most likely to reply to a text 3 days late?"
- "Who uses the most emojis per message?"
- "Who always has to have the last word?"

Return exactly {count} questions."""

    try:
        response = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are creating humorous personality questions based on chat patterns. Keep it light and fun."},
                {"role": "user", "content": prompt}
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "roast_questions",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "properties": {
                            "questions": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "type": {"type": "string", "enum": ["roast"]},
                                        "text": {"type": "string"},
                                        "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                                        "answer_index": {"type": "integer", "minimum": 0, "maximum": 3},
                                        "explanation": {"type": "string"},
                                        "category": {"type": "string"},
                                        "roasted_person": {"type": "string"}
                                    },
                                    "required": ["type", "text", "options", "answer_index", "explanation", "category", "roasted_person"],
                                    "additionalProperties": False
                                }
                            }
                        },
                        "required": ["questions"],
                        "additionalProperties": False
                    }
                }
            }
        )

        result = json.loads(response.choices[0].message.content)
        questions = [RoastQuestion(**q) for q in result["questions"]]
        print(f"✅ Generated {len(questions)} roast questions")
        return questions

    except Exception as e:
        print(f"❌ Error generating roast questions: {e}")
        return []


# ==============================================================================
# MAIN CLI
# ==============================================================================

def main():
    print("🎮 Henze Trivia Question Generator")
    print("=" * 60)

    if not os.getenv("OPENAI_API_KEY"):
        print("❌ OPENAI_API_KEY environment variable not set")
        sys.exit(1)

    # Get database connection
    conn = get_db_connection()

    # Extract chat messages (if available)
    messages = extract_distinctive_messages()

    total_generated = 0

    # Generate trivia questions
    print("\n📚 Generating trivia questions...")
    trivia = generate_trivia_questions(count=15, category="pop culture, sports, history")
    for q in trivia:
        q_dict = q.dict()
        q_dict["source"] = "ai-generated"
        insert_question(conn, q_dict)
        total_generated += 1

    # Generate chat-based questions (if we have messages)
    if messages:
        print("\n💬 Generating Who Said It questions...")
        who_said_it = generate_who_said_it_questions(messages, count=5)
        for q in who_said_it:
            q_dict = q.dict()
            q_dict["source"] = "chat"
            insert_question(conn, q_dict)
            total_generated += 1

        print("\n🔥 Generating roast questions...")
        roasts = generate_roast_questions(messages, count=5)
        for q in roasts:
            q_dict = q.dict()
            q_dict["source"] = "chat"
            insert_question(conn, q_dict)
            total_generated += 1
    else:
        print("\n⚠️  Skipping chat-based questions (no messages available)")

    conn.close()

    print("\n" + "=" * 60)
    print(f"✅ Generation complete! Added {total_generated} questions to database")
    print(f"   Database: {DB_PATH}")
    print("=" * 60)


if __name__ == "__main__":
    main()

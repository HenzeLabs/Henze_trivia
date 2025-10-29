#!/usr/bin/env python3
"""
Fetch General Trivia and Pop Culture Questions
Sources:
1. Open Trivia Database API (free, no key needed)
2. OpenAI for current pop culture questions
"""

import requests
import csv
import os
import json
from openai import OpenAI
from dotenv import load_dotenv
import random
import time

load_dotenv()

class TriviaFetcher:
    def __init__(self):
        self.opentdb_base = "https://opentdb.com/api.php"
        self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    def fetch_opentdb_questions(self, amount=20, category=None, difficulty=None):
        """
        Fetch questions from Open Trivia Database

        Categories:
        9: General Knowledge
        11: Film
        12: Music
        13: Musicals & Theatres
        14: Television
        15: Video Games
        17: Science & Nature
        18: Computers
        20: Mythology
        21: Sports
        22: Geography
        23: History
        """
        params = {
            'amount': amount,
            'type': 'multiple'  # Multiple choice
        }

        if category:
            params['category'] = category
        if difficulty:
            params['difficulty'] = difficulty

        print(f"🌐 Fetching {amount} questions from Open Trivia DB...")

        try:
            response = requests.get(self.opentdb_base, params=params)
            data = response.json()

            if data['response_code'] == 0:
                questions = self._format_opentdb_questions(data['results'])
                print(f"✓ Fetched {len(questions)} questions")
                return questions
            else:
                print(f"❌ Error: Response code {data['response_code']}")
                return []
        except Exception as e:
            print(f"❌ Error fetching from OpenTDB: {e}")
            return []

    def _format_opentdb_questions(self, results):
        """Format OpenTDB questions to match our CSV format"""
        formatted = []

        for q in results:
            # Combine correct and incorrect answers
            all_answers = q['incorrect_answers'] + [q['correct_answer']]
            random.shuffle(all_answers)

            # Find which option is correct
            correct_index = all_answers.index(q['correct_answer'])
            correct_letter = chr(65 + correct_index)  # A, B, C, D

            formatted.append({
                'question': self._decode_html(q['question']),
                'correct_answer': correct_letter,
                'explanation': f"Category: {q['category']}",
                'difficulty': q['difficulty'],
                'category': self._decode_html(q['category']),
                'option_A': self._decode_html(all_answers[0]) if len(all_answers) > 0 else '',
                'option_B': self._decode_html(all_answers[1]) if len(all_answers) > 1 else '',
                'option_C': self._decode_html(all_answers[2]) if len(all_answers) > 2 else '',
                'option_D': self._decode_html(all_answers[3]) if len(all_answers) > 3 else '',
            })

        return formatted

    def _decode_html(self, text):
        """Decode HTML entities"""
        import html
        return html.unescape(text)

    def generate_pop_culture_questions(self, num_questions=10, year=2025):
        """Generate current pop culture questions using OpenAI"""

        prompt = f"""Generate {num_questions} multiple choice trivia questions about CURRENT pop culture and events from {year}.

Focus on:
- Recent movies, TV shows, music (2024-{year})
- Viral trends, memes, social media moments
- Current celebrities and influencers
- Recent news events and viral stories
- Popular video games, apps, and technology
- Sports events and achievements

Make questions fun, relevant, and accurate. Include mix of easy, medium, and hard questions.

Format as JSON array with this structure:
[
  {{
    "question": "Question text",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "correct_answer": 0,
    "explanation": "Brief explanation",
    "difficulty": "medium",
    "category": "Pop Culture"
  }}
]

IMPORTANT: Return ONLY the JSON array, no other text."""

        print(f"\n🤖 Generating {num_questions} pop culture questions for {year}...")

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a pop culture trivia expert who creates engaging, accurate questions about current events and trends."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=3000
            )

            content = response.choices[0].message.content
            if content is None:
                raise ValueError("No content in response")

            content = content.strip()

            # Remove markdown code blocks if present
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
                content = content.strip()

            questions_data = json.loads(content)
            questions = self._format_openai_questions(questions_data)

            print(f"✓ Generated {len(questions)} pop culture questions")
            return questions

        except Exception as e:
            print(f"❌ Error generating pop culture questions: {e}")
            return []

    def _format_openai_questions(self, questions_data):
        """Format OpenAI questions to match our CSV format"""
        formatted = []

        for q in questions_data:
            correct_index = q['correct_answer']
            correct_letter = chr(65 + correct_index)  # A, B, C, D

            formatted.append({
                'question': q['question'],
                'correct_answer': correct_letter,
                'explanation': q.get('explanation', ''),
                'difficulty': q.get('difficulty', 'medium'),
                'category': q.get('category', 'Pop Culture'),
                'option_A': q['options'][0] if len(q['options']) > 0 else '',
                'option_B': q['options'][1] if len(q['options']) > 1 else '',
                'option_C': q['options'][2] if len(q['options']) > 2 else '',
                'option_D': q['options'][3] if len(q['options']) > 3 else '',
            })

        return formatted

    def save_to_csv(self, questions, filename):
        """Save questions to CSV"""
        fieldnames = ['question', 'correct_answer', 'explanation', 'difficulty', 'category',
                      'option_A', 'option_B', 'option_C', 'option_D']

        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(questions)

        print(f"💾 Saved {len(questions)} questions to {filename}")

def main():
    fetcher = TriviaFetcher()
    all_questions = []

    print("="*70)
    print("GENERAL & POP CULTURE TRIVIA FETCHER")
    print("="*70)

    # 1. Fetch general knowledge from OpenTDB
    print("\n📚 FETCHING GENERAL TRIVIA")
    print("-"*70)

    categories = {
        9: "General Knowledge",
        11: "Film",
        12: "Music",
        14: "Television",
        17: "Science & Nature",
        21: "Sports",
        22: "Geography",
        23: "History"
    }

    for cat_id, cat_name in categories.items():
        print(f"\n🎯 Category: {cat_name}")
        questions = fetcher.fetch_opentdb_questions(amount=5, category=cat_id)
        all_questions.extend(questions)
        time.sleep(0.5)  # Be nice to the API

    # 2. Generate current pop culture questions
    print("\n\n🎬 GENERATING POP CULTURE QUESTIONS")
    print("-"*70)

    pop_questions = fetcher.generate_pop_culture_questions(num_questions=20, year=2025)
    all_questions.extend(pop_questions)

    # 3. Save to CSV
    print("\n\n💾 SAVING QUESTIONS")
    print("-"*70)

    output_file = '/Users/laurenadmin/Projects/henze-trivia/output/general_trivia_questions.csv'
    fetcher.save_to_csv(all_questions, output_file)

    # Summary
    print("\n\n" + "="*70)
    print("SUMMARY")
    print("="*70)
    print(f"Total questions fetched: {len(all_questions)}")

    # Count by category
    categories_count = {}
    for q in all_questions:
        cat = q['category']
        categories_count[cat] = categories_count.get(cat, 0) + 1

    print("\nQuestions by category:")
    for cat, count in sorted(categories_count.items(), key=lambda x: x[1], reverse=True):
        print(f"  {cat}: {count}")

    # Count by difficulty
    difficulty_count = {}
    for q in all_questions:
        diff = q['difficulty']
        difficulty_count[diff] = difficulty_count.get(diff, 0) + 1

    print("\nQuestions by difficulty:")
    for diff, count in difficulty_count.items():
        print(f"  {diff}: {count}")

    print("\n✅ Done! Questions saved to:")
    print(f"   {output_file}")

    # Preview some questions
    print("\n\n" + "="*70)
    print("SAMPLE QUESTIONS")
    print("="*70)

    for i, q in enumerate(random.sample(all_questions, min(3, len(all_questions))), 1):
        print(f"\nQ{i} [{q['category']}] - {q['difficulty'].upper()}")
        print(f"   {q['question']}")
        print(f"   A) {q['option_A']}")
        print(f"   B) {q['option_B']}")
        print(f"   C) {q['option_C']}")
        print(f"   D) {q['option_D']}")
        print(f"   ✓ Answer: {q['correct_answer']}")

if __name__ == '__main__':
    main()

"""
"Who Said It?" Question Generator
Generates quote attribution trivia questions from chat messages.
"""

import os
import pandas as pd
import random
from openai import OpenAI
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Known participants for multiple choice
PARTICIPANTS = ["Lauren", "Benny Harris", "Ian O'Malley", "Gina Ortiz", "Jackson"]


def load_chat_data(csv_path="~/Projects/henze-trivia/output/chat_export.csv"):
    """Load chat messages from CSV file."""
    csv_path = os.path.expanduser(csv_path)
    df = pd.read_csv(csv_path)
    print(f"📥 Loaded {len(df)} messages from chat history")
    return df


def select_memorable_quotes(messages_df, num_quotes=20):
    """
    Use OpenAI to identify memorable/funny/interesting quotes from chat.
    
    Args:
        messages_df: DataFrame with chat messages
        num_quotes: Number of quotes to select
    
    Returns:
        List of selected quotes with metadata
    """
    # Sample messages (avoid super short ones)
    interesting_messages = messages_df[
        (messages_df['text'].str.len() > 20) & 
        (messages_df['text'].str.len() < 200) &
        (messages_df['sender'].isin(PARTICIPANTS))
    ].sample(n=min(100, len(messages_df)))
    
    # Create context for OpenAI
    context = "\n".join([
        f"{i+1}. {row['sender']}: {row['text']}"
        for i, (_, row) in enumerate(interesting_messages.iterrows())
        if pd.notna(row['text'])
    ])
    
    prompt = f"""From this group chat, select the {num_quotes} most SAVAGE, unhinged, or absolutely chaotic quotes for a "Who said this?" trivia game.

Chat messages:
{context}

Prioritize quotes that are:
- Funny, savage, or absolutely unhinged
- Show personality/character (especially chaotic energy)
- NOT generic boring shit ("ok", "lol", "sounds good")
- Representative of that person's chaos level
- 15-150 characters long
- Bonus points for drunk texts, 3AM energy, or cursed vibes

Return a JSON array with this format:
[
  {{
    "quote": "the actual quote text",
    "speaker": "the person who said it",
    "reason": "why this quote is savage/memorable/unhinged"
  }}
]

Return ONLY the JSON array, no other text."""

    print(f"\n🤖 Selecting {num_quotes} savage quotes...")
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a SAVAGE quote curator. Find the most unhinged, chaotic, and funny messages. Prioritize chaos energy and drunk text vibes. No boring shit allowed."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.85,
            max_tokens=2000
        )
        
        content = response.choices[0].message.content
        if content is None:
            raise ValueError("No content in response")
        content = content.strip()
        
        # Remove markdown if present
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        
        quotes = json.loads(content)
        print(f"✅ Selected {len(quotes)} memorable quotes!")
        return quotes
        
    except Exception as e:
        print(f"❌ Error selecting quotes: {e}")
        # Fallback: random selection
        print("Using fallback random selection...")
        return [
            {
                "quote": row['text'],
                "speaker": row['sender'],
                "reason": "randomly selected"
            }
            for _, row in interesting_messages.head(num_quotes).iterrows()
        ]


def generate_who_said_it_questions(quotes, num_questions=10):
    """
    Generate "Who Said It?" questions from selected quotes.
    
    Args:
        quotes: List of quote dictionaries
        num_questions: Number of questions to generate
    
    Returns:
        List of trivia questions
    """
    questions = []
    
    for i, quote_data in enumerate(quotes[:num_questions], 1):
        correct_answer = quote_data['speaker']
        quote = quote_data['quote']
        
        # Generate 4 options: correct answer + 3 random other participants
        options_pool = PARTICIPANTS.copy()
        
        # Make sure correct answer is in the pool
        if correct_answer not in options_pool:
            options_pool.append(correct_answer)
        
        # Select 3 wrong answers
        wrong_answers = [p for p in options_pool if p != correct_answer]
        random.shuffle(wrong_answers)
        wrong_answers = wrong_answers[:3]
        
        # Combine and shuffle all options
        all_options = [correct_answer] + wrong_answers
        random.shuffle(all_options)
        
        # Map to A, B, C, D
        options_dict = {}
        correct_letter = None
        for idx, option in enumerate(all_options):
            letter = chr(65 + idx)  # A=65 in ASCII
            options_dict[letter] = option
            if option == correct_answer:
                correct_letter = letter
        
        question = {
            "question": f"Who said: \"{quote}\"?",
            "options": options_dict,
            "correct_answer": correct_letter,
            "explanation": f"{correct_answer} said this. {quote_data.get('reason', '')}",
            "difficulty": "medium",
            "category": "Who Said It?"
        }
        
        questions.append(question)
        print(f"  ✓ Generated question {i}: Who said \"{quote[:50]}...\"")
    
    return questions


def save_questions(questions, output_path="~/Projects/henze-trivia/output/who_said_it_questions.csv"):
    """Save generated questions to CSV file."""
    output_path = os.path.expanduser(output_path)
    
    # Convert to DataFrame
    questions_df = pd.DataFrame(questions)
    
    # Flatten the options dict
    if not questions_df.empty:
        for opt in ['A', 'B', 'C', 'D']:
            questions_df[f'option_{opt}'] = questions_df['options'].apply(
                lambda x: x.get(opt, '') if isinstance(x, dict) else ''
            )
        questions_df = questions_df.drop('options', axis=1)
    
    questions_df.to_csv(output_path, index=False)
    print(f"💾 Saved questions to: {output_path}")
    return output_path


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate 'Who Said It?' trivia questions")
    parser.add_argument("--num", type=int, default=10, help="Number of questions to generate")
    parser.add_argument("--display", action="store_true", help="Display generated questions")
    
    args = parser.parse_args()
    
    print("🎮 'Who Said It?' Question Generator")
    print("="*60)
    
    # Load chat data
    messages_df = load_chat_data()
    
    # Select memorable quotes
    quotes = select_memorable_quotes(messages_df, num_quotes=args.num * 2)  # Get extra
    
    # Generate questions
    questions = generate_who_said_it_questions(quotes, num_questions=args.num)
    
    if not questions:
        print("❌ No questions were generated.")
        exit(1)
    
    # Save questions
    save_questions(questions)
    
    # Display if requested
    if args.display:
        print("\n" + "="*60)
        print("📋 GENERATED QUESTIONS:")
        print("="*60)
        for i, q in enumerate(questions, 1):
            print(f"\nQuestion {i}:")
            print(f"  {q['question']}")
            for letter, option in q['options'].items():
                marker = "✓" if letter == q['correct_answer'] else " "
                print(f"    {letter}) {option} {marker}")
    
    print(f"\n✅ Successfully generated {len(questions)} 'Who Said It?' questions!")

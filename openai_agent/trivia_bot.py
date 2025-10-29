"""
OpenAI-powered Trivia Bot
Generates trivia questions based on group chat messages.
"""

import os
import pandas as pd
from openai import OpenAI
from dotenv import load_dotenv
from datetime import datetime
import json

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def load_chat_data(csv_path="~/Projects/henze-trivia/output/chat_export.csv"):
    """Load chat messages from CSV file."""
    csv_path = os.path.expanduser(csv_path)
    df = pd.read_csv(csv_path)
    print(f"📥 Loaded {len(df)} messages from {len(df['group_name'].unique())} groups")
    return df


def generate_trivia_questions(messages_df, num_questions=10, difficulty="medium"):
    """
    Generate trivia questions based on chat messages using OpenAI.
    
    Args:
        messages_df: DataFrame with chat messages
        num_questions: Number of questions to generate
        difficulty: 'easy', 'medium', or 'hard'
    
    Returns:
        List of trivia questions with answers
    """
    # Sample recent messages to use as context
    sample_size = min(200, len(messages_df))
    recent_messages = messages_df.head(sample_size)
    
    # Create context from messages
    context = "\n".join([
        f"{row['sender']}: {row['text'][:200]}" 
        for _, row in recent_messages.iterrows() 
        if pd.notna(row['text'])
    ])
    
    # Create prompt for OpenAI
    prompt = f"""You are an ABSOLUTELY SAVAGE trivia game master creating brutal, hilarious questions based on a friend group's chat history.

Here are recent messages from the group chat:

{context}

Generate {num_questions} {difficulty} difficulty trivia questions based on these conversations.

TONE REQUIREMENTS: Be ABSOLUTELY SAVAGE. Use cuss words naturally. Drag people for their chat habits. Get as unhinged and chaotic as possible without being truly cruel. Maximum chaos energy - no holding back.

The questions should:
- Be specific to things mentioned in the chats (inside jokes, events, people, places, activities)
- DRAG people for their ridiculous chat behavior
- Use cuss words and chaotic energy naturally
- Make people laugh and say "oh SHIT that's accurate"
- Have 4 multiple choice options (A, B, C, D)
- Include the correct answer
- Range from specific details to savage observations

EXAMPLES:
"Which friend sends the most absolutely unhinged messages at 3AM like they don't have responsibilities?"
"What fucking phrase does [Name] say in EVERY conversation without fail?"
"Who's the group's biggest chaos agent when it comes to making plans?"

Format each question as JSON with this structure:
{{
    "question": "The question text",
    "options": {{
        "A": "First option",
        "B": "Second option", 
        "C": "Third option",
        "D": "Fourth option"
    }},
    "correct_answer": "A",
    "explanation": "Brief explanation or context",
    "difficulty": "{difficulty}",
    "category": "Category name"
}}

Return ONLY a JSON array of questions, no other text."""

    print(f"\n🤖 Generating {num_questions} {difficulty} trivia questions...")
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an ABSOLUTELY SAVAGE trivia game master who creates brutal, hilarious questions that drag people for their chat behavior. Use cuss words. Get unhinged. Make it absolutely chaotic without being genuinely cruel. Maximum chaos energy - no holding back."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.9,
            max_tokens=4000
        )
        
        # Parse the response
        content = response.choices[0].message.content
        if content is None:
            raise ValueError("No content in response")
        content = content.strip()
        
        # Remove markdown code blocks if present
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        
        questions = json.loads(content)
        
        print(f"✅ Successfully generated {len(questions)} questions!")
        return questions
        
    except Exception as e:
        print(f"❌ Error generating questions: {e}")
        return []


def save_questions(questions, output_path="~/Projects/henze-trivia/output/sample_questions.csv"):
    """Save generated questions to CSV file."""
    output_path = os.path.expanduser(output_path)
    
    # Convert to DataFrame
    questions_df = pd.DataFrame(questions)
    
    # Flatten the options dict
    if not questions_df.empty:
        for opt in ['A', 'B', 'C', 'D']:
            questions_df[f'option_{opt}'] = questions_df['options'].apply(lambda x: x.get(opt, ''))
        questions_df = questions_df.drop('options', axis=1)
    
    questions_df.to_csv(output_path, index=False)
    print(f"💾 Saved questions to: {output_path}")
    return output_path


def display_question(question, index=1):
    """Display a trivia question in a formatted way."""
    print(f"\n{'='*60}")
    print(f"Question {index}: {question.get('category', 'General')}")
    print(f"Difficulty: {question.get('difficulty', 'medium').upper()}")
    print(f"{'='*60}")
    print(f"\n{question['question']}\n")
    
    for letter, option in question['options'].items():
        print(f"  {letter}) {option}")
    
    print(f"\n{'='*60}")
    print(f"✓ Correct Answer: {question['correct_answer']}")
    print(f"📝 Explanation: {question.get('explanation', 'N/A')}")
    print(f"{'='*60}")


def interactive_mode(questions):
    """Run an interactive trivia game."""
    print("\n🎮 Starting Interactive Trivia Game!")
    print("="*60)
    
    score = 0
    for i, question in enumerate(questions, 1):
        print(f"\n\n📊 Question {i}/{len(questions)}")
        print(f"Current Score: {score}/{i-1}\n")
        print(f"{question['question']}\n")
        
        for letter, option in question['options'].items():
            print(f"  {letter}) {option}")
        
        # Get user answer
        user_answer = input("\n➡️  Your answer (A/B/C/D): ").strip().upper()
        
        if user_answer == question['correct_answer']:
            print("\n✅ CORRECT! 🎉")
            score += 1
        else:
            print(f"\n❌ Wrong! The correct answer was: {question['correct_answer']}")
        
        print(f"\n📝 {question.get('explanation', '')}")
        input("\nPress Enter to continue...")
    
    print(f"\n\n{'='*60}")
    print(f"🏆 FINAL SCORE: {score}/{len(questions)}")
    percentage = (score / len(questions)) * 100
    print(f"📊 Percentage: {percentage:.1f}%")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate trivia questions from group chat")
    parser.add_argument("--num", type=int, default=10, help="Number of questions to generate")
    parser.add_argument("--difficulty", choices=["easy", "medium", "hard"], default="medium", help="Question difficulty")
    parser.add_argument("--play", action="store_true", help="Play interactive trivia game")
    parser.add_argument("--display", action="store_true", help="Display generated questions")
    
    args = parser.parse_args()
    
    # Load chat data
    print("🚀 Henze Trivia Bot")
    print("="*60)
    messages_df = load_chat_data()
    
    # Generate questions
    questions = generate_trivia_questions(
        messages_df, 
        num_questions=args.num,
        difficulty=args.difficulty
    )
    
    if not questions:
        print("❌ No questions were generated. Check your OpenAI API key and try again.")
        exit(1)
    
    # Save questions
    save_questions(questions)
    
    # Display or play
    if args.play:
        interactive_mode(questions)
    elif args.display:
        for i, q in enumerate(questions, 1):
            display_question(q, i)
    else:
        print("\n✅ Questions generated successfully!")
        print("\n💡 Next steps:")
        print("  - Run with --display to see the questions")
        print("  - Run with --play to play an interactive game")
        print(f"  - Questions saved to: output/sample_questions.csv")

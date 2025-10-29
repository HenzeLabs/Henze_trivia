"""
Time-Based Chaos Question Generator
Generates trivia about late-night messages, weekend patterns, and timing behaviors.
"""

import os
import pandas as pd
import random
from datetime import datetime, time
from openai import OpenAI
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Known participants
PARTICIPANTS = ["Lauren", "Benny Harris", "Ian O'Malley", "Gina Ortiz", "Jackson"]


def load_chat_data(csv_path="~/Projects/henze-trivia/output/chat_export.csv"):
    """Load chat messages from CSV file."""
    csv_path = os.path.expanduser(csv_path)
    df = pd.read_csv(csv_path)
    
    # Parse timestamps
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    # Extract time components
    df['hour'] = df['timestamp'].dt.hour
    df['day_of_week'] = df['timestamp'].dt.day_name()
    df['is_weekend'] = df['timestamp'].dt.dayofweek.isin([5, 6])  # Saturday=5, Sunday=6
    
    print(f"📥 Loaded {len(df)} messages with timestamp data")
    return df


def analyze_chaos_hours(messages_df):
    """
    Identify late-night (11pm-5am) messaging patterns.
    
    Returns:
        Dict with chaos hour statistics
    """
    # Define chaos hours: 11pm (23:00) to 5am (5:00)
    chaos_messages = messages_df[
        (messages_df['hour'] >= 23) | (messages_df['hour'] < 5)
    ].copy()
    
    total_messages = len(messages_df)
    chaos_count = len(chaos_messages)
    chaos_percentage = (chaos_count / total_messages * 100) if total_messages > 0 else 0
    
    # Chaos by person
    chaos_by_person = chaos_messages.groupby('sender').size().sort_values(ascending=False)
    
    # Most chaotic hour
    hourly_counts = chaos_messages.groupby('hour').size()
    most_chaotic_hour = hourly_counts.idxmax() if not hourly_counts.empty else None
    
    # Weekend vs weekday chaos
    weekend_chaos = chaos_messages[chaos_messages['is_weekend']].shape[0]
    weekday_chaos = chaos_messages[~chaos_messages['is_weekend']].shape[0]
    
    stats = {
        'total_chaos_messages': chaos_count,
        'chaos_percentage': chaos_percentage,
        'chaos_by_person': chaos_by_person.to_dict(),
        'most_chaotic_hour': most_chaotic_hour,
        'weekend_chaos': weekend_chaos,
        'weekday_chaos': weekday_chaos
    }
    
    print(f"\n📊 Chaos Hour Analysis:")
    print(f"  • Total late-night messages: {chaos_count} ({chaos_percentage:.1f}%)")
    print(f"  • Most active chaos hour: {most_chaotic_hour}:00")
    print(f"  • Weekend chaos: {weekend_chaos} | Weekday chaos: {weekday_chaos}")
    print(f"  • Chaos champion: {chaos_by_person.index[0]} ({chaos_by_person.iloc[0]} messages)")
    
    return stats, chaos_messages


def analyze_weekend_patterns(messages_df):
    """
    Analyze weekend vs weekday messaging patterns.
    
    Returns:
        Dict with weekend statistics
    """
    weekend_messages = messages_df[messages_df['is_weekend']]
    weekday_messages = messages_df[~messages_df['is_weekend']]
    
    # Messages by day of week
    day_counts = messages_df.groupby('day_of_week').size()
    
    # Weekend warriors (most active on weekends)
    weekend_by_person = weekend_messages.groupby('sender').size().sort_values(ascending=False)
    
    stats = {
        'weekend_total': len(weekend_messages),
        'weekday_total': len(weekday_messages),
        'day_counts': day_counts.to_dict(),
        'weekend_by_person': weekend_by_person.to_dict(),
        'most_active_day': day_counts.idxmax() if not day_counts.empty else None
    }
    
    print(f"\n📅 Weekend Pattern Analysis:")
    print(f"  • Weekend messages: {len(weekend_messages)}")
    print(f"  • Weekday messages: {len(weekday_messages)}")
    print(f"  • Most active day: {stats['most_active_day']}")
    
    return stats, weekend_messages


def generate_chaos_questions(messages_df, chaos_stats, num_questions=10):
    """
    Generate trivia questions about timing patterns.
    
    Args:
        messages_df: DataFrame with all messages
        chaos_stats: Statistics about chaos hours
        num_questions: Number of questions to generate
    
    Returns:
        List of trivia questions
    """
    questions = []
    
    # Question 1: Who sends the most late-night messages?
    chaos_leader = list(chaos_stats['chaos_by_person'].keys())[0]
    chaos_count = chaos_stats['chaos_by_person'][chaos_leader]
    
    # Ensure correct answer is in options
    options = PARTICIPANTS.copy()
    if chaos_leader not in options:
        options.append(chaos_leader)
    random.shuffle(options)
    # Make sure correct answer is definitely included
    if chaos_leader not in options[:4]:
        options[3] = chaos_leader
    options_dict = {chr(65+i): p for i, p in enumerate(options[:4])}
    correct = [k for k, v in options_dict.items() if v == chaos_leader][0]
    
    questions.append({
        "question": f"Who has sent the most late-night messages (11pm-5am) with {chaos_count} chaos messages?",
        "options": options_dict,
        "correct_answer": correct,
        "explanation": f"{chaos_leader} is the undisputed chaos champion with {chaos_count} late-night messages!",
        "difficulty": "medium",
        "category": "Chaos Hours"
    })
    
    # Question 2: What percentage of messages are sent during chaos hours?
    correct_pct = round(chaos_stats['chaos_percentage'])
    wrong_options = [correct_pct + random.choice([-15, -10, -5, 5, 10, 15]) for _ in range(3)]
    all_opts = [f"{correct_pct}%"] + [f"{x}%" for x in wrong_options]
    random.shuffle(all_opts)
    
    options_dict = {chr(65+i): opt for i, opt in enumerate(all_opts)}
    correct = [k for k, v in options_dict.items() if v == f"{correct_pct}%"][0]
    
    questions.append({
        "question": "What percentage of all messages were sent during chaos hours (11pm-5am)?",
        "options": options_dict,
        "correct_answer": correct,
        "explanation": f"{correct_pct}% of messages happened in the chaos hours. The night owls are real!",
        "difficulty": "hard",
        "category": "Chaos Hours"
    })
    
    # Question 3: Most chaotic hour
    if chaos_stats['most_chaotic_hour'] is not None:
        hour = chaos_stats['most_chaotic_hour']
        hour_12 = hour if hour <= 12 else hour - 12
        ampm = "AM" if hour < 12 else "PM"
        
        correct_time = f"{hour_12}{ampm}"
        
        # Generate wrong times in the chaos window
        wrong_hours = [23, 0, 1, 2, 3, 4]
        wrong_hours = [h for h in wrong_hours if h != hour]
        random.shuffle(wrong_hours)
        
        wrong_options = []
        for h in wrong_hours[:3]:
            h_12 = h if h <= 12 else h - 12
            if h_12 == 0:
                h_12 = 12
            h_ampm = "AM" if h < 12 else "PM"
            wrong_options.append(f"{h_12}{h_ampm}")
        
        all_opts = [correct_time] + wrong_options
        random.shuffle(all_opts)
        
        options_dict = {chr(65+i): opt for i, opt in enumerate(all_opts)}
        correct = [k for k, v in options_dict.items() if v == correct_time][0]
        
        questions.append({
            "question": "What is the single most active hour for late-night messaging?",
            "options": options_dict,
            "correct_answer": correct,
            "explanation": f"{correct_time} is peak chaos time in this group chat!",
            "difficulty": "hard",
            "category": "Chaos Hours"
        })
    
    # Question 4: Weekend vs Weekday chaos
    weekend_chaos_pct = round((chaos_stats['weekend_chaos'] / (chaos_stats['weekend_chaos'] + chaos_stats['weekday_chaos'])) * 100)
    
    question_text = "Are more late-night messages sent on weekends or weekdays?"
    if weekend_chaos_pct > 50:
        correct_answer_text = f"Weekends ({weekend_chaos_pct}%)"
        wrong_answer_text = f"Weekdays ({100-weekend_chaos_pct}%)"
    else:
        correct_answer_text = f"Weekdays ({100-weekend_chaos_pct}%)"
        wrong_answer_text = f"Weekends ({weekend_chaos_pct}%)"
    
    all_opts = [correct_answer_text, wrong_answer_text, "Equal", "No late-night messages"]
    random.shuffle(all_opts)
    
    options_dict = {chr(65+i): opt for i, opt in enumerate(all_opts)}
    correct = [k for k, v in options_dict.items() if v == correct_answer_text][0]
    
    questions.append({
        "question": question_text,
        "options": options_dict,
        "correct_answer": correct,
        "explanation": f"{correct_answer_text.split('(')[0].strip()} have more chaos!",
        "difficulty": "medium",
        "category": "Chaos Hours"
    })
    
    # Question 5-10: Use OpenAI to generate creative timing questions
    if num_questions > 4:
        chaos_messages = messages_df[(messages_df['hour'] >= 23) | (messages_df['hour'] < 5)]
        
        # Sample some chaos messages
        sample = chaos_messages.sample(n=min(20, len(chaos_messages)))
        context = "\n".join([
            f"{row['sender']} at {row['hour']}:00 on {row['day_of_week']}: {row['text']}"
            for _, row in sample.iterrows()
            if pd.notna(row['text'])
        ])
        
        prompt = f"""Based on these late-night drunk-texting chaos messages, generate {num_questions - 4} SAVAGE trivia questions about timing patterns.

Messages (3AM chaos energy):
{context}

Available participants: {', '.join(PARTICIPANTS)}

Create questions about:
- Who's the drunk texting champion at 3AM
- What cursed topics get discussed when everyone should be asleep
- Weekend vs weekday chaos behavior (drag them)
- Who's most talkative on specific days (call out their patterns)

TONE REQUIREMENTS:
- ABSOLUTELY SAVAGE - drag people for their sleep schedule
- Use cuss words naturally
- Get unhinged about their 3AM energy
- Make wrong answers funny too
- Use 2025 slang

Example SAVAGE question:
Q: Who sends the most unhinged drunk texts at 3AM like they don't have a job tomorrow?
A) Benny "Sleep is for the weak" Harris ✓
B) Ian "Actually goes to bed" O'Malley
C) Gina "Has work boundaries" Ortiz  
D) Jackson "Ghost after 10pm"

Return a JSON array with this format:
[
  {{
    "question": "savage question text",
    "options": {{"A": "option", "B": "option", "C": "option", "D": "option"}},
    "correct_answer": "A",
    "explanation": "roasty explanation",
    "difficulty": "easy/medium/hard",
    "category": "Chaos Hours"
  }}
]

Return ONLY the JSON array, no other text."""

        try:
            print(f"\n🤖 Generating {num_questions - 4} savage timing questions...")
            
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a SAVAGE roaster who drags people for their terrible sleep schedules and 3AM texting habits. Use cuss words. Get unhinged. Make it absolutely chaotic."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.9,
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
            
            ai_questions = json.loads(content)
            questions.extend(ai_questions)
            print(f"✅ Generated {len(ai_questions)} AI questions!")
            
        except Exception as e:
            print(f"⚠️  Error generating AI questions: {e}")
    
    print(f"\n✅ Generated {len(questions)} total chaos questions")
    return questions[:num_questions]


def save_questions(questions, output_path="~/Projects/henze-trivia/output/chaos_questions.csv"):
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
    
    parser = argparse.ArgumentParser(description="Generate time-based chaos trivia questions")
    parser.add_argument("--num", type=int, default=10, help="Number of questions to generate")
    parser.add_argument("--display", action="store_true", help="Display generated questions")
    
    args = parser.parse_args()
    
    print("🕐 Time-Based Chaos Question Generator")
    print("="*60)
    
    # Load chat data
    messages_df = load_chat_data()
    
    # Analyze chaos patterns
    chaos_stats, chaos_messages = analyze_chaos_hours(messages_df)
    weekend_stats, weekend_messages = analyze_weekend_patterns(messages_df)
    
    # Generate questions
    questions = generate_chaos_questions(messages_df, chaos_stats, num_questions=args.num)
    
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
    
    print(f"\n✅ Successfully generated {len(questions)} chaos timing questions!")

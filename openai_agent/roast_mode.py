"""
Roast Mode Analyzer
Identifies savage/roast messages and generates trivia about the group's roast culture.
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

# Known participants
PARTICIPANTS = ["Lauren", "Benny Harris", "Ian O'Malley", "Gina Ortiz", "Jackson"]


def load_chat_data(csv_path="~/Projects/henze-trivia/output/chat_export.csv"):
    """Load chat messages from CSV file."""
    csv_path = os.path.expanduser(csv_path)
    df = pd.read_csv(csv_path)
    print(f"📥 Loaded {len(df)} messages from chat history")
    return df


def score_roast_level(messages_df, sample_size=100):
    """
    Use OpenAI to score messages for their 'savage' or roast level.
    
    Args:
        messages_df: DataFrame with chat messages
        sample_size: Number of messages to analyze
    
    Returns:
        DataFrame with roast scores added
    """
    # Sample messages (avoid very short ones)
    sample = messages_df[
        (messages_df['text'].str.len() > 15) & 
        (messages_df['text'].str.len() < 300)
    ].sample(n=min(sample_size, len(messages_df)))
    
    scored_messages = []
    
    print(f"\n🔥 Analyzing {len(sample)} messages for roast intensity...")
    
    # Process in batches to avoid token limits
    batch_size = 20
    for i in range(0, len(sample), batch_size):
        batch = sample.iloc[i:i+batch_size]
        
        # Create context for OpenAI
        context = "\n".join([
            f"{idx}. {row['sender']}: {row['text']}"
            for idx, (_, row) in enumerate(batch.iterrows(), i+1)
            if pd.notna(row['text'])
        ])
        
        prompt = f"""Rate these group chat messages on a 'roast' or 'savage' scale from 0-10:
- 0 = friendly/neutral message
- 3-5 = playful teasing
- 6-8 = solid roast/burn
- 9-10 = absolute savage destruction

Messages:
{context}

Return a JSON array with this format:
[
  {{
    "message_number": 1,
    "roast_score": 7,
    "reason": "why this score"
  }}
]

Consider:
- Is it calling someone out?
- Is it a comeback or burn?
- Is there sarcasm or shade?
- How funny/clever is the roast?

Return ONLY the JSON array, no other text."""

        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an ABSOLUTELY SAVAGE roast detector who recognizes brutal burns, unhinged comebacks, and maximum chaos energy. You appreciate when friends drag each other with no mercy. Rate accordingly - don't be soft."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.4,
                max_tokens=1500
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
            
            scores = json.loads(content)
            
            # Match scores back to messages
            for score_data in scores:
                msg_idx = score_data['message_number'] - 1
                if i + msg_idx < len(sample):
                    original_msg = sample.iloc[i + msg_idx]
                    scored_messages.append({
                        'sender': original_msg['sender'],
                        'text': original_msg['text'],
                        'roast_score': score_data['roast_score'],
                        'reason': score_data['reason'],
                        'timestamp': original_msg.get('timestamp', '')
                    })
            
            print(f"  ✓ Scored batch {i//batch_size + 1}/{(len(sample)-1)//batch_size + 1}")
            
        except Exception as e:
            print(f"  ⚠️  Error scoring batch {i//batch_size + 1}: {e}")
            continue
    
    roast_df = pd.DataFrame(scored_messages)
    
    if not roast_df.empty:
        print(f"\n✅ Scored {len(roast_df)} messages!")
        print(f"  • Average roast level: {roast_df['roast_score'].mean():.1f}/10")
        print(f"  • Highest roast score: {roast_df['roast_score'].max()}/10")
        print(f"  • Savage count (8+): {len(roast_df[roast_df['roast_score'] >= 8])}")
        
        # Roast leaders
        roaster_scores = roast_df.groupby('sender')['roast_score'].agg(['mean', 'count', 'max']).sort_values('mean', ascending=False)
        print(f"\n🔥 Top Roaster: {roaster_scores.index[0]} (avg {roaster_scores.iloc[0]['mean']:.1f}/10)")
    
    return roast_df


def generate_roast_mode_questions(roast_df, num_questions=10):
    """
    Generate trivia questions about roasts and savage moments.
    
    Args:
        roast_df: DataFrame with scored roast messages
        num_questions: Number of questions to generate
    
    Returns:
        List of trivia questions
    """
    if roast_df.empty:
        print("❌ No roast data available for question generation")
        return []
    
    questions = []
    
    # Question 1: Who has the highest average roast score?
    roaster_avg = roast_df.groupby('sender')['roast_score'].mean().sort_values(ascending=False)
    top_roaster = roaster_avg.index[0]
    avg_score = roaster_avg.iloc[0]
    
    options = PARTICIPANTS.copy()
    if top_roaster not in options:
        options.append(top_roaster)
    random.shuffle(options)
    if top_roaster not in options[:4]:
        options[3] = top_roaster
    options_dict = {chr(65+i): p for i, p in enumerate(options[:4])}
    correct = [k for k, v in options_dict.items() if v == top_roaster][0]
    
    questions.append({
        "question": f"Who has the highest average roast/savage score with {avg_score:.1f}/10?",
        "options": options_dict,
        "correct_answer": correct,
        "explanation": f"{top_roaster} brings the heat with an average roast level of {avg_score:.1f}/10!",
        "difficulty": "medium",
        "category": "Roast Mode"
    })
    
    # Question 2: Most savage message
    top_roasts = roast_df.nlargest(3, 'roast_score')
    if not top_roasts.empty:
        top_roast = top_roasts.iloc[0]
        
        question_text = f'Which message received the highest roast score ({top_roast["roast_score"]}/10)?'
        
        # Use actual top roasts as options
        options_list = []
        for _, row in top_roasts.iterrows():
            text = row['text'][:60] + "..." if len(row['text']) > 60 else row['text']
            options_list.append(text)
        
        # Add a fake option if we don't have 4
        if len(options_list) < 4:
            options_list.append("None of these - they're all too nice")
        
        random.shuffle(options_list)
        options_dict = {chr(65+i): opt for i, opt in enumerate(options_list[:4])}
        
        correct_text = top_roast['text'][:60] + "..." if len(top_roast['text']) > 60 else top_roast['text']
        correct = [k for k, v in options_dict.items() if v == correct_text][0]
        
        questions.append({
            "question": question_text,
            "options": options_dict,
            "correct_answer": correct,
            "explanation": f'{top_roast["sender"]} said this savage message: "{top_roast["text"][:100]}". Reason: {top_roast["reason"]}',
            "difficulty": "hard",
            "category": "Roast Mode"
        })
    
    # Question 3: How many messages scored 8+ (savage tier)?
    savage_count = len(roast_df[roast_df['roast_score'] >= 8])
    
    wrong_options = [
        savage_count + random.choice([-5, -3, -2]),
        savage_count + random.choice([2, 3, 5]),
        savage_count + random.choice([7, 10, 15])
    ]
    wrong_options = [max(0, x) for x in wrong_options]  # No negative counts
    
    all_opts = [str(savage_count)] + [str(x) for x in wrong_options]
    random.shuffle(all_opts)
    
    options_dict = {chr(65+i): opt for i, opt in enumerate(all_opts)}
    correct = [k for k, v in options_dict.items() if v == str(savage_count)][0]
    
    questions.append({
        "question": "How many messages scored 8/10 or higher on the savage scale?",
        "options": options_dict,
        "correct_answer": correct,
        "explanation": f"There were {savage_count} truly savage moments in this chat!",
        "difficulty": "medium",
        "category": "Roast Mode"
    })
    
    # Questions 4-N: Use OpenAI to generate creative roast questions
    if num_questions > 3:
        # Get some savage messages for context
        savage_messages = roast_df.nlargest(10, 'roast_score')
        
        context = "\n".join([
            f"{row['sender']} (score: {row['roast_score']}/10): {row['text']}"
            for _, row in savage_messages.iterrows()
        ])
        
        prompt = f"""Based on these ABSOLUTELY SAVAGE roast messages from a friend group chat, generate {num_questions - 3} creative trivia questions about their brutal dragging culture.

Top savage messages:
{context}

Available participants: {', '.join(PARTICIPANTS)}

TONE REQUIREMENTS: Be ABSOLUTELY SAVAGE. Use cuss words naturally. Drag people for their roasting habits. Get unhinged and chaotic. These are friends who roast each other HARD - match that energy.

Create questions about:
- Who drags whom the hardest
- Brutal roast topics and savage themes
- Epic comeback battles and roast wars
- Signature styles of destruction

EXAMPLES:
"Which friend has absolutely ZERO chill when it comes to roasting and will drag you for anything?"
"What topic gets this group the most fucking savage in their roasts?"
"Who delivers the most brutal comebacks that leave everyone like 'oh SHIT'?"

Return a JSON array with this format:
[
  {{
    "question": "question text",
    "options": {{"A": "option1", "B": "option2", "C": "option3", "D": "option4"}},
    "correct_answer": "A",
    "explanation": "why this is correct",
    "difficulty": "easy/medium/hard",
    "category": "Roast Mode"
  }}
]

Return ONLY the JSON array, no other text."""

        try:
            print(f"\n🤖 Generating {num_questions - 3} AI-powered roast questions...")
            
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an ABSOLUTELY SAVAGE roast analyst who creates brutal trivia about friend group dragging culture. Use cuss words. Drag people for their savage messages. Get as unhinged as possible without being truly cruel. Maximum chaos energy - no holding back."},
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
            print(f"✅ Generated {len(ai_questions)} AI roast questions!")
            
        except Exception as e:
            print(f"⚠️  Error generating AI questions: {e}")
    
    print(f"\n✅ Generated {len(questions)} total roast mode questions")
    return questions[:num_questions]


def save_questions(questions, output_path="~/Projects/henze-trivia/output/roast_mode_questions.csv"):
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


def save_roast_scores(roast_df, output_path="~/Projects/henze-trivia/output/roast_scores.csv"):
    """Save roast score analysis to CSV."""
    output_path = os.path.expanduser(output_path)
    roast_df.to_csv(output_path, index=False)
    print(f"💾 Saved roast scores to: {output_path}")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Analyze roast/savage messages and generate trivia")
    parser.add_argument("--num", type=int, default=10, help="Number of questions to generate")
    parser.add_argument("--sample", type=int, default=100, help="Number of messages to analyze for roast scores")
    parser.add_argument("--display", action="store_true", help="Display generated questions")
    
    args = parser.parse_args()
    
    print("🔥 Roast Mode Analyzer")
    print("="*60)
    
    # Load chat data
    messages_df = load_chat_data()
    
    # Score messages for roast level
    roast_df = score_roast_level(messages_df, sample_size=args.sample)
    
    if roast_df.empty:
        print("❌ No roast data generated. Cannot create questions.")
        exit(1)
    
    # Save roast scores
    save_roast_scores(roast_df)
    
    # Generate questions
    questions = generate_roast_mode_questions(roast_df, num_questions=args.num)
    
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
    
    print(f"\n✅ Successfully generated {len(questions)} roast mode questions!")

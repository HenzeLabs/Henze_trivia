#!/usr/bin/env python3
"""
Combine all trivia questions into one master CSV file
- Your savage group chat questions
- General trivia from Open Trivia DB
- Mix them together with configurable ratios
"""

import csv
import os
import random

def load_csv(filepath):
    """Load questions from CSV"""
    questions = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                questions.append(row)
        print(f"✓ Loaded {len(questions)} questions from {os.path.basename(filepath)}")
    except Exception as e:
        print(f"❌ Error loading {filepath}: {e}")
    return questions

def combine_questions(group_chat_questions, general_questions, group_ratio=0.4):
    """
    Combine questions with specified ratio

    Args:
        group_chat_questions: Your friend group questions
        general_questions: General/pop culture questions
        group_ratio: Ratio of group chat questions (0.0 to 1.0)
    """
    total = len(group_chat_questions) + len(general_questions)

    # Calculate how many of each type
    num_group = int(total * group_ratio)
    num_general = total - num_group

    # Sample randomly
    selected_group = random.sample(group_chat_questions, min(num_group, len(group_chat_questions)))
    selected_general = random.sample(general_questions, min(num_general, len(general_questions)))

    # Combine and shuffle
    combined = selected_group + selected_general
    random.shuffle(combined)

    return combined

def save_csv(questions, filepath):
    """Save questions to CSV"""
    if not questions:
        print("❌ No questions to save")
        return

    fieldnames = ['question', 'correct_answer', 'explanation', 'difficulty', 'category',
                  'option_A', 'option_B', 'option_C', 'option_D']

    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(questions)

    print(f"💾 Saved {len(questions)} questions to {filepath}")

def main():
    print("="*70)
    print("COMBINE ALL TRIVIA QUESTIONS")
    print("="*70)

    base_path = '/Users/laurenadmin/Projects/henze-trivia/output'

    # Load all question sources
    print("\n📥 LOADING QUESTIONS")
    print("-"*70)

    # Your savage group chat questions
    group_chat = load_csv(f'{base_path}/all_trivia_questions.csv')

    # General trivia
    general = load_csv(f'{base_path}/general_trivia_questions.csv')

    print(f"\nTotal available:")
    print(f"  Group chat questions: {len(group_chat)}")
    print(f"  General trivia: {len(general)}")

    # Create different mixes
    print("\n\n🎲 CREATING QUESTION PACKS")
    print("-"*70)

    # Mix 1: 60% group chat, 40% general (savage mode)
    print("\n📦 Pack 1: SAVAGE MODE (60% group, 40% general)")
    savage_pack = combine_questions(group_chat, general, group_ratio=0.6)
    save_csv(savage_pack, f'{base_path}/pack_savage_mode.csv')

    # Mix 2: 40% group chat, 60% general (balanced)
    print("\n📦 Pack 2: BALANCED (40% group, 60% general)")
    balanced_pack = combine_questions(group_chat, general, group_ratio=0.4)
    save_csv(balanced_pack, f'{base_path}/pack_balanced.csv')

    # Mix 3: 20% group chat, 80% general (mild roast)
    print("\n📦 Pack 3: MILD ROAST (20% group, 80% general)")
    mild_pack = combine_questions(group_chat, general, group_ratio=0.2)
    save_csv(mild_pack, f'{base_path}/pack_mild_roast.csv')

    # Mix 4: All questions shuffled together
    print("\n📦 Pack 4: EVERYTHING (all questions)")
    all_pack = group_chat + general
    random.shuffle(all_pack)
    save_csv(all_pack, f'{base_path}/pack_everything.csv')

    # Summary
    print("\n\n" + "="*70)
    print("SUMMARY")
    print("="*70)
    print(f"\n✅ Created 4 question packs:")
    print(f"   1. pack_savage_mode.csv ({len(savage_pack)} questions)")
    print(f"   2. pack_balanced.csv ({len(balanced_pack)} questions)")
    print(f"   3. pack_mild_roast.csv ({len(mild_pack)} questions)")
    print(f"   4. pack_everything.csv ({len(all_pack)} questions)")

    print(f"\n💡 Use these packs in your trivia game!")
    print(f"   - For max chaos: pack_savage_mode.csv")
    print(f"   - For mixed fun: pack_balanced.csv")
    print(f"   - For safe play: pack_mild_roast.csv")

if __name__ == '__main__':
    main()

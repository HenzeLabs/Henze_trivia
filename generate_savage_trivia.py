#!/usr/bin/env python3
"""
Generate SAVAGE and RUDE trivia questions from message analysis
For when you want the tea to be PIPING HOT ☕
"""

import csv
import os
import random
from collections import defaultdict, Counter

class SavageTriviaGenerator:
    def __init__(self, output_dir):
        self.output_dir = output_dir
        self.all_messages = []
        self.name_map = {
            '+18034976579': 'Benny',
            '+19109295033': 'Gina',
            '+14046410104': 'Ian',
            '+14042779131': 'Shan',
            '+18438134613': 'Carrah',
            '+14782784676': 'Jackson',
            'Lauren': 'Lauren'
        }

    def load_messages(self):
        """Load all messages"""
        csv_files = [f for f in os.listdir(self.output_dir) if f.endswith('.csv')]

        for filename in csv_files:
            filepath = os.path.join(self.output_dir, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        sender = self.name_map.get(row.get('sender', ''), row.get('sender', ''))
                        message = row.get('message', '').strip('"')

                        if message and message != 'None':
                            self.all_messages.append({
                                'sender': sender,
                                'message': message,
                                'time': row.get('time', ''),
                                'source': filename
                            })
            except Exception as e:
                print(f"Error reading {filename}: {e}")

    def generate_savage_questions(self):
        """Generate savage AF questions"""
        questions = []

        # Find savage quotes
        savage_keywords = ['fuck', 'shit', 'ass', 'bitch', 'damn', 'hell', 'wtf', 'gay']
        savage_quotes = []

        for msg in self.all_messages:
            text_lower = msg['message'].lower()

            # Must contain savage word
            if any(word in text_lower for word in savage_keywords):
                # Not just a reaction
                if not any(r in text_lower for r in ['loved', 'laughed at', 'liked', 'emphasized', 'questioned']):
                    # Good length
                    if 20 <= len(msg['message']) <= 150:
                        savage_quotes.append(msg)

        # Limit to 2 per person for diversity
        quote_counts = Counter()
        selected_quotes = []

        for quote in savage_quotes:
            if quote_counts[quote['sender']] < 3 and len(selected_quotes) < 30:
                selected_quotes.append(quote)
                quote_counts[quote['sender']] += 1

        # Generate "Who Said It" questions
        all_senders = list(set([m['sender'] for m in self.all_messages if m['sender'] in self.name_map.values()]))

        for quote_data in selected_quotes[:25]:
            options = [quote_data['sender']]
            other_senders = [s for s in all_senders if s != quote_data['sender']]
            random.shuffle(other_senders)
            options.extend(other_senders[:3])
            random.shuffle(options)

            quote_text = quote_data['message'][:120]
            if len(quote_data['message']) > 120:
                quote_text += '...'

            questions.append({
                'question': f'Who said: "{quote_text}"?',
                'correct_answer': chr(65 + options.index(quote_data['sender'])),
                'explanation': f'{quote_data["sender"]} said this savage line!',
                'difficulty': 'hard',
                'category': 'Savage Quotes',
                'option_A': options[0],
                'option_B': options[1],
                'option_C': options[2],
                'option_D': options[3],
            })

        # Behavior-based savage questions
        questions.extend(self._generate_behavior_questions())

        return questions

    def _generate_behavior_questions(self):
        """Generate savage behavior-based questions"""
        questions = []

        # Track behaviors
        behaviors = {
            'curse_words': defaultdict(int),
            'late_night': defaultdict(int),
            'fuck_mentions': defaultdict(int),
            'gay_mentions': defaultdict(int),
            'complaining': defaultdict(int),
            'kroger_hate': defaultdict(int),
            'drunk_texts': defaultdict(int)
        }

        for msg in self.all_messages:
            sender = msg['sender']
            text = msg['message'].lower()

            # Count curse words
            curse_count = sum([
                text.count('fuck'), text.count('shit'),
                text.count('ass'), text.count('bitch'),
                text.count('damn')
            ])
            behaviors['curse_words'][sender] += curse_count

            # Specific tracking
            if 'fuck' in text:
                behaviors['fuck_mentions'][sender] += 1
            if 'gay' in text:
                behaviors['gay_mentions'][sender] += 1
            if 'kroger' in text:
                behaviors['kroger_hate'][sender] += 1
            if any(w in text for w in ['passed out', 'drunk', 'wasted', 'fucked up']):
                behaviors['drunk_texts'][sender] += 1

            # Late night messages (12am-6am)
            try:
                time_str = msg['time']
                if 'AM' in time_str:
                    hour = int(time_str.split()[1].split(':')[0])
                    if hour <= 6 or hour == 12:
                        behaviors['late_night'][sender] += 1
            except:
                pass

        # Generate questions from behaviors
        all_senders = list(set([m['sender'] for m in self.all_messages if m['sender'] in self.name_map.values()]))

        # Biggest potty mouth
        if behaviors['curse_words']:
            potty_mouth = max(behaviors['curse_words'], key=behaviors['curse_words'].get)
            count = behaviors['curse_words'][potty_mouth]

            options = list(all_senders[:4])
            random.shuffle(options)

            questions.append({
                'question': 'Who has the filthiest mouth and curses the most?',
                'correct_answer': chr(65 + options.index(potty_mouth)),
                'explanation': f'{potty_mouth} dropped {count} curse words! Wash that mouth out!',
                'difficulty': 'easy',
                'category': 'Savage Stats',
                'option_A': options[0],
                'option_B': options[1],
                'option_C': options[2],
                'option_D': options[3],
            })

        # Most "fuck" drops
        if behaviors['fuck_mentions']:
            fuck_king = max(behaviors['fuck_mentions'], key=behaviors['fuck_mentions'].get)
            count = behaviors['fuck_mentions'][fuck_king]

            options = list(all_senders[:4])
            random.shuffle(options)

            questions.append({
                'question': 'Who says "fuck" the most in the group chat?',
                'correct_answer': chr(65 + options.index(fuck_king)),
                'explanation': f'{fuck_king} said "fuck" {count} times! That\'s a lot of fucks given!',
                'difficulty': 'medium',
                'category': 'Savage Stats',
                'option_A': options[0],
                'option_B': options[1],
                'option_C': options[2],
                'option_D': options[3],
            })

        # Night owl
        if behaviors['late_night']:
            night_owl = max(behaviors['late_night'], key=behaviors['late_night'].get)
            count = behaviors['late_night'][night_owl]

            options = list(all_senders[:4])
            random.shuffle(options)

            questions.append({
                'question': 'Who\'s the biggest insomniac, texting at ungodly hours?',
                'correct_answer': chr(65 + options.index(night_owl)),
                'explanation': f'{night_owl} sent {count} messages between midnight and 6 AM. Sleep is for the weak!',
                'difficulty': 'medium',
                'category': 'Savage Stats',
                'option_A': options[0],
                'option_B': options[1],
                'option_C': options[2],
                'option_D': options[3],
            })

        # Kroger hater
        if behaviors['kroger_hate']:
            kroger_hater = max(behaviors['kroger_hate'], key=behaviors['kroger_hate'].get)

            options = list(all_senders[:4])
            random.shuffle(options)

            questions.append({
                'question': 'Who has beef with Kroger and won\'t shut up about it?',
                'correct_answer': chr(65 + options.index(kroger_hater)),
                'explanation': f'{kroger_hater} has a toxic relationship with Kroger!',
                'difficulty': 'easy',
                'category': 'Savage Stats',
                'option_A': options[0],
                'option_B': options[1],
                'option_C': options[2],
                'option_D': options[3],
            })

        # Drunk texts
        if behaviors['drunk_texts']:
            party_animal = max(behaviors['drunk_texts'], key=behaviors['drunk_texts'].get)
            count = behaviors['drunk_texts'][party_animal]

            options = list(all_senders[:4])
            random.shuffle(options)

            questions.append({
                'question': 'Who mentions being drunk, wasted, or fucked up the most?',
                'correct_answer': chr(65 + options.index(party_animal)),
                'explanation': f'{party_animal} knows how to party! Mentioned it {count} times.',
                'difficulty': 'medium',
                'category': 'Savage Stats',
                'option_A': options[0],
                'option_B': options[1],
                'option_C': options[2],
                'option_D': options[3],
            })

        return questions

    def save_to_csv(self, questions, filename):
        """Save to CSV"""
        fieldnames = ['question', 'correct_answer', 'explanation', 'difficulty', 'category',
                      'option_A', 'option_B', 'option_C', 'option_D']

        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(questions)

def main():
    output_dir = '/Users/laurenadmin/Projects/henze-trivia/imessage-analyze-and-export/output'
    generator = SavageTriviaGenerator(output_dir)

    print("Loading messages...")
    generator.load_messages()
    print(f"✓ Loaded {len(generator.all_messages)} messages")

    print("\nGenerating SAVAGE trivia questions...")
    questions = generator.generate_savage_questions()
    print(f"✓ Generated {len(questions)} savage questions")

    print("\nSaving to CSV...")
    output_file = '/Users/laurenadmin/Projects/henze-trivia/output/savage_trivia_questions.csv'
    generator.save_to_csv(questions, output_file)
    print(f"✓ Saved to {output_file}")

    # Preview
    print("\n" + "="*70)
    print("SAVAGE QUESTION PREVIEW 🔥")
    print("="*70)
    for i, q in enumerate(questions[:8]):
        print(f"\nQ{i+1} [{q['category']}] - {q['difficulty'].upper()}")
        print(f"   {q['question']}")
        print(f"   A) {q['option_A']}")
        print(f"   B) {q['option_B']}")
        print(f"   C) {q['option_C']}")
        print(f"   D) {q['option_D']}")
        print(f"   ✓ Answer: {q['correct_answer']} - {q['explanation']}")

if __name__ == '__main__':
    main()

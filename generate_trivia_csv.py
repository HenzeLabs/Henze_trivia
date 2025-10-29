#!/usr/bin/env python3
"""
Generate trivia questions in CSV format from message analysis
Creates questions matching the sample format with accurate, funny content
"""

import csv
import os
import random
from collections import defaultdict, Counter

class TriviaGenerator:
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
        self.stats = defaultdict(lambda: defaultdict(int))

    def load_messages(self):
        """Load all CSV messages"""
        csv_files = [f for f in os.listdir(self.output_dir) if f.endswith('.csv')]

        for filename in csv_files:
            filepath = os.path.join(self.output_dir, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        sender = row.get('sender', '')
                        sender = self.name_map.get(sender, sender)

                        message = row.get('message', '')
                        if message and message != 'None':
                            message = message.strip('"')

                            self.all_messages.append({
                                'sender': sender,
                                'message': message,
                                'time': row.get('time', ''),
                                'source': filename
                            })

                            self.stats[sender]['total_messages'] += 1
            except Exception as e:
                print(f"Error reading {filename}: {e}")

    def generate_questions(self):
        """Generate trivia questions"""
        questions = []

        # Stats-based questions
        questions.extend(self._generate_stat_questions())

        # Who said it questions
        questions.extend(self._generate_quote_questions())

        # Topic-based questions
        questions.extend(self._generate_topic_questions())

        return questions

    def _generate_stat_questions(self):
        """Generate statistics-based questions"""
        questions = []

        # Most messages sent
        sorted_senders = sorted(self.stats.items(), key=lambda x: x[1]['total_messages'], reverse=True)
        most_active = sorted_senders[0][0]
        options = [s[0] for s in sorted_senders[:4]]
        random.shuffle(options)

        questions.append({
            'question': 'Who sent the most text messages overall?',
            'correct_answer': chr(65 + options.index(most_active)),  # A, B, C, or D
            'explanation': f'{most_active} sent {self.stats[most_active]["total_messages"]} messages!',
            'difficulty': 'easy',
            'category': 'Statistics',
            'option_A': options[0] if len(options) > 0 else '',
            'option_B': options[1] if len(options) > 1 else '',
            'option_C': options[2] if len(options) > 2 else '',
            'option_D': options[3] if len(options) > 3 else '',
        })

        return questions

    def _generate_quote_questions(self):
        """Generate 'who said it' questions"""
        questions = []

        # Find interesting quotes
        interesting_quotes = []

        for msg in self.all_messages:
            text = msg['message'].lower()

            # Look for funny/memorable quotes
            if any(word in text for word in ['lmao', 'fuck', 'shit', 'wtf', 'omg', 'gay', 'cranberry', 'bentley']):
                if len(msg['message']) > 30 and len(msg['message']) < 120:
                    if not any(reaction in text for reaction in ['loved', 'laughed at', 'liked', 'emphasized']):
                        interesting_quotes.append(msg)

        # Select diverse quotes (max 2 per person)
        quote_counts = Counter()
        selected_quotes = []

        for quote in interesting_quotes:
            if quote_counts[quote['sender']] < 2 and len(selected_quotes) < 15:
                selected_quotes.append(quote)
                quote_counts[quote['sender']] += 1

        # Create questions from quotes
        for quote_data in selected_quotes[:10]:
            # Create answer options
            all_senders = list(set([m['sender'] for m in self.all_messages if m['sender'] in self.name_map.values()]))
            options = [quote_data['sender']]

            # Add 3 random other senders
            other_senders = [s for s in all_senders if s != quote_data['sender']]
            random.shuffle(other_senders)
            options.extend(other_senders[:3])

            random.shuffle(options)

            # Clean quote
            quote_text = quote_data['message'][:100]
            if len(quote_data['message']) > 100:
                quote_text += '...'

            questions.append({
                'question': f'Who said: "{quote_text}"?',
                'correct_answer': chr(65 + options.index(quote_data['sender'])),
                'explanation': f'{quote_data["sender"]} said this iconic line!',
                'difficulty': 'medium',
                'category': 'Who Said It',
                'option_A': options[0] if len(options) > 0 else '',
                'option_B': options[1] if len(options) > 1 else '',
                'option_C': options[2] if len(options) > 2 else '',
                'option_D': options[3] if len(options) > 3 else '',
            })

        return questions

    def _generate_topic_questions(self):
        """Generate topic-based questions"""
        questions = []

        # Analyze topics
        topics = {
            'dogs': [],
            'trivia': [],
            'pride': [],
            'food': [],
            'work': [],
            'birthday': [],
            'kroger': [],
            'pool': []
        }

        for msg in self.all_messages:
            text = msg['message'].lower()

            if 'cranberry' in text or 'bentley' in text:
                topics['dogs'].append(msg)
            if 'trivia' in text:
                topics['trivia'].append(msg)
            if 'pride' in text or 'gay' in text:
                topics['pride'].append(msg)
            if 'taco' in text or 'pizza' in text or 'food' in text or 'eat' in text:
                topics['food'].append(msg)
            if 'work' in text or 'boss' in text or 'meeting' in text:
                topics['work'].append(msg)
            if 'birthday' in text:
                topics['birthday'].append(msg)
            if 'kroger' in text:
                topics['kroger'].append(msg)
            if 'pool' in text or 'farkle' in text:
                topics['pool'].append(msg)

        # Dog question
        if topics['dogs']:
            dog_mentions = Counter([m['sender'] for m in topics['dogs']])
            dog_lover = dog_mentions.most_common(1)[0][0]

            all_senders = list(self.stats.keys())[:4]
            random.shuffle(all_senders)

            questions.append({
                'question': 'Who talks about dogs (Cranberry/Bentley) the most?',
                'correct_answer': chr(65 + all_senders.index(dog_lover)),
                'explanation': f'{dog_lover} mentioned the dogs {dog_mentions[dog_lover]} times!',
                'difficulty': 'easy',
                'category': 'Interests',
                'option_A': all_senders[0],
                'option_B': all_senders[1],
                'option_C': all_senders[2],
                'option_D': all_senders[3],
            })

        # Kroger rants
        if topics['kroger']:
            kroger_ranter = Counter([m['sender'] for m in topics['kroger']]).most_common(1)[0][0]

            all_senders = list(self.stats.keys())[:4]
            random.shuffle(all_senders)

            questions.append({
                'question': 'Who complains about Kroger the most?',
                'correct_answer': chr(65 + all_senders.index(kroger_ranter)),
                'explanation': f'{kroger_ranter} has strong feelings about Kroger!',
                'difficulty': 'medium',
                'category': 'Personality',
                'option_A': all_senders[0],
                'option_B': all_senders[1],
                'option_C': all_senders[2],
                'option_D': all_senders[3],
            })

        return questions

    def save_to_csv(self, questions, filename):
        """Save questions to CSV file"""
        fieldnames = ['question', 'correct_answer', 'explanation', 'difficulty', 'category',
                      'option_A', 'option_B', 'option_C', 'option_D']

        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(questions)

def main():
    output_dir = '/Users/laurenadmin/Projects/henze-trivia/imessage-analyze-and-export/output'
    generator = TriviaGenerator(output_dir)

    print("Loading messages...")
    generator.load_messages()
    print(f"✓ Loaded {len(generator.all_messages)} messages")

    print("\nGenerating trivia questions...")
    questions = generator.generate_questions()
    print(f"✓ Generated {len(questions)} questions")

    print("\nSaving to CSV...")
    output_file = '/Users/laurenadmin/Projects/henze-trivia/output/generated_trivia_questions.csv'
    generator.save_to_csv(questions, output_file)
    print(f"✓ Saved to {output_file}")

    # Preview questions
    print("\n" + "="*60)
    print("SAMPLE QUESTIONS")
    print("="*60)
    for i, q in enumerate(questions[:5]):
        print(f"\nQ{i+1}: {q['question']}")
        print(f"   A) {q['option_A']}")
        print(f"   B) {q['option_B']}")
        print(f"   C) {q['option_C']}")
        print(f"   D) {q['option_D']}")
        print(f"   Answer: {q['correct_answer']} - {q['explanation']}")

if __name__ == '__main__':
    main()

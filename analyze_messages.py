#!/usr/bin/env python3
"""
Message Analysis Script for Trivia Question Generation
Analyzes exported iMessage CSVs to find patterns, jokes, and memorable moments
"""

import csv
import os
from collections import defaultdict, Counter
from datetime import datetime
import re

class MessageAnalyzer:
    def __init__(self, output_dir):
        self.output_dir = output_dir
        self.all_messages = []
        self.stats = defaultdict(lambda: defaultdict(int))
        self.name_map = {
            '+18034976579': 'Benny',
            '+19109295033': 'Gina',
            '+14046410104': 'Ian',
            '+14042779131': 'Shan',
            '+18438134613': 'Carrah',
            '+14782784676': 'Jackson',
            'Lauren': 'Lauren'
        }

    def load_all_messages(self):
        """Load all CSV files from output directory"""
        csv_files = [f for f in os.listdir(self.output_dir) if f.endswith('.csv')]

        for filename in csv_files:
            filepath = os.path.join(self.output_dir, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        # Clean up sender name
                        sender = row.get('sender', '')
                        sender = self.name_map.get(sender, sender)

                        message = row.get('message', '')
                        if message and message != 'None':
                            # Remove quotes
                            message = message.strip('"')

                            self.all_messages.append({
                                'sender': sender,
                                'message': message,
                                'time': row.get('time', ''),
                                'source': filename
                            })

                            # Track stats
                            self.stats[sender]['total_messages'] += 1
                            self.stats[sender]['total_chars'] += len(message)
            except Exception as e:
                print(f"Error reading {filename}: {e}")

    def analyze_patterns(self):
        """Analyze message patterns for trivia questions"""
        results = {
            'most_active': {},
            'common_phrases': defaultdict(list),
            'emoji_users': defaultdict(int),
            'time_patterns': defaultdict(int),
            'reactions': defaultdict(list),
            'inside_jokes': [],
            'topics': defaultdict(list)
        }

        # Most active users
        for sender, data in self.stats.items():
            results['most_active'][sender] = data['total_messages']

        # Analyze each message
        for msg in self.all_messages:
            sender = msg['sender']
            text = msg['message'].lower()

            # Emoji detection
            emoji_count = len(re.findall(r'[😀-🙏🌀-🗿🚀-🛿]', msg['message']))
            if emoji_count > 0:
                results['emoji_users'][sender] += emoji_count

            # Reactions
            if any(word in text for word in ['loved', 'laughed at', 'liked', 'emphasized', 'questioned', 'reacted']):
                results['reactions'][sender].append(msg['message'])

            # Time of day
            try:
                time_str = msg['time']
                if 'AM' in time_str or 'PM' in time_str:
                    hour = int(time_str.split()[1].split(':')[0])
                    period = 'AM' if 'AM' in time_str else 'PM'

                    if period == 'PM' and hour != 12:
                        hour += 12
                    elif period == 'AM' and hour == 12:
                        hour = 0

                    if hour >= 0 and hour < 6:
                        results['time_patterns'][f'{sender}_late_night'] += 1
                    elif hour >= 6 and hour < 12:
                        results['time_patterns'][f'{sender}_morning'] += 1
                    elif hour >= 12 and hour < 18:
                        results['time_patterns'][f'{sender}_afternoon'] += 1
                    else:
                        results['time_patterns'][f'{sender}_evening'] += 1
            except:
                pass

            # Common topics/phrases
            if 'lmao' in text or 'lmfao' in text or 'haha' in text:
                results['topics']['laughter'].append(sender)
            if 'fuck' in text or 'shit' in text:
                results['topics']['cursing'].append(sender)
            if 'trivia' in text:
                results['topics']['trivia'].append(sender)
            if 'cranberry' in text or 'bentley' in text or 'cb' in text:
                results['topics']['dogs'].append(sender)
            if 'pool' in text or 'farkle' in text:
                results['topics']['games'].append(sender)
            if '1280' in text:
                results['topics']['building'].append(sender)
            if 'work' in text:
                results['topics']['work'].append(sender)
            if 'gay' in text or 'pride' in text:
                results['topics']['pride'].append(sender)

        return results

    def find_memorable_quotes(self, min_length=20, max_length=150):
        """Find funny or memorable quotes"""
        memorable = []

        keywords = [
            'lmao', 'lmfao', 'haha', 'wtf', 'omg',
            'fuck', 'shit', 'damn', 'hell',
            'gay', 'pride', 'trivia', 'cranberry', 'bentley',
            'savage', 'queen', 'iconic', 'loved', 'obsessed'
        ]

        for msg in self.all_messages:
            text = msg['message']
            text_lower = text.lower()

            # Check if it contains interesting keywords
            has_keyword = any(kw in text_lower for kw in keywords)

            # Check length
            good_length = min_length <= len(text) <= max_length

            # Not a reaction
            not_reaction = not any(word in text_lower for word in ['loved', 'laughed at', 'liked', 'emphasized', 'questioned'])

            if has_keyword and good_length and not_reaction:
                memorable.append({
                    'sender': msg['sender'],
                    'quote': text,
                    'source': msg['source']
                })

        return memorable

    def generate_trivia_questions(self, results, memorable_quotes):
        """Generate trivia questions based on analysis"""
        questions = []

        # Question 1: Most active texter
        most_active_sender = max(results['most_active'], key=results['most_active'].get)
        most_active_count = results['most_active'][most_active_sender]

        questions.append({
            'category': 'Statistics',
            'question': f"Who sent the most messages overall in these conversations?",
            'answer': most_active_sender,
            'options': list(results['most_active'].keys())[:4],
            'fun_fact': f"{most_active_sender} sent {most_active_count} messages!"
        })

        # Question 2: Emoji king/queen
        if results['emoji_users']:
            emoji_king = max(results['emoji_users'], key=results['emoji_users'].get)
            emoji_count = results['emoji_users'][emoji_king]

            questions.append({
                'category': 'Emojis',
                'question': f"Who uses the most emojis in their messages?",
                'answer': emoji_king,
                'options': list(results['emoji_users'].keys())[:4],
                'fun_fact': f"{emoji_king} used {emoji_count} emojis!"
            })

        # Question 3: Night owl
        late_night = {k.split('_')[0]: v for k, v in results['time_patterns'].items() if 'late_night' in k}
        if late_night:
            night_owl = max(late_night, key=late_night.get)

            questions.append({
                'category': 'Habits',
                'question': f"Who's most likely to send messages between midnight and 6 AM?",
                'answer': night_owl,
                'options': list(late_night.keys())[:4],
                'fun_fact': f"{night_owl} sent {late_night[night_owl]} late-night messages!"
            })

        # Question 4: Laughter champion
        if 'laughter' in results['topics']:
            laughter_counter = Counter(results['topics']['laughter'])
            laugh_champ = laughter_counter.most_common(1)[0][0]

            questions.append({
                'category': 'Personality',
                'question': f"Who laughs the most in texts (lmao, haha, etc.)?",
                'answer': laugh_champ,
                'options': list(set(results['topics']['laughter']))[:4],
                'fun_fact': f"{laugh_champ} is always laughing!"
            })

        # Question 5: Dog lover
        if 'dogs' in results['topics']:
            dog_lover_counter = Counter(results['topics']['dogs'])
            dog_lover = dog_lover_counter.most_common(1)[0][0]

            questions.append({
                'category': 'Interests',
                'question': f"Who talks about dogs (Cranberry/Bentley) the most?",
                'answer': dog_lover,
                'options': list(set(results['topics']['dogs']))[:4],
                'fun_fact': f"{dog_lover} loves those pups!"
            })

        # Add memorable quote questions
        for i, quote_data in enumerate(memorable_quotes[:5]):  # Top 5 quotes
            questions.append({
                'category': 'Who Said It?',
                'question': f'Who said: "{quote_data["quote"][:100]}..."?',
                'answer': quote_data['sender'],
                'options': list(set([m['sender'] for m in self.all_messages[:20]]))[:4],
                'fun_fact': f'From: {quote_data["source"]}'
            })

        return questions

    def print_report(self):
        """Print analysis report"""
        print("\n" + "="*60)
        print("MESSAGE ANALYSIS REPORT")
        print("="*60)

        print(f"\nTotal messages analyzed: {len(self.all_messages)}")

        print("\n--- MESSAGE COUNTS BY PERSON ---")
        for sender, data in sorted(self.stats.items(), key=lambda x: x[1]['total_messages'], reverse=True):
            avg_length = data['total_chars'] / data['total_messages'] if data['total_messages'] > 0 else 0
            print(f"{sender:15} {data['total_messages']:5} messages (avg {avg_length:.1f} chars)")

        print("\n--- PATTERN ANALYSIS ---")
        results = self.analyze_patterns()

        print("\nTop emoji users:")
        for sender, count in sorted(results['emoji_users'].items(), key=lambda x: x[1], reverse=True)[:5]:
            print(f"  {sender}: {count} emojis")

        print("\nTop topics mentioned:")
        for topic, mentions in results['topics'].items():
            if len(mentions) > 5:
                top_mention = Counter(mentions).most_common(1)[0]
                print(f"  {topic.title()}: {len(mentions)} times (mostly {top_mention[0]})")

        print("\n--- MEMORABLE QUOTES ---")
        memorable = self.find_memorable_quotes()
        for i, quote in enumerate(memorable[:10]):
            print(f"\n{i+1}. {quote['sender']}: {quote['quote'][:100]}...")

        print("\n--- TRIVIA QUESTIONS ---")
        questions = self.generate_trivia_questions(results, memorable)
        for i, q in enumerate(questions[:10]):
            print(f"\nQ{i+1} [{q['category']}]")
            print(f"   {q['question']}")
            print(f"   Answer: {q['answer']}")
            print(f"   {q['fun_fact']}")

        return questions

def main():
    output_dir = '/Users/laurenadmin/Projects/henze-trivia/imessage-analyze-and-export/output'

    analyzer = MessageAnalyzer(output_dir)
    print("Loading messages...")
    analyzer.load_all_messages()

    print("Analyzing patterns...")
    questions = analyzer.print_report()

    # Save questions to file
    print("\n\nSaving questions to trivia_questions.txt...")
    with open('/Users/laurenadmin/Projects/henze-trivia/trivia_questions.txt', 'w') as f:
        f.write("TRIVIA QUESTIONS GENERATED FROM MESSAGE ANALYSIS\n")
        f.write("=" * 60 + "\n\n")
        for i, q in enumerate(questions):
            f.write(f"Question {i+1}: [{q['category']}]\n")
            f.write(f"{q['question']}\n")
            f.write(f"Answer: {q['answer']}\n")
            if 'options' in q:
                f.write(f"Options: {', '.join(q['options'])}\n")
            f.write(f"Fun Fact: {q['fun_fact']}\n")
            f.write("\n" + "-"*60 + "\n\n")

    print("✓ Analysis complete!")
    print(f"✓ {len(questions)} trivia questions generated!")

if __name__ == '__main__':
    main()

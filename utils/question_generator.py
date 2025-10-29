import pandas as pd
import random
from typing import Dict, Any, List

DATA_PATH = "../output/chat_export.csv"

# Load chat data

def load_chat_data(path: str = DATA_PATH) -> pd.DataFrame:
    df = pd.read_csv(path)
    return df

# Generate a "Who said it?" question

def generate_who_said_it(df: pd.DataFrame) -> Dict[str, Any]:
    row = df.sample(1).iloc[0]
    text = row['text']
    correct = row['sender']
    # Get 3 other random names
    all_names = df['sender'].unique().tolist()
    distractors = [n for n in all_names if n != correct]
    options = random.sample(distractors, min(3, len(distractors))) + [correct]
    random.shuffle(options)
    return {
        "type": "who_said_it",
        "question": f"Who said: '{text}'?",
        "options": options,
        "answer": correct,
        "source": row.to_dict()
    }

# Generate a "Which group?" question

def generate_which_group(df: pd.DataFrame) -> Dict[str, Any]:
    row = df.sample(1).iloc[0]
    text = row['text']
    correct = row['group_name']
    all_groups = df['group_name'].unique().tolist()
    distractors = [g for g in all_groups if g != correct]
    options = random.sample(distractors, min(3, len(distractors))) + [correct]
    random.shuffle(options)
    return {
        "type": "which_group",
        "question": f"Which group chat was this message sent in: '{text}'?",
        "options": options,
        "answer": correct,
        "source": row.to_dict()
    }

# Generate a random question

def generate_random_question(df: pd.DataFrame) -> Dict[str, Any]:
    if random.random() < 0.5:
        return generate_who_said_it(df)
    else:
        return generate_which_group(df)

# Example usage
if __name__ == "__main__":
    df = load_chat_data()
    q = generate_random_question(df)
    print(q)

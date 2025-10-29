import os
import sqlite3
import pandas as pd
from datetime import datetime, timedelta
from dotenv import load_dotenv
from utils.mapping import get_name_from_sender

# Load environment variables
load_dotenv()

# Connect to chat.db (iMessage)
# Use CHAT_DB_PATH from .env, or default to project directory copy
chat_db_path = os.getenv("CHAT_DB_PATH", "~/Projects/henze-trivia/chat.db")
chat_db_path = os.path.expanduser(chat_db_path)
print(f"📂 Using database: {chat_db_path}")
print(f"📊 File exists: {os.path.exists(chat_db_path)}")
conn = sqlite3.connect(chat_db_path)

# Get 6 months ago in Mac time
mac_epoch = datetime(2001, 1, 1)
six_months_ago = int((datetime.now() - timedelta(days=180) - mac_epoch).total_seconds())

# Define the specific group chats we want to extract from
TARGET_GROUP_CHATS = [
    'chat217815241574198689',  # 1280 Gang Bang
    'chat622350407157151088',  # It's Only Gay If You Push Back
    'chat113550938249769298',  # Just a Bowl
    'chat519751957783215300',  # OG 1280
    'chat270798461612272489',  # O.G 1280 crew
]

# Query recent messages from specific group chats only
query = f"""
SELECT
    message.date AS date_raw,
    handle.id AS sender,
    message.text,
    chat.display_name AS group_name
FROM
    message
JOIN
    handle ON message.handle_id = handle.ROWID
JOIN
    chat_message_join ON message.ROWID = chat_message_join.message_id
JOIN
    chat ON chat_message_join.chat_id = chat.ROWID
WHERE
    message.text IS NOT NULL
    AND message.date > {six_months_ago}
    AND chat.chat_identifier IN ('{"','".join(TARGET_GROUP_CHATS)}')
ORDER BY
    message.date DESC
LIMIT 5000;
"""

df = pd.read_sql_query(query, conn)

# Convert Mac timestamp to Python datetime
# Mac epoch is 2001-01-01, stored in nanoseconds
mac_epoch = datetime(2001, 1, 1)
df['timestamp'] = df['date_raw'].apply(lambda x: mac_epoch + timedelta(seconds=x/1000000000) if pd.notna(x) else None)
df = df.drop('date_raw', axis=1)

# Reorder columns
df = df[['timestamp', 'sender', 'text', 'group_name']]

# Replace sender IDs with names
df['sender'] = df['sender'].apply(get_name_from_sender)

# Save CSV locally
csv_path = os.path.expanduser("~/Projects/henze-trivia/output/chat_export.csv")
df.to_csv(csv_path, index=False, escapechar='\\', doublequote=True)

# Also save as JSON
json_path = os.path.expanduser("~/Projects/henze-trivia/output/chat_export.json")
df.to_json(json_path, orient='records', lines=True)

print(f"✅ Saved {len(df)} messages locally:")
print(f"   📄 CSV: {csv_path}")
print(f"   📄 JSON: {json_path}")

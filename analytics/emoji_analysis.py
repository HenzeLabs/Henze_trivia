"""
Emoji & Reaction Leaderboard Analyzer
Analyzes emoji usage and reactions from iMessage chat data.
"""

import os
import sqlite3
import pandas as pd
import re
from collections import Counter
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Known participants
PARTICIPANTS = ["Lauren", "Benny Harris", "Ian O'Malley", "Gina Ortiz", "Jackson"]


def extract_emoji_reactions():
    """
    Extract emoji reactions from iMessage database.
    
    Returns:
        DataFrame with reaction data
    """
    chat_db_path = os.getenv("CHAT_DB_PATH", "~/Projects/henze-trivia/chat.db")
    chat_db_path = os.path.expanduser(chat_db_path)
    
    conn = sqlite3.connect(chat_db_path)
    
    # Get 6 months ago in Mac time
    mac_epoch = datetime(2001, 1, 1)
    six_months_ago = int((datetime.now() - timedelta(days=180) - mac_epoch).total_seconds())
    
    # Query reactions (associated_message_type = 2000-2005 are reactions)
    query = f"""
    SELECT
        datetime(message.date + strftime('%s','2001-01-01'), 'unixepoch') AS timestamp,
        handle.id AS reactor,
        message.associated_message_emoji AS emoji,
        message.associated_message_type AS reaction_type,
        target.text AS target_message
    FROM
        message
    JOIN
        handle ON message.handle_id = handle.ROWID
    LEFT JOIN
        message AS target ON message.associated_message_guid = target.guid
    WHERE
        message.associated_message_type >= 2000
        AND message.associated_message_type <= 2005
        AND message.date > {six_months_ago}
    ORDER BY
        message.date DESC
    LIMIT 5000;
    """
    
    reactions_df = pd.read_sql_query(query, conn)
    
    # Map reactor IDs to names
    from utils.mapping import get_name_from_sender
    reactions_df['reactor'] = reactions_df['reactor'].apply(get_name_from_sender)
    
    print(f"📥 Found {len(reactions_df)} reactions in the last 6 months")
    
    conn.close()
    return reactions_df


def extract_emojis_from_messages(csv_path="~/Projects/henze-trivia/output/chat_export.csv"):
    """
    Extract emojis used in message text.
    
    Returns:
        DataFrame with emoji usage data
    """
    csv_path = os.path.expanduser(csv_path)
    df = pd.read_csv(csv_path)
    
    # Regex pattern for emojis
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"  # emoticons
        "\U0001F300-\U0001F5FF"  # symbols & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map symbols
        "\U0001F1E0-\U0001F1FF"  # flags (iOS)
        "\U00002702-\U000027B0"
        "\U000024C2-\U0001F251"
        "\U0001F900-\U0001F9FF"  # supplemental symbols
        "\U0001FA00-\U0001FAFF"  # extended-A
        "]+", flags=re.UNICODE
    )
    
    emoji_usage = []
    
    for _, row in df.iterrows():
        text = str(row['text'])
        emojis = emoji_pattern.findall(text)
        
        for emoji in emojis:
            emoji_usage.append({
                'sender': row['sender'],
                'emoji': emoji,
                'message': text[:100],  # First 100 chars for context
                'timestamp': row.get('timestamp', '')
            })
    
    emoji_df = pd.DataFrame(emoji_usage)
    print(f"📊 Found {len(emoji_df)} emojis in {len(df)} messages")
    
    return emoji_df


def analyze_reaction_patterns(reactions_df):
    """
    Analyze reaction patterns and statistics.
    
    Returns:
        Dict with statistics
    """
    if reactions_df.empty:
        return {}
    
    stats = {}
    
    # Most active reactor
    reactor_counts = reactions_df['reactor'].value_counts()
    stats['most_active_reactor'] = {
        'name': reactor_counts.index[0] if len(reactor_counts) > 0 else None,
        'count': int(reactor_counts.iloc[0]) if len(reactor_counts) > 0 else 0
    }
    
    # Most used reaction emoji
    emoji_counts = reactions_df['emoji'].value_counts()
    stats['most_used_emoji'] = {
        'emoji': emoji_counts.index[0] if len(emoji_counts) > 0 else None,
        'count': int(emoji_counts.iloc[0]) if len(emoji_counts) > 0 else 0
    }
    
    # Reactions by type (love, like, laugh, etc.)
    # Types: 2000=love, 2001=like, 2002=dislike, 2003=laugh, 2004=emphasize, 2005=question
    reaction_type_map = {
        2000: 'Love ❤️',
        2001: 'Like 👍',
        2002: 'Dislike 👎',
        2003: 'Laugh 😂',
        2004: 'Emphasize ‼️',
        2005: 'Question ❓'
    }
    
    reactions_df['reaction_name'] = reactions_df['reaction_type'].map(reaction_type_map)
    type_counts = reactions_df['reaction_name'].value_counts()
    stats['reaction_types'] = type_counts.to_dict()
    
    # Who reacts to whom the most
    reactor_pairs = reactions_df.groupby(['reactor']).size().sort_values(ascending=False)
    
    print("\n📊 Reaction Analysis:")
    print(f"  • Most active reactor: {stats['most_active_reactor']['name']} ({stats['most_active_reactor']['count']} reactions)")
    print(f"  • Most used emoji: {stats['most_used_emoji']['emoji']} ({stats['most_used_emoji']['count']} times)")
    print(f"  • Reaction breakdown:")
    for reaction, count in type_counts.head(5).items():
        print(f"    - {reaction}: {count}")
    
    return stats


def analyze_emoji_usage(emoji_df):
    """
    Analyze emoji usage patterns in messages.
    
    Returns:
        Dict with statistics
    """
    if emoji_df.empty:
        return {}
    
    stats = {}
    
    # Most emoji-loving person
    emoji_by_sender = emoji_df.groupby('sender').size().sort_values(ascending=False)
    stats['emoji_champion'] = {
        'name': emoji_by_sender.index[0] if len(emoji_by_sender) > 0 else None,
        'count': int(emoji_by_sender.iloc[0]) if len(emoji_by_sender) > 0 else 0
    }
    
    # Most used emojis overall
    emoji_counts = emoji_df['emoji'].value_counts()
    stats['top_emojis'] = {
        emoji: int(count) for emoji, count in emoji_counts.head(10).items()
    }
    
    # Emoji diversity (unique emojis per person)
    emoji_diversity = emoji_df.groupby('sender')['emoji'].nunique().sort_values(ascending=False)
    stats['emoji_diversity'] = emoji_diversity.to_dict()
    
    print("\n🎨 Emoji Usage Analysis:")
    print(f"  • Emoji champion: {stats['emoji_champion']['name']} ({stats['emoji_champion']['count']} emojis used)")
    print(f"  • Top 5 emojis:")
    for emoji, count in list(stats['top_emojis'].items())[:5]:
        print(f"    {emoji}: {count}")
    print(f"  • Most diverse emoji user: {emoji_diversity.index[0]} ({emoji_diversity.iloc[0]} unique emojis)")
    
    return stats


def generate_leaderboard(reactions_df, emoji_df):
    """
    Generate comprehensive emoji/reaction leaderboard.
    
    Returns:
        Formatted leaderboard string
    """
    leaderboard = []
    leaderboard.append("=" * 60)
    leaderboard.append("🏆 EMOJI & REACTION LEADERBOARD 🏆")
    leaderboard.append("=" * 60)
    
    # Reaction leaderboard
    if not reactions_df.empty:
        leaderboard.append("\n📱 REACTION CHAMPIONS:")
        reactor_counts = reactions_df['reactor'].value_counts()
        for i, (name, count) in enumerate(reactor_counts.head(5).items(), 1):
            medal = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"][i-1]
            leaderboard.append(f"  {medal} {name}: {count} reactions")
    
    # Emoji usage leaderboard
    if not emoji_df.empty:
        leaderboard.append("\n😊 EMOJI CHAMPIONS:")
        emoji_counts = emoji_df.groupby('sender').size().sort_values(ascending=False)
        for i, (name, count) in enumerate(emoji_counts.head(5).items(), 1):
            medal = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"][i-1]
            leaderboard.append(f"  {medal} {name}: {count} emojis")
        
        leaderboard.append("\n🌟 MOST POPULAR EMOJIS:")
        top_emojis = emoji_df['emoji'].value_counts()
        for i, (emoji, count) in enumerate(top_emojis.head(10).items(), 1):
            leaderboard.append(f"  {i}. {emoji} - {count} uses")
    
    leaderboard.append("\n" + "=" * 60)
    
    return "\n".join(leaderboard)


def save_analysis(reactions_df, emoji_df, reaction_stats, emoji_stats, 
                  output_dir="~/Projects/henze-trivia/output"):
    """Save analysis results to CSV files."""
    output_dir = os.path.expanduser(output_dir)
    
    if not reactions_df.empty:
        reactions_path = os.path.join(output_dir, "reactions_analysis.csv")
        reactions_df.to_csv(reactions_path, index=False)
        print(f"💾 Saved reactions to: {reactions_path}")
    
    if not emoji_df.empty:
        emoji_path = os.path.join(output_dir, "emoji_usage.csv")
        emoji_df.to_csv(emoji_path, index=False)
        print(f"💾 Saved emoji usage to: {emoji_path}")
    
    # Save combined stats
    stats_path = os.path.join(output_dir, "emoji_leaderboard_stats.json")
    import json
    with open(stats_path, 'w') as f:
        json.dump({
            'reactions': reaction_stats,
            'emojis': emoji_stats
        }, f, indent=2)
    print(f"💾 Saved stats to: {stats_path}")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Analyze emoji usage and reactions")
    parser.add_argument("--leaderboard", action="store_true", help="Display full leaderboard")
    
    args = parser.parse_args()
    
    print("😊 Emoji & Reaction Leaderboard Analyzer")
    print("="*60)
    
    # Extract reaction data
    try:
        reactions_df = extract_emoji_reactions()
    except Exception as e:
        print(f"⚠️  Could not extract reactions: {e}")
        reactions_df = pd.DataFrame()
    
    # Extract emoji usage from messages
    emoji_df = extract_emojis_from_messages()
    
    # Analyze patterns
    if not reactions_df.empty:
        reaction_stats = analyze_reaction_patterns(reactions_df)
    else:
        reaction_stats = {}
        print("\n⚠️  No reaction data available")
    
    if not emoji_df.empty:
        emoji_stats = analyze_emoji_usage(emoji_df)
    else:
        emoji_stats = {}
        print("\n⚠️  No emoji data available")
    
    # Generate and display leaderboard
    if args.leaderboard:
        leaderboard = generate_leaderboard(reactions_df, emoji_df)
        print("\n" + leaderboard)
    
    # Save analysis
    save_analysis(reactions_df, emoji_df, reaction_stats, emoji_stats)
    
    print("\n✅ Emoji analysis complete!")

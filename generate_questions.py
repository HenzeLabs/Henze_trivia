#!/usr/bin/env python3
"""
Henze Trivia - Unified Question Generator
Main CLI interface for all trivia question generation modes.
"""

import os
import sys
import argparse
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def print_banner():
    """Print the application banner."""
    banner = """
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║              🎮  HENZE TRIVIA GENERATOR  🎮              ║
║                                                           ║
║         iMessage Chat → AI-Powered Trivia Game           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
"""
    print(banner)


def generate_trivia_questions(args):
    """Generate standard trivia questions using OpenAI."""
    from openai_agent.trivia_bot import generate_trivia_questions as gen_trivia, load_chat_data
    
    print("\n🤖 Generating standard trivia questions...")
    csv_path = os.path.expanduser("~/Projects/henze-trivia/output/chat_export.csv")
    
    messages_df = load_chat_data(csv_path)
    questions = gen_trivia(messages_df, num_questions=args.num)
    
    if questions:
        from openai_agent.trivia_bot import save_questions
        save_questions(questions)
        print(f"✅ Generated {len(questions)} trivia questions!")
    else:
        print("❌ Failed to generate trivia questions")
        return False
    
    return True


def generate_who_said_it(args):
    """Generate 'Who Said It?' quote attribution questions."""
    import subprocess
    
    print("\n💬 Generating 'Who Said It?' questions...")
    
    cmd = [
        "python", "openai_agent/who_said_it.py",
        "--num", str(args.num)
    ]
    
    if args.display:
        cmd.append("--display")
    
    result = subprocess.run(cmd, cwd=os.path.dirname(os.path.abspath(__file__)))
    return result.returncode == 0


def generate_chaos_questions(args):
    """Generate time-based chaos hour questions."""
    import subprocess
    
    print("\n🕐 Generating chaos hour questions...")
    
    cmd = [
        "python", "openai_agent/chaos_questions.py",
        "--num", str(args.num)
    ]
    
    if args.display:
        cmd.append("--display")
    
    result = subprocess.run(cmd, cwd=os.path.dirname(os.path.abspath(__file__)))
    return result.returncode == 0


def generate_roast_mode(args):
    """Generate roast mode questions."""
    import subprocess
    
    print("\n🔥 Generating roast mode questions...")
    
    cmd = [
        "python", "openai_agent/roast_mode.py",
        "--num", str(args.num),
        "--sample", str(args.sample)
    ]
    
    if args.display:
        cmd.append("--display")
    
    result = subprocess.run(cmd, cwd=os.path.dirname(os.path.abspath(__file__)))
    return result.returncode == 0


def analyze_emojis(args):
    """Run emoji and reaction analysis."""
    import subprocess
    
    print("\n😊 Running emoji analysis...")
    
    cmd = ["python", "analytics/emoji_analysis.py"]
    
    if args.display:
        cmd.append("--leaderboard")
    
    # Set PYTHONPATH for imports
    env = os.environ.copy()
    env["PYTHONPATH"] = os.path.dirname(os.path.abspath(__file__))
    
    result = subprocess.run(cmd, cwd=os.path.dirname(os.path.abspath(__file__)), env=env)
    return result.returncode == 0


def export_ahaslides(args):
    """Export questions to AhaSlides format."""
    import subprocess
    
    print("\n📤 Exporting to AhaSlides format...")
    
    cmd = [
        "python", "exports/ahaslides_formatter.py",
        "--all",
        "--time", str(args.time),
        "--points", str(args.points)
    ]
    
    if args.display:
        cmd.append("--preview")
    
    result = subprocess.run(cmd, cwd=os.path.dirname(os.path.abspath(__file__)))
    return result.returncode == 0


def generate_all(args):
    """Generate all question types."""
    print("\n🎯 Generating ALL question types...")
    print("="*60)
    
    results = {}
    
    # Generate each type
    generators = [
        ("Standard Trivia", generate_trivia_questions),
        ("Who Said It", generate_who_said_it),
        ("Chaos Questions", generate_chaos_questions),
        ("Roast Mode", generate_roast_mode),
    ]
    
    for name, generator in generators:
        try:
            success = generator(args)
            results[name] = "✅" if success else "❌"
        except Exception as e:
            print(f"❌ Error generating {name}: {e}")
            results[name] = "❌"
    
    # Emoji analysis
    try:
        analyze_emojis(args)
        results["Emoji Analysis"] = "✅"
    except Exception as e:
        print(f"❌ Error in emoji analysis: {e}")
        results["Emoji Analysis"] = "❌"
    
    # Export to AhaSlides
    if args.export:
        try:
            export_ahaslides(args)
            results["AhaSlides Export"] = "✅"
        except Exception as e:
            print(f"❌ Error exporting to AhaSlides: {e}")
            results["AhaSlides Export"] = "❌"
    
    # Print summary
    print("\n" + "="*60)
    print("📊 GENERATION SUMMARY")
    print("="*60)
    for name, status in results.items():
        print(f"  {status} {name}")
    print("="*60)
    
    return all(v == "✅" for v in results.values())


def interactive_mode():
    """Run interactive question selection."""
    print_banner()
    print("\n🎮 Interactive Mode")
    print("="*60)
    
    print("\nSelect question generation mode:")
    print("  1. Standard Trivia (context-based questions)")
    print("  2. Who Said It? (quote attribution)")
    print("  3. Chaos Questions (late-night/timing)")
    print("  4. Roast Mode (savage message analysis)")
    print("  5. Emoji Analysis (reactions & emoji usage)")
    print("  6. Generate ALL question types")
    print("  7. Export to AhaSlides")
    print("  0. Exit")
    
    while True:
        choice = input("\nEnter choice (0-7): ").strip()
        
        if choice == "0":
            print("\n👋 Goodbye!")
            break
        
        num_questions = input("Number of questions (default: 10): ").strip() or "10"
        
        class Args:
            num = int(num_questions)
            sample = 100
            display = True
            export = False
            time = 30
            points = 100
        
        args = Args()
        
        try:
            if choice == "1":
                generate_trivia_questions(args)
            elif choice == "2":
                generate_who_said_it(args)
            elif choice == "3":
                generate_chaos_questions(args)
            elif choice == "4":
                generate_roast_mode(args)
            elif choice == "5":
                analyze_emojis(args)
            elif choice == "6":
                args.export = True
                generate_all(args)
            elif choice == "7":
                export_ahaslides(args)
            else:
                print("❌ Invalid choice. Please try again.")
                continue
            
            print("\n✅ Operation complete!")
            
        except Exception as e:
            print(f"\n❌ Error: {e}")
        
        cont = input("\nContinue? (y/n): ").strip().lower()
        if cont != 'y':
            print("\n👋 Goodbye!")
            break


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Henze Trivia - Generate AI-powered trivia from iMessage chats",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Generate all question types
  python generate_questions.py --all --num 10 --export

  # Generate specific type
  python generate_questions.py --mode who-said-it --num 15 --display

  # Interactive mode
  python generate_questions.py --interactive

  # Emoji analysis only
  python generate_questions.py --mode emoji --display
        """
    )
    
    parser.add_argument("--mode", 
                       choices=["trivia", "who-said-it", "chaos", "roast", "emoji", "export"],
                       help="Question generation mode")
    
    parser.add_argument("--all", action="store_true",
                       help="Generate all question types")
    
    parser.add_argument("--num", type=int, default=10,
                       help="Number of questions to generate (default: 10)")
    
    parser.add_argument("--sample", type=int, default=100,
                       help="Sample size for roast analysis (default: 100)")
    
    parser.add_argument("--display", action="store_true",
                       help="Display generated questions/analysis")
    
    parser.add_argument("--export", action="store_true",
                       help="Export to AhaSlides format")
    
    parser.add_argument("--time", type=int, default=30,
                       help="Time limit per question for AhaSlides (default: 30)")
    
    parser.add_argument("--points", type=int, default=100,
                       help="Points per question for AhaSlides (default: 100)")
    
    parser.add_argument("--interactive", action="store_true",
                       help="Run in interactive mode")
    
    args = parser.parse_args()
    
    # Show banner
    print_banner()
    
    # Interactive mode
    if args.interactive or len(sys.argv) == 1:
        interactive_mode()
        return
    
    # Generate all mode
    if args.all:
        success = generate_all(args)
        sys.exit(0 if success else 1)
    
    # Specific mode
    if args.mode:
        success = False
        
        if args.mode == "trivia":
            success = generate_trivia_questions(args)
        elif args.mode == "who-said-it":
            success = generate_who_said_it(args)
        elif args.mode == "chaos":
            success = generate_chaos_questions(args)
        elif args.mode == "roast":
            success = generate_roast_mode(args)
        elif args.mode == "emoji":
            success = analyze_emojis(args)
        elif args.mode == "export":
            success = export_ahaslides(args)
        
        if args.export and args.mode != "export":
            export_ahaslides(args)
        
        sys.exit(0 if success else 1)
    
    # No mode specified
    print("\n❌ Please specify --mode, --all, or --interactive")
    parser.print_help()
    sys.exit(1)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
YouTube RAG Chatbot - Simple and Clean
Run this file to start the chatbot
"""

import os
os.system('clear')
# 🔑 STEP 1: Set your Google API key here
# Replace with your actual key
os.environ["GOOGLE_API_KEY"] = "AIzaSyB89VHFwBZpI0NOy7gkybkbadYlCDrjt90"

# 🎯 STEP 2: Import and use the chatbot


def main():
    """Main function to run the YouTube RAG Chatbot"""

    print("🚀 YouTube RAG Chatbot Starting...")
    print("=" * 50)

    try:
        # Import the chatbot functionality
        from main import YouTubeRAGChatbot
        
        # Create chatbot instance
        chatbot = YouTubeRAGChatbot()

        # 📹 Test with Hindi video
        video_id = "wjZofJX0v4M"  # Hindi video for testing translation
        print(f"📥 Testing video: {video_id}")
        
        # Step 1: Check available transcripts
        print(f"\n🔍 Step 1: Checking available transcripts...")
        available = chatbot.get_available_transcripts(video_id)
        
        if available:
            print("📋 Available languages:")
            for transcript in available:
                print(f"  - {transcript['language']} ({transcript['language_code']}) - Generated: {transcript['is_generated']}, Translatable: {transcript['is_translatable']}")
        else:
            print("❌ No transcripts found!")
            return None
        
        # Step 2: Process video with full RAG pipeline (includes translation)
        print(f"\n🎯 Step 2: Processing video with full RAG pipeline...")
        try:
            # Process the video with translation in one go
            chatbot.process_video(video_id, language_code='hi', translate_to_english=True)
            
            print(f"\n✅ Video processing completed successfully!")
            
            # Ask questions
            test_questions(chatbot)
                
        except Exception as extract_error:
            print(f"❌ Video processing error: {extract_error}")
            
            # Fallback to English video
            print(f"\n🔄 Falling back to English video for testing...")
            english_video_id = "wjZofJX0v4M"
            chatbot.process_video(english_video_id, language_code='en')
            test_questions(chatbot)
            
        return chatbot

    except Exception as e:
        print(f"❌ Error: {e}")
        print("\n💡 Troubleshooting:")
        print("1. Make sure your Google API key is correct")
        print("2. Check that the video ID is valid and has captions")
        print("3. Ensure you have internet connection")
        print("4. Install required packages: pip install deep-translator youtube-transcript-api")
        return None

def test_questions(chatbot):
    """Test the chatbot with predefined questions"""
    questions = [
        "What is the main topic of this video?",
        "What is the summary of the video?",
        "What are the key points discussed, mention them ?",
        "Are there any specific examples mentioned, if so what are they?"
    ]

    print("\n" + "="*50)
    print("🎯 ASKING QUESTIONS")
    print("="*50)

    for question in questions:
        print(f"\n❓ Question: {question}")
        try:
            answer = chatbot.ask(question)
            print(f"🤖 Answer: {answer}")
        except Exception as e:
            print(f"❌ Error answering question: {e}")
        print("-" * 30)

    print("\n✅ Success! You can now ask custom questions:")
    print("Example: chatbot.ask('Your question here')")

    # Interactive mode
    print("\n🔄 Interactive Mode (type 'quit' to exit):")
    while True:
        user_question = input("\n❓ Your question: ").strip()
        if user_question.lower() in ['quit', 'exit', 'q']:
            print("👋 Goodbye!")
            break
        if user_question:
            try:
                answer = chatbot.ask(user_question)
                print(f"🤖 Answer: {answer}")
            except Exception as e:
                print(f"❌ Error: {e}")


if __name__ == "__main__":
    main()
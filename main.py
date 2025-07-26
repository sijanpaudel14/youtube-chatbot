"""
Main application for YouTube RAG Chatbot
"""

from typing import Optional, List
import time
from config import Config
from utils import embedding_retry, youtube_transcript_retry
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import WebshareProxyConfig
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound
from deep_translator import GoogleTranslator
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnableParallel, RunnablePassthrough, RunnableLambda
from langchain_core.output_parsers import StrOutputParser
from dotenv import load_dotenv
import os

load_dotenv()  # Load variables from .env file

proxy_username = os.getenv("PROXY_USERNAME")
proxy_password = os.getenv("PROXY_PASSWORD")


def simple_translate_text(text: str, source_lang: str, target_lang: str = 'en') -> str:
    """Simple translation function using Google Translator with chunking and better error handling"""
    try:
        print(
            f"🔄 Translating {len(text)} characters from {source_lang} to {target_lang}...")

        # Split into smaller chunks for better translation success
        chunk_size = 1000  # Smaller chunks for better reliability
        chunks = [text[i:i+chunk_size]
                  for i in range(0, len(text), chunk_size)]
        print(f"📦 Split into {len(chunks)} chunks")

        # Translate chunks
        translated_chunks = []
        translator = GoogleTranslator(source=source_lang, target=target_lang)

        successful_translations = 0

        for i, chunk in enumerate(chunks):
            try:
                print(f"  🔄 Translating chunk {i+1}/{len(chunks)}...")
                translated = translator.translate(chunk)

                # Check if translation actually happened (not same as original)
                if translated and translated != chunk and len(translated.strip()) > 0:
                    translated_chunks.append(translated)
                    successful_translations += 1
                    print(f"    ✅ Chunk {i+1} translated successfully")
                else:
                    print(
                        f"    ⚠️ Chunk {i+1} translation may have failed (same as original)")
                    # Try a different approach - translate smaller piece
                    small_piece = chunk[:200]  # First 200 chars
                    try:
                        small_translated = translator.translate(small_piece)
                        if small_translated and small_translated != small_piece:
                            translated_chunks.append(
                                small_translated + " " + chunk[200:])
                            successful_translations += 1
                        else:
                            translated_chunks.append(chunk)  # Keep original
                    except:
                        translated_chunks.append(chunk)  # Keep original

                time.sleep(0.5)  # Longer delay to avoid rate limiting

            except Exception as chunk_error:
                print(f"    ❌ Chunk {i+1} failed: {chunk_error}")
                # Keep original if translation fails
                translated_chunks.append(chunk)

        translated_text = " ".join(translated_chunks)
        print(f"✅ Translation completed: {len(translated_text)} characters")
        print(
            f"📊 Successfully translated {successful_translations}/{len(chunks)} chunks")

        # If no chunks were successfully translated, try translating the whole text at once
        if successful_translations == 0:
            print(
                f"⚠️ No chunks translated successfully, trying full text translation...")
            try:
                full_translated = translator.translate(
                    text[:4000])  # Try first 4000 chars
                if full_translated and full_translated != text[:4000]:
                    print(f"✅ Full text translation successful!")
                    # Add rest as original
                    return full_translated + " " + text[4000:]
                else:
                    print(f"❌ Full text translation also failed")
                    return text
            except Exception as full_error:
                print(f"❌ Full text translation error: {full_error}")
                return text

        return translated_text

    except Exception as e:
        print(f"❌ Translation failed: {e}")
        return text  # Return original text if translation fails


class YouTubeRAGChatbot:
    """
    A complete RAG system for YouTube video analysis and question answering.
    Enhanced with multi-video support and analytics.
    """

    def __init__(self, config: Config = None):
        """Initialize the chatbot with configuration"""
        self.config = config or Config()
        self.config.validate()

        # Initialize components
        self.ytt_api = None
        self.embedding_model = None
        self.llm = None
        self.vector_store = None
        self.rag_chain = None

        # Multi-video support
        self.processed_videos = {}  # Store video metadata
        self.video_analytics = {}   # Store analytics data
        self.current_video_id = None
        self.raw_transcript_data = []  # Store raw transcript with timestamps

        self._setup_models()

    def _setup_models(self):
        """Set up the embedding and LLM models"""
        # Set up YouTube API with proxy support for better reliability
        self.ytt_api = YouTubeTranscriptApi(
            # proxy_config=WebshareProxyConfig(
            #     proxy_username=proxy_username,
            #     proxy_password=proxy_password,
            # )
        )

        # Set up embedding model
        self.embedding_model = GoogleGenerativeAIEmbeddings(
            model=self.config.EMBEDDING_MODEL
        )

        # Set up LLM
        self.llm = ChatGoogleGenerativeAI(
            model=self.config.LLM_MODEL,
            temperature=self.config.LLM_TEMPERATURE
    
        )

    def extract_transcript(self, video_id: str) -> str:
        """Extract transcript from YouTube video with retry support"""
        print(f"📥 Extracting transcript for video: {video_id}")

        try:
            # ✅ Primary method with retry
            transcript_data = youtube_transcript_retry(
                self.ytt_api.fetch, video_id, languages=['en']
            )

            # Newer versions return transcript segments with `.text` attribute
            full_transcript = " ".join(chunk.text for chunk in transcript_data)
            print(f"✅ Transcript extracted: {len(full_transcript)} characters")
            return full_transcript

        except TranscriptsDisabled:
            raise ValueError("🚫 No captions available for this video")
        except NoTranscriptFound:
            raise ValueError("❗ Transcript not found in English")
        except Exception as e:
            print(f"⚠️ Primary fetch failed due to: {e}")

    def get_available_transcripts(self, video_id: str) -> List[dict]:
        """Get all available transcripts for a video with language information"""
        print(f"🔍 Checking available transcripts for video: {video_id}")

        try:
            # Get transcript list (available languages) - using instance method with retry
            transcript_list = youtube_transcript_retry(
                self.ytt_api.list, video_id)

            available_transcripts = []

            for transcript in transcript_list:
                transcript_info = {
                    'language_code': transcript.language_code,
                    'language': transcript.language,
                    'is_generated': transcript.is_generated,
                    'is_translatable': transcript.is_translatable
                }
                available_transcripts.append(transcript_info)

            print(
                f"✅ Found {len(available_transcripts)} available transcripts")
            return available_transcripts

        except Exception as e:
            print(f"❌ Failed to get transcript list: {e}")
            return []

    def extract_transcript_by_language(self, video_id: str, language_code: str = 'en', translate_to_english: bool = True) -> tuple:
        """Extract transcript in specific language with timestamps, with simple translation fallback"""
        print(
            f"📥 Extracting transcript for video: {video_id}, language: {language_code}")

        try:
            # Get transcript list using instance method with retry
            transcript_list = youtube_transcript_retry(
                self.ytt_api.list, video_id)

            # Try to get the requested language
            try:
                transcript = transcript_list.find_transcript([language_code])
                print(f"✅ Found {language_code} transcript")
            except Exception as find_error:
                print(
                    f"❌ Could not find {language_code} transcript: {find_error}")
                raise ValueError(
                    f"Failed to get transcript in {language_code}")

            # Fetch the actual transcript data with retry
            transcript_data = youtube_transcript_retry(transcript.fetch)

            # Store the raw transcript data with timestamps for later use
            self.raw_transcript_data = transcript_data

            # Extract text from transcript segments
            full_transcript = " ".join(item.text for item in transcript_data)
            print(
                f"✅ Original transcript extracted: {len(full_transcript)} characters")

            # If English or no translation needed, return as is
            if language_code == 'en' or not translate_to_english:
                print(f"ℹ️ No translation needed")
                return full_transcript, transcript_data

            # Use Google Translator directly
            print(f"🔄 Using Google Translator...")
            translated_text = simple_translate_text(
                full_transcript, language_code, 'en')

            # For translated text, we'll keep the original timestamps but with translated text
            # This is a simplified approach - in practice you'd need more sophisticated alignment
            return translated_text, transcript_data

        except Exception as e:
            print(f"❌ Failed to extract transcript by language: {e}")
            raise ValueError(f"Failed to extract transcript: {e}")

    def process_video(self, video_id: str, language_code: str = 'en', translate_to_english: bool = True):
        """Complete pipeline to process a YouTube video with language selection"""
        print(
            f"🚀 Processing YouTube video: {video_id} (language: {language_code})")
        print("=" * 50)

        import time
        start_time = time.time()

        # Extract transcript by language (now returns transcript and timestamp data)
        transcript, transcript_data = self.extract_transcript_by_language(
            video_id, language_code, translate_to_english)

        # Store video metadata
        self.processed_videos[video_id] = {
            "language_code": language_code,
            "translated": translate_to_english,
            "processed_at": time.time(),
            "transcript_length": len(transcript),
            "word_count": len(transcript.split())
        }
        self.current_video_id = video_id

        # Process transcript with timestamps
        chunks = self.process_transcript_with_timestamps(
            transcript, transcript_data)

        # Generate embeddings
        texts, embeddings = self.generate_embeddings(chunks)

        # Create vector store
        self.create_vector_store(texts, embeddings)

        # Setup RAG chain
        self.setup_rag_chain()

        # Initialize analytics
        processing_time = time.time() - start_time
        self.video_analytics[video_id] = {
            "processing_time": processing_time,
            "chunk_count": len(chunks),
            "questions_asked": 0,
            "topics_discussed": [],
            "sentiment_scores": [],
            "engagement_score": 0.0
        }

        print("=" * 50)
        print("🎯 Video processing complete! Ready for questions.")
        return self

    def process_transcript(self, transcript: str) -> List:
        """Split transcript into chunks"""
        print("✂️ Splitting transcript into chunks...")

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.config.CHUNK_SIZE,
            chunk_overlap=self.config.CHUNK_OVERLAP
        )
        chunks = splitter.create_documents([transcript])

        print(f"✅ Created {len(chunks)} chunks")
        return chunks

    def process_transcript_with_timestamps(self, transcript: str, transcript_data: List) -> List:
        """Split transcript into chunks while preserving timestamp information"""
        print("✂️ Splitting transcript into chunks with timestamps...")

        # Create a mapping of text segments to timestamps
        timestamp_map = {}
        current_pos = 0

        for item in transcript_data:
            text = item.text
            start_time = item.start
            duration = item.duration
            end_time = start_time + duration

            # Map character positions to timestamps
            text_start = current_pos
            text_end = current_pos + len(text)

            for pos in range(text_start, text_end + 1):
                timestamp_map[pos] = {
                    'start': start_time,
                    'end': end_time,
                    'text_segment': text
                }

            current_pos = text_end + 1  # +1 for space

        # Split transcript into chunks
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.config.CHUNK_SIZE,
            chunk_overlap=self.config.CHUNK_OVERLAP
        )
        chunks = splitter.create_documents([transcript])

        # Add timestamp metadata to each chunk
        enhanced_chunks = []
        for chunk in chunks:
            chunk_text = chunk.page_content
            chunk_start_pos = transcript.find(chunk_text)

            if chunk_start_pos != -1:
                # Find timestamps for this chunk
                chunk_timestamps = []
                chunk_end_pos = chunk_start_pos + len(chunk_text)

                # Collect unique timestamps that overlap with this chunk
                seen_segments = set()
                for pos in range(chunk_start_pos, min(chunk_end_pos, len(transcript))):
                    if pos in timestamp_map:
                        segment_key = (
                            timestamp_map[pos]['start'], timestamp_map[pos]['end'])
                        if segment_key not in seen_segments:
                            chunk_timestamps.append({
                                'start': timestamp_map[pos]['start'],
                                'end': timestamp_map[pos]['end'],
                                'text_segment': timestamp_map[pos]['text_segment']
                            })
                            seen_segments.add(segment_key)

                # Sort timestamps by start time
                chunk_timestamps.sort(key=lambda x: x['start'])

                # Add metadata to chunk
                chunk.metadata = {
                    'timestamps': chunk_timestamps,
                    'start_time': chunk_timestamps[0]['start'] if chunk_timestamps else 0,
                    'end_time': chunk_timestamps[-1]['end'] if chunk_timestamps else 0
                }
            else:
                # Fallback if text not found
                chunk.metadata = {
                    'timestamps': [],
                    'start_time': 0,
                    'end_time': 0
                }

            enhanced_chunks.append(chunk)

        print(
            f"✅ Created {len(enhanced_chunks)} chunks with timestamp metadata")
        return enhanced_chunks

    def generate_embeddings(self, chunks: List) -> tuple:
        """Generate embeddings for chunks"""
        print("🧠 Generating embeddings...")

        valid_texts = []
        valid_embeddings = []

        for idx, doc in enumerate(chunks):
            try:
                text = doc.page_content
                embedding = embedding_retry(
                    self.embedding_model.embed_query, text
                )
                valid_texts.append(text)
                valid_embeddings.append(embedding)

                if (idx + 1) % 10 == 0 or (idx + 1) == len(chunks):
                    print(f"✅ Embedded {idx + 1}/{len(chunks)} chunks")

            except Exception as e:
                print(f"❌ Skipped chunk {idx + 1}: {e}")
                continue

        print(f"✅ Successfully embedded {len(valid_embeddings)} chunks")
        return valid_texts, valid_embeddings

    def create_vector_store(self, texts: List, embeddings: List):
        """Create FAISS vector store"""
        print("🗃️ Creating vector store...")

        text_embedding_pairs = list(zip(texts, embeddings))
        self.vector_store = FAISS.from_embeddings(
            text_embeddings=text_embedding_pairs,
            embedding=self.embedding_model
        )

        print("✅ Vector store created successfully")

    def setup_rag_chain(self):
        """Set up the complete RAG chain"""
        print("⛓️ Setting up RAG chain...")

        # Create retriever
        retriever = self.vector_store.as_retriever(
            search_type="similarity",
            search_kwargs={"k": self.config.RETRIEVAL_K}
        )

        # Create prompt template
        prompt = PromptTemplate(
            template="""
                                                You are an intelligent and articulate assistant who has watched the entire video and internalized its content. Based on that, answer the following user question in your own words, with clarity, precision, and relevance.

                📌 OBJECTIVE:
                Your goal is to provide clear, helpful, and engaging answers grounded in the video content — as if you’re summarizing or explaining it to a curious learner.

                🎯 INSTRUCTIONS:
                - Begin with a direct answer — avoid unnecessary greetings or filler like “Sure”, “Of course”, or “Here’s the answer.”
                - Respond in a natural, confident tone while staying informative and structured.
                - Use everyday, human-like language, but stay focused on the point.
                - Tailor the response to the type of question:
                    - **"What is the video about?"** → Give a short, structured overview with key points.
                    - **"What is X?"** → Define and explain the concept based on the video.
                    - **"Explain roadmap" or steps** → List key steps clearly and in order.
                    - **"Are there any examples?"** → Briefly mention specific ones from the video if available.
                - Avoid simply rephrasing transcript lines — instead, internalize and explain.
                - Avoid excessive repetition or generic phrases like “the video talks about…” unless needed.
                - If the question is vague or open-ended, summarize the most relevant highlights.

                🧠 KNOWLEDGE SOURCE:
                Below is the full transcript of the video. Treat it as your internal memory — don’t quote directly, explain as if it’s your own knowledge.

                --- VIDEO TRANSCRIPT START ---
                {context}
                --- VIDEO TRANSCRIPT END ---

                ❓ USER QUESTION:
                {question}

                💬 YOUR ANSWER:
            """.strip(),
            input_variables=["context", "question"]
        )

        # Format documents function

        def format_docs(docs):
            if not docs:
                return "No relevant context found."

            return "\n\n".join(doc.page_content for doc in docs)

        # Enhanced format documents function with timestamps
        def format_docs_with_timestamps(docs):
            if not docs:
                return "No relevant context found.", "No timestamps available."

            context_parts = []
            all_timestamps = []

            for doc in docs:
                context_parts.append(doc.page_content)

                # Extract timestamps from metadata
                if hasattr(doc, 'metadata') and 'timestamps' in doc.metadata:
                    doc_timestamps = doc.metadata['timestamps']
                    all_timestamps.extend(doc_timestamps)

            context = "\n\n".join(context_parts)

            # Format timestamps
            if all_timestamps:
                # Remove duplicates and sort by start time
                unique_timestamps = {}
                for ts in all_timestamps:
                    key = (ts['start'], ts['end'])
                    if key not in unique_timestamps:
                        unique_timestamps[key] = ts

                sorted_timestamps = sorted(
                    unique_timestamps.values(), key=lambda x: x['start'])

                # Format timestamps for display
                timestamp_strings = []
                for ts in sorted_timestamps:
                    start_min, start_sec = divmod(int(ts['start']), 60)
                    end_min, end_sec = divmod(int(ts['end']), 60)
                    timestamp_strings.append(
                        f"• {start_min:02d}:{start_sec:02d} - {end_min:02d}:{end_sec:02d}")

                timestamps_formatted = "\n".join(timestamp_strings)
            else:
                timestamps_formatted = "No specific timestamps available."

            return context, timestamps_formatted

        # Create the complete RAG chain
        self.rag_chain = (
            RunnableParallel({
                'context': retriever | RunnableLambda(format_docs),
                'question': RunnablePassthrough()
            })
            | prompt
            | self.llm
            | StrOutputParser()
        )

        print("✅ RAG chain ready for questions!")

    def ask(self, question: str) -> str:
        """Ask a question about the processed video with analytics tracking"""
        if not self.rag_chain:
            raise ValueError(
                "No video has been processed yet. Call process_video() first.")

        try:
            # Track question analytics
            if self.current_video_id and self.current_video_id in self.video_analytics:
                self.video_analytics[self.current_video_id]["questions_asked"] += 1

            answer = self.rag_chain.invoke(question)
            return answer.strip()
        except Exception as e:
            return f"Error generating answer: {e}"

    def ask_with_timestamps(self, question: str) -> dict:
        """Ask a question and return both answer and timestamp information"""
        if not self.rag_chain:
            raise ValueError(
                "No video has been processed yet. Call process_video() first.")

        try:
            # Track question analytics
            if self.current_video_id and self.current_video_id in self.video_analytics:
                self.video_analytics[self.current_video_id]["questions_asked"] += 1

            # Get relevant documents first
            retriever = self.vector_store.as_retriever(
                search_type="similarity",
                search_kwargs={"k": self.config.RETRIEVAL_K}
            )

            relevant_docs = retriever.invoke(question)

            # Extract timestamps from relevant documents
            all_timestamps = []
            for doc in relevant_docs:
                if hasattr(doc, 'metadata') and 'timestamps' in doc.metadata:
                    doc_timestamps = doc.metadata['timestamps']
                    all_timestamps.extend(doc_timestamps)

            # Format timestamps
            formatted_timestamps = []
            if all_timestamps:
                # Remove duplicates and sort by start time
                unique_timestamps = {}
                for ts in all_timestamps:
                    key = (ts['start'], ts['end'])
                    if key not in unique_timestamps:
                        unique_timestamps[key] = ts

                sorted_timestamps = sorted(
                    unique_timestamps.values(), key=lambda x: x['start'])

                # Create clickable timestamp links
                for ts in sorted_timestamps:
                    start_min, start_sec = divmod(int(ts['start']), 60)
                    end_min, end_sec = divmod(int(ts['end']), 60)
                    formatted_timestamps.append({
                        'start_time': ts['start'],
                        'end_time': ts['end'],
                        'formatted': f"{start_min:02d}:{start_sec:02d} - {end_min:02d}:{end_sec:02d}",
                        'text_segment': ts.get('text_segment', '')
                    })

            # Get the regular answer
            answer = self.rag_chain.invoke(question)

            return {
                'answer': answer.strip(),
                'timestamps': formatted_timestamps,
                'video_id': self.current_video_id,
                'question': question
            }

        except Exception as e:
            return {
                'answer': f"Error generating answer: {e}",
                'timestamps': [],
                'video_id': self.current_video_id,
                'question': question
            }

    def get_youtube_timestamp_url(self, video_id: str, start_time: float) -> str:
        """Generate YouTube URL with timestamp"""
        return f"https://www.youtube.com/watch?v={video_id}&t={int(start_time)}s"

    def format_answer_with_timestamps(self, question: str) -> str:
        """Ask a question and return formatted answer with clickable timestamps"""
        result = self.ask_with_timestamps(question)

        answer = result['answer']
        timestamps = result['timestamps']

        if timestamps:
            timestamp_section = "\n\n🕒 **Source Timestamps:**\n"
            for ts in timestamps:
                youtube_url = self.get_youtube_timestamp_url(
                    result['video_id'], ts['start_time'])
                timestamp_section += f"• [{ts['formatted']}]({youtube_url}) - {ts['text_segment'][:100]}...\n"

            return answer + timestamp_section
        else:
            return answer + "\n\n🕒 **Source Timestamps:** No specific timestamps available."

    def batch_questions(self, questions: List[str]) -> List[tuple]:
        """Ask multiple questions and return results"""
        results = []
        for question in questions:
            answer = self.ask(question)
            results.append((question, answer))
        return results
        """Ask multiple questions and return results"""
        results = []
        for question in questions:
            answer = self.ask(question)
            results.append((question, answer))
        return results

    # ==================== ENHANCED FEATURES ====================

    def analyze_video_sentiment(self, video_id: str = None) -> dict:
        """Analyze overall sentiment and emotional tone of video"""
        if not video_id:
            video_id = self.current_video_id

        if not video_id or video_id not in self.processed_videos:
            return {"error": "Video not processed"}

        try:
            # Simple sentiment analysis using basic keywords
            # In production, you'd use TextBlob or Hugging Face
            transcript = self.get_video_transcript(video_id)

            positive_words = ['good', 'great', 'excellent', 'amazing',
                              'wonderful', 'love', 'like', 'best', 'awesome', 'fantastic']
            negative_words = ['bad', 'terrible', 'awful', 'hate', 'worst',
                              'horrible', 'disappointing', 'sad', 'angry', 'frustrated']
            educational_words = ['learn', 'tutorial', 'guide', 'explain',
                                 'understand', 'concept', 'example', 'demonstration']

            words = transcript.lower().split()

            positive_count = sum(1 for word in words if any(
                pw in word for pw in positive_words))
            negative_count = sum(1 for word in words if any(
                nw in word for nw in negative_words))
            educational_count = sum(1 for word in words if any(
                ew in word for ew in educational_words))

            total_sentiment_words = positive_count + negative_count

            if total_sentiment_words == 0:
                overall_sentiment = "neutral"
                confidence = 0.5
            elif positive_count > negative_count:
                overall_sentiment = "positive"
                confidence = positive_count / total_sentiment_words
            else:
                overall_sentiment = "negative"
                confidence = negative_count / total_sentiment_words

            emotional_tone = []
            # More than 1% educational words
            if educational_count > len(words) * 0.01:
                emotional_tone.append("educational")
            if positive_count > negative_count:
                emotional_tone.append("uplifting")
            else:
                emotional_tone.append("serious")

            return {
                "overall_sentiment": overall_sentiment,
                "emotional_tone": emotional_tone,
                "confidence_score": round(confidence, 2),
                "word_analysis": {
                    "positive_words": positive_count,
                    "negative_words": negative_count,
                    "educational_words": educational_count,
                    "total_words": len(words)
                }
            }
        except Exception as e:
            return {"error": f"Sentiment analysis failed: {e}"}

    def generate_structured_summary(self, video_id: str = None) -> dict:
        """Generate multi-level summaries (brief, detailed, technical)"""
        if not video_id:
            video_id = self.current_video_id

        if not video_id or not self.rag_chain:
            return {"error": "Video not processed"}

        try:
            # Generate different types of summaries
            brief_summary = self.ask(
                "Provide a brief 30-word summary of this video.")
            detailed_summary = self.ask(
                "Provide a detailed 200-word summary covering all main points.")
            key_takeaways = self.ask(
                "List the top 5 key takeaways from this video in bullet points.")
            technical_concepts = self.ask(
                "What technical concepts or terminology are explained in this video?")

            return {
                "brief_summary": brief_summary,
                "detailed_summary": detailed_summary,
                "key_takeaways": key_takeaways.split('\n') if key_takeaways else [],
                "technical_concepts": technical_concepts.split('\n') if technical_concepts else [],
                "generated_at": __import__('time').time()
            }
        except Exception as e:
            return {"error": f"Summary generation failed: {e}"}

    def get_video_analytics(self, video_id: str = None) -> dict:
        """Get comprehensive analytics for a video"""
        if not video_id:
            video_id = self.current_video_id

        if not video_id:
            return {"error": "No video specified"}

        video_stats = self.processed_videos.get(video_id, {})
        analytics = self.video_analytics.get(video_id, {})

        return {
            "video_stats": {
                "video_id": video_id,
                "language_code": video_stats.get("language_code", "unknown"),
                "word_count": video_stats.get("word_count", 0),
                "transcript_length": video_stats.get("transcript_length", 0),
                "processed_at": video_stats.get("processed_at", 0),
                "processing_time": analytics.get("processing_time", 0),
                "chunk_count": analytics.get("chunk_count", 0)
            },
            "interaction_stats": {
                "total_questions": analytics.get("questions_asked", 0),
                "topics_discussed": analytics.get("topics_discussed", []),
                "engagement_score": analytics.get("engagement_score", 0.0)
            }
        }

    def search_across_videos(self, query: str) -> list:
        """Search for information across all processed videos"""
        results = []

        for video_id in self.processed_videos.keys():
            try:
                # For each video, ask the question and get confidence score
                if video_id == self.current_video_id and self.rag_chain:
                    answer = self.ask(query)
                    confidence = 0.8  # Mock confidence score
                    results.append({
                        "video_id": video_id,
                        "answer": answer,
                        "confidence": confidence,
                        "relevant": True
                    })
            except Exception as e:
                continue

        # Sort by confidence score
        results.sort(key=lambda x: x.get("confidence", 0), reverse=True)
        return results

    def get_processed_videos_summary(self) -> dict:
        """Get summary of all processed videos"""
        return {
            "total_videos": len(self.processed_videos),
            "videos": list(self.processed_videos.keys()),
            "total_questions_asked": sum(
                analytics.get("questions_asked", 0)
                for analytics in self.video_analytics.values()
            ),
            "processing_stats": {
                video_id: {
                    "word_count": stats.get("word_count", 0),
                    "questions_asked": self.video_analytics.get(video_id, {}).get("questions_asked", 0)
                }
                for video_id, stats in self.processed_videos.items()
            }
        }

    def get_video_transcript(self, video_id: str) -> str:
        """Helper method to get transcript for analysis"""
        # This is a simplified version - in practice you'd store the transcript
        if video_id == self.current_video_id:
            try:
                return self.extract_transcript(video_id)
            except:
                return ""
        return ""

    def export_analytics(self, video_id: str = None) -> dict:
        """Export comprehensive analytics data"""
        if not video_id:
            video_id = self.current_video_id

        analytics = self.get_video_analytics(video_id)
        sentiment = self.analyze_video_sentiment(video_id)
        summary = self.generate_structured_summary(video_id)

        return {
            "video_id": video_id,
            "analytics": analytics,
            "sentiment_analysis": sentiment,
            "auto_summary": summary,
            "export_timestamp": __import__('time').time()
        }


def main():
    """Example usage of the YouTube RAG Chatbot"""

    # Initialize chatbot
    chatbot = YouTubeRAGChatbot()

    # Process a video
    video_id = "wjZofJX0v4M"  # Replace with your video ID
    chatbot.process_video(video_id)  # Uses default English language

    # Example questions
    questions = [
        "What is the main topic of this video?",
        "What is the summary of the video in at most 500 words?",
        "What key concepts are discussed?",
        "Are there any technical details explained?",
    ]

    # Ask questions
    print("\n" + "="*60)
    print("🎯 QUESTION & ANSWER SESSION")
    print("="*60)

    for question in questions:
        print(f"\n❓ Q: {question}")
        answer = chatbot.ask(question)
        print(f"🤖 A: {answer}")
        print("-" * 40)


if __name__ == "__main__":
    main()

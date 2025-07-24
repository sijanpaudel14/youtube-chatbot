"""
FastAPI backend for YouTube RAG Chatbot
Integrates with the existing main.py chatbot logic
"""
from main import YouTubeRAGChatbot
from youtube_utils import extract_video_id, validate_video_id
from typing import Optional, List
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException, Response
import sys
import os
from dotenv import load_dotenv

# Add parent directory to path to import our chatbot BEFORE importing main
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, parent_dir)

# Load environment from parent directory
env_path = os.path.join(parent_dir, ".env")
load_dotenv(env_path)

# Now import our modules after environment and path are set up


# Debug: Check if environment variable is loaded
google_api_key = os.getenv("GOOGLE_API_KEY")
print(
    f"DEBUG: GOOGLE_API_KEY loaded: {'Yes' if google_api_key else 'No'
                                     }"
)
if google_api_key:
    print(f"DEBUG: API Key starts with: {google_api_key[:10]}...")

app = FastAPI(title="YouTube RAG Chatbot API", version="4.0.0")

# Add CORS middleware to allow frontend connections

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "https://youtube-chatbot-kappa.vercel.app",
        "https://youtube-chatbot-b8het3dg3-sijan-paudels-projects.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

chatbot_instances = {}


class VideoProcessRequest(BaseModel):
    video_url: str
    language_code: str = "en"  # Default to English
    translate_to_english: bool = True  # Default to translate


class TranscriptListRequest(BaseModel):
    video_url: str


class ChatRequest(BaseModel):
    video_id: str
    question: str


class VideoProcessResponse(BaseModel):
    success: bool
    video_id: str
    message: str


class ChatResponse(BaseModel):
    answer: str
    video_id: str


class TimestampInfo(BaseModel):
    start_time: float
    end_time: float
    formatted: str
    text_segment: str


class ChatResponseWithTimestamps(BaseModel):
    answer: str
    video_id: str
    timestamps: List[TimestampInfo]
    question: str


# Enhanced API Models
class AnalyticsResponse(BaseModel):
    video_stats: dict
    interaction_stats: dict


class SentimentResponse(BaseModel):
    overall_sentiment: str
    emotional_tone: list
    confidence_score: float
    word_analysis: dict


class SummaryResponse(BaseModel):
    brief_summary: str
    detailed_summary: str
    key_takeaways: list
    technical_concepts: list
    generated_at: float


class MultiVideoSearchRequest(BaseModel):
    query: str
    video_ids: Optional[list] = None


class MultiVideoSearchResponse(BaseModel):
    results: list
    total_videos_searched: int


@app.get("/")
async def root():
    return {"message": "YouTube RAG Chatbot API is running!", "version": "4.0"}


@app.options("/api/transcripts")
async def transcripts_options(response: Response):
    """Handle CORS preflight for transcripts endpoint"""
    return {"message": "OK"}


@app.post("/api/transcripts")
async def get_available_transcripts(request: TranscriptListRequest):
    """
    Get all available transcripts for a YouTube video
    """
    try:
        print(f"📋 Getting transcripts for URL: {request.video_url}")

        # Extract video ID from URL
        video_id = extract_video_id(request.video_url)
        print(f"📋 Extracted video ID: {video_id}")

        if not validate_video_id(video_id):
            raise HTTPException(
                status_code=400, detail="Invalid video ID extracted from URL"
            )

        # Create a temporary chatbot instance to get transcripts
        print("📋 Creating chatbot instance...")
        chatbot = YouTubeRAGChatbot()
        print("📋 Getting available transcripts...")
        available_transcripts = chatbot.get_available_transcripts(video_id)
        print(f"📋 Found {len(available_transcripts)} transcripts")

        return {
            "success": True,
            "video_id": video_id,
            "available_transcripts": available_transcripts,
        }

    except ValueError as e:
        print(f"❌ ValueError in transcripts: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"❌ Exception in transcripts: {str(e)}")
        print(f"❌ Exception type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to get transcripts: {str(e)}"
        )


@app.options("/api/process")
async def process_options(response: Response):
    """Handle CORS preflight for process endpoint"""
    return {"message": "OK"}


@app.post("/api/process", response_model=VideoProcessResponse)
async def process_video(request: VideoProcessRequest):
    """
    Process a YouTube video and prepare it for Q&A
    """
    try:
        # Extract video ID from URL
        video_id = extract_video_id(request.video_url)

        if not validate_video_id(video_id):
            raise HTTPException(
                status_code=400, detail="Invalid video ID extracted from URL"
            )

        # Check if we already have this video processed
        if video_id in chatbot_instances:
            return VideoProcessResponse(
                success=True,
                video_id=video_id,
                message="Video already processed and ready for Q&A",
            )

        # Create and process chatbot
        print(f"🔧 Creating chatbot instance for video: {video_id}")
        chatbot = YouTubeRAGChatbot()
        print(f"🔧 Processing video with language: {request.language_code}")
        try:
            chatbot.process_video(
                video_id, request.language_code, request.translate_to_english
            )
            print(f"✅ Video processing completed successfully")
        except Exception as process_error:
            print(f"❌ Error during video processing: {str(process_error)}")
            print(f"❌ Error type: {type(process_error).__name__}")
            raise HTTPException(
                status_code=500, detail=f"Video processing failed: {str(process_error)}"
            )

        # Store the chatbot instance
        chatbot_instances[video_id] = chatbot

        return VideoProcessResponse(
            success=True,
            video_id=video_id,
            message=f"Video processed successfully with {request.language_code} transcript and ready for Q&A",
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to process video: {str(e)}"
        )


@app.options("/api/chat")
async def chat_options(response: Response):
    """Handle CORS preflight for chat endpoint"""
    return {"message": "OK"}


@app.options("/api/chat/timestamps")
async def chat_timestamps_options(response: Response):
    """Handle CORS preflight for chat with timestamps endpoint"""
    return {"message": "OK"}


@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_video(request: ChatRequest):
    # Add this line
    print(
        f"📩 Incoming question for video {request.video_id}: {request.question}")

    try:
        if request.video_id not in chatbot_instances:
            raise HTTPException(
                status_code=404,
                detail="Video not found. Please process the video first.",
            )

        chatbot = chatbot_instances[request.video_id]
        answer = chatbot.ask(request.question)

        print(f"🤖 Answer generated: {answer}")  # Also log response

        return ChatResponse(answer=answer, video_id=request.video_id)

    except Exception as e:
        print(f"❌ Chat error: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to generate answer: {str(e)}"
        )


@app.post("/api/chat/timestamps", response_model=ChatResponseWithTimestamps)
async def chat_with_video_timestamps(request: ChatRequest):
    """Chat with video and return answer with timestamp information"""
    print(
        f"📩 Incoming question with timestamps for video {request.video_id}: {request.question}")

    try:
        if request.video_id not in chatbot_instances:
            raise HTTPException(
                status_code=404,
                detail="Video not found. Please process the video first.",
            )

        chatbot = chatbot_instances[request.video_id]

        # Use the new method that returns timestamps
        if hasattr(chatbot, 'ask_with_timestamps'):
            result = chatbot.ask_with_timestamps(request.question)

            # Convert timestamps to the required format
            timestamp_infos = []
            for ts in result.get('timestamps', []):
                timestamp_infos.append(TimestampInfo(
                    start_time=ts['start_time'],
                    end_time=ts['end_time'],
                    formatted=ts['formatted'],
                    text_segment=ts['text_segment']
                ))

            return ChatResponseWithTimestamps(
                answer=result['answer'],
                video_id=result['video_id'],
                timestamps=timestamp_infos,
                question=result['question']
            )
        else:
            # Fallback to regular chat if timestamps not supported
            answer = chatbot.ask(request.question)
            return ChatResponseWithTimestamps(
                answer=answer,
                video_id=request.video_id,
                timestamps=[],
                question=request.question
            )

    except Exception as e:
        print(f"❌ Chat with timestamps error: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to generate answer with timestamps: {str(e)}"
        )


@app.get("/api/status/{video_id}")
async def get_video_status(video_id: str):
    """
    Check if a video is processed and ready for Q&A
    """
    is_ready = video_id in chatbot_instances
    return {
        "video_id": video_id,
        "is_ready": is_ready,
        "message": "Video is ready for Q&A" if is_ready else "Video not processed yet",
    }


@app.delete("/api/clear/{video_id}")
async def clear_video(video_id: str):
    """
    Clear a processed video from memory
    """
    if video_id in chatbot_instances:
        del chatbot_instances[video_id]
        return {"message": f"Video {video_id} cleared from memory"}
    else:
        raise HTTPException(status_code=404, detail="Video not found")


@app.get("/api/videos")
async def list_processed_videos():
    """
    List all currently processed videos
    """
    # Enhanced with analytics summary
    video_summaries = {}
    for video_id, chatbot in chatbot_instances.items():
        if hasattr(chatbot, 'get_video_analytics'):
            analytics = chatbot.get_video_analytics(video_id)
            video_summaries[video_id] = analytics
        else:
            video_summaries[video_id] = {"status": "processed"}

    return {
        "processed_videos": list(chatbot_instances.keys()),
        "count": len(chatbot_instances),
        "video_summaries": video_summaries
    }


# ==================== ENHANCED API ENDPOINTS ====================

@app.get("/api/analytics/{video_id}", response_model=AnalyticsResponse)
async def get_video_analytics(video_id: str):
    """
    Get comprehensive analytics for a processed video
    """
    try:
        if video_id not in chatbot_instances:
            raise HTTPException(
                status_code=404,
                detail="Video not found. Please process the video first."
            )

        chatbot = chatbot_instances[video_id]
        analytics = chatbot.get_video_analytics(video_id)

        if "error" in analytics:
            raise HTTPException(status_code=500, detail=analytics["error"])

        return AnalyticsResponse(
            video_stats=analytics["video_stats"],
            interaction_stats=analytics["interaction_stats"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Analytics error: {str(e)}")


@app.get("/api/sentiment/{video_id}", response_model=SentimentResponse)
async def get_video_sentiment(video_id: str):
    """
    Analyze sentiment and emotional tone of a video
    """
    try:
        if video_id not in chatbot_instances:
            raise HTTPException(
                status_code=404,
                detail="Video not found. Please process the video first."
            )

        chatbot = chatbot_instances[video_id]
        sentiment = chatbot.analyze_video_sentiment(video_id)

        if "error" in sentiment:
            raise HTTPException(status_code=500, detail=sentiment["error"])

        return SentimentResponse(
            overall_sentiment=sentiment["overall_sentiment"],
            emotional_tone=sentiment["emotional_tone"],
            confidence_score=sentiment["confidence_score"],
            word_analysis=sentiment["word_analysis"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Sentiment analysis error: {str(e)}")


@app.get("/api/summary/{video_id}", response_model=SummaryResponse)
async def get_video_summary(video_id: str):
    """
    Generate structured summary of a video
    """
    try:
        if video_id not in chatbot_instances:
            raise HTTPException(
                status_code=404,
                detail="Video not found. Please process the video first."
            )

        chatbot = chatbot_instances[video_id]
        summary = chatbot.generate_structured_summary(video_id)

        if "error" in summary:
            raise HTTPException(status_code=500, detail=summary["error"])

        return SummaryResponse(
            brief_summary=summary["brief_summary"],
            detailed_summary=summary["detailed_summary"],
            key_takeaways=summary["key_takeaways"],
            technical_concepts=summary["technical_concepts"],
            generated_at=summary["generated_at"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Summary generation error: {str(e)}")


@app.post("/api/search", response_model=MultiVideoSearchResponse)
async def search_across_videos(request: MultiVideoSearchRequest):
    """
    Search for information across multiple processed videos
    """
    try:
        all_results = []
        videos_searched = 0

        # If specific video IDs provided, search only those
        target_videos = request.video_ids if request.video_ids else list(
            chatbot_instances.keys())

        for video_id in target_videos:
            if video_id in chatbot_instances:
                chatbot = chatbot_instances[video_id]
                try:
                    # Search this specific video
                    if hasattr(chatbot, 'search_across_videos'):
                        results = chatbot.search_across_videos(request.query)
                        all_results.extend(results)
                    else:
                        # Fallback to regular ask method
                        answer = chatbot.ask(request.query)
                        all_results.append({
                            "video_id": video_id,
                            "answer": answer,
                            "confidence": 0.7,
                            "relevant": True
                        })
                    videos_searched += 1
                except Exception as e:
                    print(f"Error searching video {video_id}: {e}")
                    continue

        # Sort by confidence score
        all_results.sort(key=lambda x: x.get("confidence", 0), reverse=True)

        return MultiVideoSearchResponse(
            results=all_results,
            total_videos_searched=videos_searched
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Multi-video search error: {str(e)}")


@app.get("/api/dashboard")
async def get_dashboard_data():
    """
    Get comprehensive dashboard data for all processed videos
    """
    try:
        dashboard_data = {
            "total_videos": len(chatbot_instances),
            "videos": [],
            "system_stats": {
                "total_questions_asked": 0,
                "avg_processing_time": 0,
                "total_words_processed": 0
            }
        }

        processing_times = []
        total_questions = 0
        total_words = 0

        for video_id, chatbot in chatbot_instances.items():
            try:
                if hasattr(chatbot, 'get_video_analytics'):
                    analytics = chatbot.get_video_analytics(video_id)
                    sentiment = chatbot.analyze_video_sentiment(video_id)

                    video_data = {
                        "video_id": video_id,
                        "analytics": analytics,
                        "sentiment": sentiment,
                        "status": "ready"
                    }

                    # Aggregate stats
                    if "video_stats" in analytics:
                        processing_times.append(
                            analytics["video_stats"].get("processing_time", 0))
                        total_questions += analytics["interaction_stats"].get(
                            "total_questions", 0)
                        total_words += analytics["video_stats"].get(
                            "word_count", 0)
                else:
                    video_data = {
                        "video_id": video_id,
                        "status": "processed",
                        "analytics": {},
                        "sentiment": {}
                    }

                dashboard_data["videos"].append(video_data)
            except Exception as e:
                print(f"Error getting data for video {video_id}: {e}")
                continue

        # Calculate system stats
        dashboard_data["system_stats"]["total_questions_asked"] = total_questions
        dashboard_data["system_stats"]["avg_processing_time"] = (
            sum(processing_times) /
            len(processing_times) if processing_times else 0
        )
        dashboard_data["system_stats"]["total_words_processed"] = total_words

        return dashboard_data
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Dashboard error: {str(e)}")


@app.get("/api/export/{video_id}")
async def export_video_data(video_id: str):
    """
    Export comprehensive data for a video
    """
    try:
        if video_id not in chatbot_instances:
            raise HTTPException(
                status_code=404,
                detail="Video not found. Please process the video first."
            )

        chatbot = chatbot_instances[video_id]

        if hasattr(chatbot, 'export_analytics'):
            export_data = chatbot.export_analytics(video_id)
        else:
            # Fallback export
            export_data = {
                "video_id": video_id,
                "status": "processed",
                "export_timestamp": __import__('time').time()
            }

        return export_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export error: {str(e)}")


@app.get("/api/videos")
async def list_processed_videos():
    """
    List all processed videos
    """
    try:
        processed_videos = list(chatbot_instances.keys())
        return {
            "processed_videos": processed_videos,
            "total_count": len(processed_videos)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to list videos: {str(e)}")


# Enhanced CORS options for new endpoints
@app.options("/api/analytics/{video_id}")
async def analytics_options():
    return {"message": "OK"}


@app.options("/api/sentiment/{video_id}")
async def sentiment_options():
    return {"message": "OK"}


@app.options("/api/summary/{video_id}")
async def summary_options():
    return {"message": "OK"}


@app.options("/api/search")
async def search_options():
    return {"message": "OK"}


@app.options("/api/dashboard")
async def dashboard_options():
    return {"message": "OK"}


@app.options("/api/export/{video_id}")
async def export_options():
    return {"message": "OK"}


@app.options("/api/videos")
async def videos_options():
    return {"message": "OK"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

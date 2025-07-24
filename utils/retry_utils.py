"""
Retry utilities with exponential backoff and jitter.
Provides reusable retry mechanisms for handling API rate limits and temporary failures.
"""

import time
import random
from typing import Callable, Any, Tuple, Union, Optional
from functools import wraps


import time
import random
from typing import Callable, Optional, Union, Tuple, Any


def retry_with_backoff(
    func: Callable,
    *args,
    max_retries: int = 5,
    handle_errors: Optional[Union[str, Tuple[str, ...]]] = (
        "quota", "429", "temporarily", "rate limit", "residential"),
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    **kwargs
) -> Any:
    """
    Retry a function with exponential backoff and jitter on specified errors.

    Parameters:
        func (callable): The function to retry.
        *args: Positional arguments for the function.
        max_retries (int): Maximum retry attempts.
        handle_errors (str or tuple): Error substrings that trigger retry.
        base_delay (float): Base delay in seconds.
        max_delay (float): Maximum delay in seconds.
        **kwargs: Keyword arguments for the function.

    Returns:
        The return value of func if successful.

    Raises:
        The last exception if all retries fail or an unretryable error occurs.
    """
    last_exception = None

    for attempt in range(max_retries):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            last_exception = e
            err_str = str(e).lower()

            if handle_errors:
                if isinstance(handle_errors, tuple):
                    should_retry = any(pat in err_str for pat in handle_errors)
                else:
                    should_retry = handle_errors in err_str
            else:
                should_retry = True  # Retry all errors if no patterns specified

            if not should_retry or attempt == max_retries - 1:
                raise e

            delay = min(base_delay * (2 ** attempt), max_delay)
            jitter = random.uniform(0, 0.1 * delay)
            total_delay = delay + jitter

            print(
                f"⏳ Retry {attempt + 1}/{max_retries} after {total_delay:.2f}s due to error: {e}")
            time.sleep(total_delay)

    raise last_exception


def retry_decorator(
    max_retries: int = 5,
    handle_errors: Optional[Union[str, Tuple[str, ...]]] = None,
    base_delay: float = 1.0,
    max_delay: float = 60.0
):
    """
    Decorator version of retry_with_backoff.

    Parameters:
        max_retries (int): Maximum retry attempts (default: 5).
        handle_errors (str or tuple): Error types or string patterns to retry on.
        base_delay (float): Base delay in seconds (default: 1.0).
        max_delay (float): Maximum delay in seconds (default: 60.0).

    Example:
        >>> @retry_decorator(max_retries=3, handle_errors=("quota", "429"))
        ... def api_call():
        ...     # Some API call that might fail
        ...     pass
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            return retry_with_backoff(
                func, *args,
                max_retries=max_retries,
                handle_errors=handle_errors,
                base_delay=base_delay,
                max_delay=max_delay,
                **kwargs
            )
        return wrapper
    return decorator


# Specific retry functions for common use cases
def youtube_transcript_retry(func: Callable, *args, **kwargs) -> Any:
    """
    Specialized retry function for YouTube Transcript API calls.

    Example:
        >>> transcript = youtube_transcript_retry(
        ...     ytt_api.fetch, video_id, languages=['en']
        ... )
    """
    return retry_with_backoff(
        func, *args,
        max_retries=5,
        handle_errors=("quota", "429", "temporarily",
                       "proxy", "502", "gateway"),
        **kwargs
    )


def embedding_retry(func: Callable, *args, **kwargs) -> Any:
    """
    Specialized retry function for embedding API calls.

    Example:
        >>> embedding = embedding_retry(
        ...     embedding_model.embed_query, text
        ... )
    """
    return retry_with_backoff(
        func, *args,
        max_retries=5,
        handle_errors=("quota", "429", "temporarily",
                       "proxy", "502", "gateway"),
        base_delay=2.0,
        **kwargs
    )


def llm_retry(func: Callable, *args, **kwargs) -> Any:
    """
    Specialized retry function for LLM API calls.

    Example:
        >>> response = llm_retry(
        ...     llm.invoke, prompt
        ... )
    """
    return retry_with_backoff(
        func, *args,
        max_retries=3,
        handle_errors=("quota", "429", "rate limit"),
        base_delay=1.0,
        **kwargs
    )

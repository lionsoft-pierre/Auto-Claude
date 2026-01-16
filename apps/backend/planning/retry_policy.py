"""
Retry Policy for Sprint Execution (Story 5.4)
Implements exponential backoff with jitter for transient error handling.
"""

import asyncio
import random
from enum import Enum
from typing import Callable, TypeVar, Awaitable

T = TypeVar('T')


class ErrorType(Enum):
    """Classification of errors for retry logic."""
    TRANSIENT = "transient"  # Network, timeout, rate limit - retry these
    PERMANENT = "permanent"  # Code error, test failure - don't retry


class RetryPolicy:
    """
    Retry policy with exponential backoff for transient errors.

    Follows NFR6: Retry logic with exponential backoff for transient errors.
    """

    def __init__(
        self,
        max_retries: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        jitter: bool = True,
    ):
        """
        Initialize retry policy.

        Args:
            max_retries: Maximum number of retry attempts (default: 3)
            base_delay: Base delay in seconds for exponential backoff (default: 1.0)
            max_delay: Maximum delay cap in seconds (default: 60.0)
            jitter: Whether to add random jitter to delays (default: True)
        """
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.jitter = jitter

    def calculate_delay(self, attempt: int) -> float:
        """
        Calculate delay with exponential backoff.

        Args:
            attempt: Current attempt number (0-indexed)

        Returns:
            Delay in seconds before next retry
        """
        # Exponential backoff: base_delay * 2^attempt
        delay = min(self.base_delay * (2 ** attempt), self.max_delay)

        # Add jitter: multiply by random factor between 0.5 and 1.5
        if self.jitter:
            delay = delay * (0.5 + random.random())

        return delay

    async def execute_with_retry(
        self,
        func: Callable[[], Awaitable[T]],
        classify_error: Callable[[Exception], ErrorType],
        on_retry: Callable[[int, Exception, float], None] | None = None,
    ) -> T:
        """
        Execute a function with retry logic.

        Args:
            func: Async function to execute
            classify_error: Function to classify exceptions as transient/permanent
            on_retry: Optional callback for retry events (attempt, error, delay)

        Returns:
            Result of the function

        Raises:
            The last exception if all retries are exhausted or error is permanent
        """
        last_error: Exception | None = None

        for attempt in range(self.max_retries + 1):
            try:
                return await func()
            except Exception as e:
                last_error = e
                error_type = classify_error(e)

                if error_type == ErrorType.PERMANENT:
                    # Don't retry permanent errors (code bugs, test failures)
                    raise

                if attempt < self.max_retries:
                    # Calculate delay and wait
                    delay = self.calculate_delay(attempt)

                    # Notify about retry
                    if on_retry:
                        on_retry(attempt + 1, e, delay)

                    await asyncio.sleep(delay)
                else:
                    # Max retries exceeded
                    raise

        # Should never reach here, but just in case
        if last_error:
            raise last_error
        raise RuntimeError("Unexpected state in retry policy")

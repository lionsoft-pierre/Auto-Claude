"""
Error Classifier for Sprint Execution (Story 5.4)
Classifies errors as transient (retry) or permanent (fail immediately).
"""

from .retry_policy import ErrorType


# Patterns that indicate transient errors (should be retried)
TRANSIENT_PATTERNS = [
    # Network errors
    'timeout', 'timed out', 'timedout',
    'connection reset', 'connection refused', 'connection closed',
    'connection error', 'network error', 'network unreachable',
    'socket error', 'socket timeout',

    # Rate limiting
    'rate limit', 'rate_limit', 'too many requests',
    'throttl', 'quota exceeded',

    # Server errors (often transient)
    '502', '503', '504',
    'bad gateway', 'service unavailable', 'gateway timeout',
    'temporarily unavailable', 'temporary error',

    # API errors
    'overloaded', 'capacity', 'retry',
    'internal server error',
]

# Exception types that are always transient
TRANSIENT_EXCEPTION_TYPES = (
    TimeoutError,
    ConnectionError,
    ConnectionResetError,
    ConnectionRefusedError,
    BrokenPipeError,
)


def classify_error(error: Exception) -> ErrorType:
    """
    Classify an error as transient or permanent.

    Transient errors (retry):
    - Network timeouts and connection errors
    - Rate limiting and quota errors
    - Server errors (502, 503, 504)
    - Temporary unavailability

    Permanent errors (don't retry):
    - Code errors (syntax, type, attribute)
    - Test failures
    - Assertion errors
    - File not found
    - Permission errors
    - Validation errors

    Args:
        error: The exception to classify

    Returns:
        ErrorType.TRANSIENT if the error should be retried
        ErrorType.PERMANENT if the error should fail immediately
    """
    # Check for specific transient exception types
    if isinstance(error, TRANSIENT_EXCEPTION_TYPES):
        return ErrorType.TRANSIENT

    # Check error message for transient patterns
    error_str = str(error).lower()
    for pattern in TRANSIENT_PATTERNS:
        if pattern in error_str:
            return ErrorType.TRANSIENT

    # Check nested exception causes
    cause = error.__cause__
    if cause and isinstance(cause, TRANSIENT_EXCEPTION_TYPES):
        return ErrorType.TRANSIENT

    # Default to permanent (code errors, test failures, etc.)
    # This is safer as we don't want to retry actual bugs
    return ErrorType.PERMANENT


def is_qa_failure(error: Exception) -> bool:
    """
    Check if an error represents a QA validation failure.

    QA failures are permanent but expected - they mean the code
    doesn't meet acceptance criteria, not a system error.

    Args:
        error: The exception to check

    Returns:
        True if this is a QA validation failure
    """
    error_str = str(error).lower()

    qa_patterns = [
        'qa failed', 'qa validation failed',
        'acceptance criteria not met',
        'test failed', 'tests failed',
        'assertion failed', 'assertionerror',
    ]

    return any(pattern in error_str for pattern in qa_patterns)


def get_error_summary(error: Exception) -> str:
    """
    Get a user-friendly summary of an error.

    Args:
        error: The exception to summarize

    Returns:
        A brief, readable error summary
    """
    error_type = classify_error(error)
    error_str = str(error)

    # Truncate very long error messages
    if len(error_str) > 200:
        error_str = error_str[:200] + "..."

    if error_type == ErrorType.TRANSIENT:
        return f"Transient error (will retry): {error_str}"
    elif is_qa_failure(error):
        return f"QA validation failed: {error_str}"
    else:
        return f"Error: {error_str}"

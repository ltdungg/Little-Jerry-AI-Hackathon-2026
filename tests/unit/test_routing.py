import pytest

# Example classification test
def test_intent_classification():
    # from npo_platform.routing import classify_intent
    messages = [
        ("What is the procurement policy?", "knowledge_search"),
        ("Show overdue tasks for Green Hope", "task_query"),
    ]
    for msg, expected in messages:
        # assert classify_intent(msg) == expected
        pass

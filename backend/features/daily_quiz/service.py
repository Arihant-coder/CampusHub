"""
Business logic for the Daily Quiz feature.
"""

from fastapi import HTTPException

from features.daily_quiz.schemas import (
    QuestionFeedback,
    QuizSubmissionRequest,
    QuizSubmissionResponse,
)


# Temporary questions for local development.
# Correct answers remain on the backend.
SAMPLE_QUESTIONS = [
    {
        "id": "q1",
        "question": "Which data structure follows FIFO?",
        "options": ["Stack", "Queue", "Tree", "Graph"],
        "correct_answer_index": 1,
        "explanation": "A queue follows First In, First Out (FIFO).",
    },
    {
        "id": "q2",
        "question": "Which keyword is used to inherit a class in Java?",
        "options": ["implements", "inherits", "extends", "super"],
        "correct_answer_index": 2,
        "explanation": "Java uses the extends keyword for class inheritance.",
    },
    {
        "id": "q3",
        "question": "What is the average time complexity of binary search?",
        "options": ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
        "correct_answer_index": 1,
        "explanation": "Binary search halves the search space at each step.",
    },
    {
        "id": "q4",
        "question": "Which SQL clause filters grouped results?",
        "options": ["WHERE", "ORDER BY", "HAVING", "DISTINCT"],
        "correct_answer_index": 2,
        "explanation": "HAVING filters groups after GROUP BY is applied.",
    },
    {
        "id": "q5",
        "question": "Which Python keyword defines a function?",
        "options": ["func", "function", "def", "method"],
        "correct_answer_index": 2,
        "explanation": "Python uses def to define a function.",
    },
]


def get_today_questions() -> list[dict]:
    """
    Return today's questions without revealing correct answers
    or explanations before submission.
    """

    return [
        {
            "id": question["id"],
            "question": question["question"],
            "options": question["options"],
        }
        for question in SAMPLE_QUESTIONS
    ]


def submit_quiz(
    request: QuizSubmissionRequest,
) -> QuizSubmissionResponse:
    """
    Evaluate submitted answers and return the score.
    """

    question_map = {
        question["id"]: question
        for question in SAMPLE_QUESTIONS
    }

    # Validate question IDs and selected option indexes.
    for question_id, selected_index in request.answers.items():

        if question_id not in question_map:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown question ID: {question_id}",
            )

        options = question_map[question_id]["options"]

        if selected_index < 0 or selected_index >= len(options):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid answer index for question {question_id}",
            )

    # Calculate the score and per-question feedback using backend-held correct answers.
    score = 0
    details = {}
    for question_id, question in question_map.items():
        correct_idx = question["correct_answer_index"]
        user_idx = request.answers.get(question_id)
        is_correct = user_idx == correct_idx
        if is_correct:
            score += 1
        details[question_id] = QuestionFeedback(
            is_correct=is_correct,
            correct_answer_index=correct_idx,
            explanation=question.get("explanation", ""),
        )

    return QuizSubmissionResponse(
        score=score,
        total=len(question_map),
        streak_count=1,
        details=details,
    )
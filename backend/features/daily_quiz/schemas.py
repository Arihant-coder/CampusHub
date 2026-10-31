"""
Request and response schemas for the Daily Quiz feature.
"""

from typing import Dict

from pydantic import BaseModel, Field, ConfigDict, field_validator


class QuizQuestion(BaseModel):
    """A single quiz question."""

    id: str
    question: str
    options: list[str]


class TodayQuizResponse(BaseModel):
    """Response containing today's quiz."""

    date: str
    questions: list[QuizQuestion]


class QuizSubmissionRequest(BaseModel):
    """Answers submitted by a student."""

    answers: Dict[str, int] = Field(
        ...,
        min_length=1,
        description="Mapping of question IDs to selected option indexes.",
    )

    @field_validator("answers")
    @classmethod
    def validate_answers(cls, answers: Dict[str, int]) -> Dict[str, int]:
        for question_id, selected_index in answers.items():
            if not question_id.strip():
                raise ValueError("Question IDs cannot be empty.")

            if selected_index < 0:
                raise ValueError("Answer indexes cannot be negative.")

        return answers


class QuestionFeedback(BaseModel):
    """Evaluation feedback for a single question."""

    is_correct: bool
    correct_answer_index: int
    explanation: str


class QuizSubmissionResponse(BaseModel):
    """Result returned after submitting a quiz."""

    score: int
    total: int
    streak_count: int
    details: Dict[str, QuestionFeedback] = Field(default_factory=dict)


class QuizSubmissionRecord(BaseModel):
    """Internal representation of a quiz submission."""

    model_config = ConfigDict(extra="ignore")

    user_id: str
    quiz_date: str
    score: int
    total_questions: int
    answers: Dict[str, int]

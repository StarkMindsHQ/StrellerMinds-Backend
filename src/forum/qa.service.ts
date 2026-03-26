// src/forum/qa.service.ts

import { Question, Answer } from './types';
import { v4 as uuid } from 'uuid';

export class QAService {
  private questions: Question[] = [];
  private answers: Answer[] = [];

  askQuestion(authorId: string, title: string, content: string) {
    const question: Question = {
      id: uuid(),
      authorId,
      title,
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'ACTIVE',
      votes: 0,
      bookmarks: 0,
    };

    this.questions.push(question);
    return question;
  }

  answerQuestion(authorId: string, questionId: string, content: string) {
    const answer: Answer = {
      id: uuid(),
      authorId,
      title: '',
      content,
      questionId,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'ACTIVE',
      votes: 0,
      bookmarks: 0,
    };

    this.answers.push(answer);
    return answer;
  }

  acceptAnswer(questionId: string, answerId: string) {
    const question = this.questions.find((q) => q.id === questionId);
    if (!question) throw new Error('Question not found');

    question.acceptedAnswerId = answerId;
    return question;
  }

  getAnswers(questionId: string) {
    return this.answers.filter((a) => a.questionId === questionId);
  }
}

export type MCQData = {
    type: 'mcq';
    id: string;
    topic: string;
    question: string;
    options: string[];
    answerKey: string;
    marks?: number;
};

export type OneLinerData = {
    acceptedAnswers: string[];
    type: 'oneLiner';
    id: string;
    topic: string;
    question: string;
    keywords: string[];
    caseSensitive?: boolean;
    answerKey:string;
    marks?: number;
};

export type FillBlankData = {
    correctAnswer: string;
    caseSensitive: unknown;
    type: 'fillBlank';
    id: string;
    topic: string;
    sentence: string;
    blank: string;
    acceptable: string[];
    answerKey:string;
    marks?: number;
};

export type QuestionUnion = MCQData | OneLinerData | FillBlankData;

export type ScorePayload = {
    llmConfirmed: any;
    questionId: string;
    answer: string;
    correct: boolean;
    score: number;
    feedback?: string;
};



export interface GeminiResponse {
  candidates?: GeminiCandidate[];
  output?: any[];
  text?: string;
}

export interface GeminiCandidate {
  content?: {
    parts?: { text?: string }[];
  }[];
  output?: any[];
}

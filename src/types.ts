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
    type: 'oneLiner';
    id: string;
    topic: string;
    question: string;
    keywords: string[];
    caseSensitive?: boolean;
    marks?: number;
};

export type FillBlankData = {
    type: 'fillBlank';
    id: string;
    topic: string;
    sentence: string;
    blank: string;
    acceptable: string[];
    marks?: number;
};

export type QuestionUnion = MCQData | OneLinerData | FillBlankData;

export type ScorePayload = {
    questionId: string;
    given: string;
    correct: boolean;
    score: number;
    feedback?: string;
};
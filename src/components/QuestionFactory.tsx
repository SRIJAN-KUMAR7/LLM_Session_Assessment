import { MCQCard } from './MCQCard';
import { OneLinerCard } from './OneLinerCard';
import { FillBlankCard } from './FillBlankCard';
import type { QuestionUnion, ScorePayload } from '../types';

export function QuestionFactory(props: {
  question: QuestionUnion;
  onAnswer: (p: ScorePayload) => void;
}) {
  const { question, onAnswer } = props;

  switch (question.type) {
    case 'mcq':
      return <MCQCard data={question} onAnswer={onAnswer} />;
    case 'oneLiner':
      return <OneLinerCard data={question} onAnswer={onAnswer} />;
    case 'fillBlank':
      return <FillBlankCard data={question} onAnswer={onAnswer} />;
    default:
      return null;
  }
}

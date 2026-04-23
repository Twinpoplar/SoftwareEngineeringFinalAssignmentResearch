import { Flag } from 'lucide-react';
import type { Question, AttemptAnswer } from '../../types';

interface AnswerSheetProps {
  questions: Question[];
  answers: Record<string, AttemptAnswer>;
  currentIndex: number;
  onJump: (index: number) => void;
}

export function AnswerSheet({ questions, answers, currentIndex, onJump }: AnswerSheetProps) {
  const getStatus = (q: Question) => {
    const a = answers[q.id];
    if (!a || a.answer === null || a.answer === undefined) return 'unanswered';
    if (a.is_flagged) return 'flagged';
    const hasAnswer = Array.isArray(a.answer) ? a.answer.length > 0 : a.answer !== '';
    return hasAnswer ? 'answered' : 'unanswered';
  };

  const answered = questions.filter((q) => getStatus(q) === 'answered').length;
  const flagged = questions.filter((q) => getStatus(q) === 'flagged').length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full flex flex-col">
      <h3 className="font-semibold text-gray-900 mb-3">Answer Sheet</h3>

      <div className="grid grid-cols-3 gap-2 text-xs mb-4">
        <div className="text-center">
          <div className="text-lg font-bold text-emerald-600">{answered}</div>
          <div className="text-gray-400">Answered</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-amber-500">{flagged}</div>
          <div className="text-gray-400">Flagged</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-gray-400">{questions.length - answered - flagged}</div>
          <div className="text-gray-400">Skipped</div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1.5 overflow-y-auto flex-1">
        {questions.map((q, i) => {
          const status = getStatus(q);
          const isCurrent = i === currentIndex;

          return (
            <button
              key={q.id}
              onClick={() => onJump(i)}
              title={`Question ${i + 1}`}
              className={`
                aspect-square flex items-center justify-center rounded-lg text-xs font-bold transition-all relative
                ${isCurrent ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                ${
                  status === 'answered'
                    ? 'bg-emerald-500 text-white'
                    : status === 'flagged'
                    ? 'bg-amber-400 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }
              `}
            >
              {i + 1}
              {status === 'flagged' && (
                <Flag className="w-2.5 h-2.5 absolute top-0.5 right-0.5 text-white" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-4 h-4 bg-emerald-500 rounded" />
          <span>Answered</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-4 h-4 bg-amber-400 rounded flex items-center justify-center">
            <Flag className="w-2.5 h-2.5 text-white" />
          </div>
          <span>Flagged for review</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-4 h-4 bg-gray-100 rounded border border-gray-200" />
          <span>Not answered</span>
        </div>
      </div>
    </div>
  );
}

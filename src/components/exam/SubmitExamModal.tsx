import { useState, useEffect, useCallback } from 'react';
import { Send, AlertTriangle, CheckCircle, Clock, Shield } from 'lucide-react';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

interface SubmitExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  unansweredCount: number;
  totalQuestions: number;
  isSubmitting: boolean;
  timeRemaining?: number;
}

export function SubmitExamModal({
  isOpen,
  onClose,
  onSubmit,
  unansweredCount,
  totalQuestions,
  isSubmitting,
  timeRemaining,
}: SubmitExamModalProps) {
  const [confirmCode, setConfirmCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isCodeRequired, setIsCodeRequired] = useState(false);
  const [holdTimer, setHoldTimer] = useState(0);
  const [isHolding, setIsHolding] = useState(false);

  const answeredCount = totalQuestions - unansweredCount;

  const handleSubmit = useCallback(() => {
    if (isCodeRequired && confirmCode !== generatedCode) {
      return;
    }
    onSubmit();
  }, [isCodeRequired, confirmCode, generatedCode, onSubmit]);

  useEffect(() => {
    // 生成随机确认码
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setGeneratedCode(code);
    setIsCodeRequired(unansweredCount > 0 || (typeof timeRemaining === 'number' && timeRemaining < 300)); // 少于5分钟需要确认码
  }, [unansweredCount, timeRemaining]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isHolding && holdTimer < 3) {
      interval = setInterval(() => {
        setHoldTimer(prev => prev + 0.1);
      }, 100);
    } else if (holdTimer >= 3) {
      handleSubmit();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isHolding, holdTimer, handleSubmit]);

  const handleHoldStart = () => {
    setIsHolding(true);
    setHoldTimer(0);
  };

  const handleHoldEnd = () => {
    setIsHolding(false);
    setHoldTimer(0);
  };

  const getTimeWarning = () => {
    if (!timeRemaining) return null;
    if (timeRemaining < 300) { // 5 minutes
      return {
        level: 'warning',
        message: `Only ${Math.ceil(timeRemaining / 60)} minutes remaining!`,
        color: 'text-amber-600',
      };
    }
    if (timeRemaining < 60) { // 1 minute
      return {
        level: 'danger',
        message: `Only ${timeRemaining} seconds remaining!`,
        color: 'text-red-600',
      };
    }
    return null;
  };

  const timeWarning = getTimeWarning();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Exam Confirmation"
      footer={
        <div className="flex gap-3 w-full">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          
          {isCodeRequired ? (
            <div className="flex gap-2 flex-1">
              <input
                type="text"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value.toUpperCase())}
                placeholder={`Enter code: ${generatedCode}`}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                maxLength={6}
                disabled={isSubmitting}
              />
              <Button
                variant="danger"
                onClick={handleSubmit}
                loading={isSubmitting}
                disabled={confirmCode !== generatedCode}
                icon={<Send className="w-4 h-4" />}
              >
                Submit
              </Button>
            </div>
          ) : (
            <Button
              variant="danger"
              loading={isSubmitting}
              onMouseDown={handleHoldStart}
              onMouseUp={handleHoldEnd}
              onMouseLeave={handleHoldEnd}
              onTouchStart={handleHoldStart}
              onTouchEnd={handleHoldEnd}
              icon={<Send className="w-4 h-4" />}
              className="flex-1"
            >
              {isHolding ? `Hold to Submit (${Math.ceil(3 - holdTimer)}s)` : 'Hold to Submit'}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* 时间警告 */}
        {timeWarning && (
          <div className={`bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3`}>
            <Clock className={`w-5 h-5 ${timeWarning.color} shrink-0 mt-0.5`} />
            <div>
              <p className={`font-semibold ${timeWarning.level === 'danger' ? 'text-red-800' : 'text-amber-800'}`}>
                Time Warning
              </p>
              <p className={`${timeWarning.level === 'danger' ? 'text-red-700' : 'text-amber-700'} text-sm mt-1`}>
                {timeWarning.message}
              </p>
            </div>
          </div>
        )}

        {/* 未答题警告 */}
        {unansweredCount > 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">Unanswered Questions</p>
              <p className="text-amber-700 text-sm mt-1">
                You have <strong>{unansweredCount}</strong> unanswered question{unansweredCount !== 1 ? 's' : ''}.
                These will receive zero points.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-800">All Questions Answered</p>
              <p className="text-emerald-700 text-sm mt-1">You've answered all {totalQuestions} questions.</p>
            </div>
          </div>
        )}

        {/* 防作弊提醒 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
          <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-800">Final Submission</p>
            <p className="text-blue-700 text-sm mt-1">
              Once submitted, you cannot change your answers. Please review your responses carefully.
            </p>
          </div>
        </div>

        {/* 提交统计 */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xl font-bold text-gray-900">{answeredCount}</div>
            <div className="text-xs text-gray-400 mt-0.5">Answered</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xl font-bold text-amber-600">{unansweredCount}</div>
            <div className="text-xs text-gray-400 mt-0.5">Skipped</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xl font-bold text-gray-900">{totalQuestions}</div>
            <div className="text-xs text-gray-400 mt-0.5">Total</div>
          </div>
        </div>

        {/* 提交方式说明 */}
        <div className="text-xs text-gray-500 text-center">
          {isCodeRequired ? (
            <p>Enter the confirmation code to submit your exam.</p>
          ) : (
            <p>Hold the submit button for 3 seconds to confirm.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

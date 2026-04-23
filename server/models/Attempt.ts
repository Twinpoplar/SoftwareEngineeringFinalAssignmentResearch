import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const attemptAnswerSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  question_id: { type: String, ref: 'Question', required: true },
  answer: { type: mongoose.Schema.Types.Mixed }, // string | string[]
  answer_text: { type: String },
  is_correct: { type: Boolean },
  score: { type: Number, default: 0 },
  is_flagged: { type: Boolean, default: false }
}, { _id: false, timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const examAttemptSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  exam_id: { type: String, ref: 'Exam', required: true, index: true },
  student_id: { type: String, ref: 'User', required: true, index: true },
  status: { 
    type: String, 
    enum: ['in_progress', 'completed', 'graded'], 
    default: 'in_progress' 
  },
  total_score: { type: Number, default: 0 },
  started_at: { type: Date, default: Date.now },
  submitted_at: { type: Date },
  feedback: { type: String },
  answers: [attemptAnswerSchema]
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

examAttemptSchema.virtual('id').get(function () {
  return this._id;
});

examAttemptSchema.set('toJSON', {
  virtuals: true,
  transform: (
    _doc: unknown,
    ret: Record<string, unknown> & { _id?: unknown; __v?: unknown; id?: unknown }
  ) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const ExamAttempt = mongoose.model('ExamAttempt', examAttemptSchema);

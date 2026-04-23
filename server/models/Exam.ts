import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const examSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  title: { type: String, required: true },
  description: { type: String },
  duration_minutes: { type: Number, required: true },
  start_time: { type: Date, required: true },
  end_time: { type: Date, required: true },
  total_points: { type: Number, required: true },
  pass_score: { type: Number, required: true },
  allow_review: { type: Boolean, default: true },
  is_published: { type: Boolean, default: false },
  subject: { type: String },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'] },
  created_by: { type: String, ref: 'User', required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

examSchema.virtual('id').get(function () {
  return this._id;
});

// 为了让前端拿到 id 而不是 _id，我们需要开启 virtuals
examSchema.set('toJSON', {
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

export const Exam = mongoose.model('Exam', examSchema);

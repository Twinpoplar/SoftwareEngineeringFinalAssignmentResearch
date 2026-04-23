import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// 考试题目关联表 - 支持题目复用
const examQuestionSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  exam_id: { type: String, ref: 'Exam', required: true, index: true },
  question_id: { type: String, ref: 'Question', required: true, index: true },
  order_index: { type: Number, required: true }, // 在考试中的顺序
  points: { type: Number, required: true }, // 在该考试中的分值
  is_required: { type: Boolean, default: true }, // 是否必答
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

examQuestionSchema.virtual('id').get(function () {
  return this._id;
});

examQuestionSchema.set('toJSON', {
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

// 复合索引，防止重复添加
examQuestionSchema.index({ exam_id: 1, question_id: 1 }, { unique: true });

export const ExamQuestion = mongoose.model('ExamQuestion', examQuestionSchema);

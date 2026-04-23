import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const questionOptionSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  key: { type: String, required: true },
  text: { type: String, required: true },
  is_correct: { type: Boolean, default: false }
}, { _id: false, timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const questionSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  // 移除 exam_id 绑定，让题目独立存在
  type: { 
    type: String, 
    required: true, 
    enum: ['single_choice', 'multiple_choice', 'true_false', 'short_answer'] 
  },
  content: { type: String, required: true },
  points: { type: Number, required: true, default: 5 },
  explanation: { type: String },
  correct_answer: { type: mongoose.Schema.Types.Mixed, required: true }, // 可以是string或string[]
  subject: { type: String, required: true, index: true }, // 学科分类
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  options: [questionOptionSchema],
  // 统计信息
  usage_count: { type: Number, default: 0 }, // 被使用的次数
  last_used: { type: Date }, // 最后使用时间
  created_by: { type: String, ref: 'User' }, // 创建者
  tags: [{ type: String }], // 标签，便于搜索
  is_active: { type: Boolean, default: true } // 是否启用
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

questionSchema.virtual('id').get(function () {
  return this._id;
});

questionSchema.set('toJSON', {
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

// 索引优化
questionSchema.index({ subject: 1, type: 1 });
questionSchema.index({ subject: 1, difficulty: 1 });
questionSchema.index({ tags: 1 });
questionSchema.index({ is_active: 1 });

export const Question = mongoose.model('Question', questionSchema);

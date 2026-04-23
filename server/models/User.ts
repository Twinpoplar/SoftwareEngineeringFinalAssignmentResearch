import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const userSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: uuidv4, // 使用 UUID 作为主键，以便兼容 Supabase RLS
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  fullName: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['student', 'teacher', 'admin'],
    default: 'student',
  },
  studentId: {
    type: String,
    default: '',
  },
  is_active: {
    type: Boolean,
    default: true,
  }
}, {
  timestamps: true
});

export const User = mongoose.model('User', userSchema);

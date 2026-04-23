import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { auth, authorize, AuthRequest } from '../middleware/auth';

const router = express.Router();

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

const parseDataUrl = (dataUrl: string) => {
  const match = /^data:([a-zA-Z0-9/+.-]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) return null;
  return { mime: match[1], base64: match[2] };
};

router.post('/image', auth, authorize(['teacher', 'admin']), async (req: AuthRequest, res) => {
  try {
    const { dataUrl } = req.body as { dataUrl?: string };
    if (!dataUrl || typeof dataUrl !== 'string') {
      return res.status(400).json({ error: '缺少 dataUrl' });
    }

    const parsed = parseDataUrl(dataUrl);
    if (!parsed) {
      return res.status(400).json({ error: '图片格式不正确' });
    }

    const ext = ALLOWED_MIME[parsed.mime];
    if (!ext) {
      return res.status(400).json({ error: '不支持的图片类型' });
    }

    const buffer = Buffer.from(parsed.base64, 'base64');
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      return res.status(400).json({ error: '图片大小不能超过 5MB' });
    }

    const uploadsDir = path.join(process.cwd(), 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const fileName = `${uuidv4()}.${ext}`;
    const filePath = path.join(uploadsDir, fileName);
    await fs.writeFile(filePath, buffer);

    const host = req.get('host') || `localhost:${process.env.PORT || 3000}`;
    const url = `${req.protocol}://${host}/uploads/${fileName}`;

    res.json({ url });
  } catch {
    res.status(500).json({ error: '上传图片失败' });
  }
});

export default router;

import express from 'express';
import { auth, authorize } from '../middleware/auth';

const router = express.Router();
const DEFAULT_ADAPTER_BASE_URL = process.env.TIKU_ADAPTER_BASE_URL || 'http://localhost:8060';

type SearchPayload = {
  question: string;
  options?: string[];
  type?: number;
  use?: string;
  wannengToken?: string;
  icodefToken?: string;
  enncyToken?: string;
  aidianYToken?: string;
  lemonToken?: string;
  tikuhaiToken?: string;
};

router.get('/status', auth, authorize(['teacher', 'admin']), async (_req, res) => {
  try {
    const response = await fetch(DEFAULT_ADAPTER_BASE_URL, { method: 'GET' });
    res.json({
      connected: response.ok,
      adapterBaseUrl: DEFAULT_ADAPTER_BASE_URL,
      message: response.ok ? '题库适配器连接正常' : '题库适配器未就绪',
    });
  } catch (error) {
    res.status(503).json({
      connected: false,
      adapterBaseUrl: DEFAULT_ADAPTER_BASE_URL,
      message: '无法连接题库适配器，请确认适配器服务已启动',
      error: (error as Error).message,
    });
  }
});

router.post('/search', auth, authorize(['teacher', 'admin']), async (req, res) => {
  try {
    const payload = req.body as SearchPayload;
    if (!payload.question || payload.question.trim().length < 2) {
      return res.status(400).json({ error: '请输入至少 2 个字符的问题内容' });
    }

    const params = new URLSearchParams();
    const keys: Array<keyof SearchPayload> = [
      'use',
      'wannengToken',
      'icodefToken',
      'enncyToken',
      'aidianYToken',
      'lemonToken',
      'tikuhaiToken',
    ];

    keys.forEach((key) => {
      const value = payload[key];
      if (typeof value === 'string' && value.trim() !== '') {
        params.set(key, value.trim());
      }
    });

    const targetUrl = `${DEFAULT_ADAPTER_BASE_URL}/adapter-service/search${params.toString() ? `?${params.toString()}` : ''}`;

    const adapterResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: payload.question,
        options: payload.options || [],
        type: payload.type ?? 0,
      }),
    });

    const rawText = await adapterResponse.text();
    let data: unknown = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = { raw: rawText };
    }

    if (!adapterResponse.ok) {
      return res.status(adapterResponse.status).json({
        error: '题库适配器请求失败',
        detail: data,
      });
    }

    res.json(data);
  } catch (error) {
    console.error('题库适配器搜索失败:', error);
    res.status(500).json({ error: '题库适配器搜索失败' });
  }
});

export default router;

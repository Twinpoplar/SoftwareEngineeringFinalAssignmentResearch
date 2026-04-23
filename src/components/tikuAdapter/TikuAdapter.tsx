import { useEffect, useMemo, useState } from 'react';
import { Upload, Download, FileText, AlertCircle, Search, Database } from 'lucide-react';
import { Button } from '../common/Button';
import { useToast } from '../../hooks/useToast';
import { checkTikuAdapterStatus, searchByTikuAdapter, type TikuSearchResponse } from '../../api/tikuAdapter';
import type { Question } from '../../api/questionBank';

interface TikuQuestion {
  id: number;
  title: string;
  题型: '判断' | '单选' | '多选';
  选项: string[];
  正确答案: string[];
  class: string;
}

interface TikuData {
  defaultData?: number;
  version?: number;
  title?: string;
  class?: Record<string, Record<string, number[]>>;
  data: TikuQuestion[];
}

type ImportableQuestion = Omit<Question, 'id' | 'created_at' | 'updated_at'>;

interface TikuAdapterProps {
  onImportQuestions?: (questions: ImportableQuestion[]) => Promise<void>;
}

const mapAdapterTypeToInternal = (type?: number): ImportableQuestion['type'] => {
  if (type === 0) return 'single_choice';
  if (type === 1) return 'multiple_choice';
  if (type === 3) return 'true_false';
  if (type === 4) return 'short_answer';
  return 'short_answer';
};

export function TikuAdapter({ onImportQuestions }: TikuAdapterProps) {
  const [importedData, setImportedData] = useState<TikuData | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [tab, setTab] = useState<'file' | 'search'>('file');
  const [adapterConnected, setAdapterConnected] = useState(false);
  const [adapterResult, setAdapterResult] = useState<TikuSearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchForm, setSearchForm] = useState({
    question: '',
    optionsText: '',
    type: 0,
    use: '',
    wannengToken: '',
    icodefToken: '',
    enncyToken: '',
    aidianYToken: '',
    lemonToken: '',
    tikuhaiToken: '',
  });
  const toast = useToast();

  useEffect(() => {
    const run = async () => {
      try {
        const status = await checkTikuAdapterStatus();
        setAdapterConnected(status.connected);
      } catch {
        setAdapterConnected(false);
      }
    };
    void run();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as TikuData;
      
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('无效的题库文件格式');
      }

      setImportedData(data);
      toast.success(`成功导入题库：${data.title || '未命名题库'}`);
    } catch (error) {
      toast.error('题库文件解析失败：' + (error as Error).message);
    } finally {
      setIsImporting(false);
    }
  };

  const convertToInternalFormat = () => {
    if (!importedData?.data) return [];

    return importedData.data.map((question): ImportableQuestion => {
      let type: 'single_choice' | 'multiple_choice' | 'true_false' | 'short_answer';
      let correctAnswer: string | string[];

      switch (question.题型) {
        case '判断':
          type = 'true_false';
          correctAnswer = question.正确答案[0] === '对' ? 'true' : 'false';
          break;
        case '单选':
          type = 'single_choice';
          correctAnswer = question.正确答案[0].toUpperCase();
          break;
        case '多选':
          type = 'multiple_choice';
          correctAnswer = question.正确答案.map((ans) => ans.toUpperCase());
          break;
        default:
          type = 'short_answer';
          correctAnswer = question.正确答案.join('；');
      }

      const options = question.选项.length > 0 
        ? question.选项.map((opt, i) => ({
            key: String.fromCharCode(65 + i), // A, B, C, D...
            text: opt.replace(/^[A-Z]\.\s*/, '') // 移除前缀如 "A. "
          }))
        : undefined;

      return {
        type,
        content: question.title,
        points: 5,
        options,
        correct_answer: correctAnswer,
        subject: question.class || '导入题库',
        difficulty: 'medium' as const,
        explanation: '',
      };
    });
  };

  const adapterQuestion = useMemo<ImportableQuestion | null>(() => {
    if (!adapterResult?.question) return null;
    const type = mapAdapterTypeToInternal(adapterResult.type);
    const options = (adapterResult.options ?? []).map((text, index) => ({
      key: String.fromCharCode(65 + index),
      text: text.replace(/^[A-Z]\.\s*/, ''),
    }));

    let correctAnswer: string | string[] = '';
    if (type === 'multiple_choice') {
      correctAnswer = (adapterResult.answer?.answerKey ?? []).map((k) => k.toUpperCase());
    } else if (type === 'single_choice') {
      correctAnswer = adapterResult.answer?.answerKey?.[0]?.toUpperCase() ?? '';
    } else if (type === 'true_false') {
      const txt = `${adapterResult.answer?.answerText ?? ''}${adapterResult.answer?.bestAnswer?.join('') ?? ''}`.toLowerCase();
      correctAnswer = txt.includes('false') || txt.includes('错') ? 'false' : 'true';
    } else {
      correctAnswer = adapterResult.answer?.answerText ?? adapterResult.answer?.bestAnswer?.join('；') ?? '';
    }

    return {
      type,
      content: adapterResult.question,
      points: 5,
      subject: 'tikuAdapter导入',
      difficulty: 'medium',
      options: options.length > 0 ? options : [],
      correct_answer: correctAnswer,
      explanation: '',
    };
  }, [adapterResult]);

  const handleSearchFromAdapter = async () => {
    if (!searchForm.question.trim()) {
      toast.error('请先输入题目内容');
      return;
    }

    setIsSearching(true);
    try {
      const options = searchForm.optionsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const data = await searchByTikuAdapter({
        question: searchForm.question.trim(),
        options,
        type: searchForm.type,
        use: searchForm.use || undefined,
        wannengToken: searchForm.wannengToken || undefined,
        icodefToken: searchForm.icodefToken || undefined,
        enncyToken: searchForm.enncyToken || undefined,
        aidianYToken: searchForm.aidianYToken || undefined,
        lemonToken: searchForm.lemonToken || undefined,
        tikuhaiToken: searchForm.tikuhaiToken || undefined,
      });

      setAdapterResult(data);
      toast.success('题库适配器检索成功');
    } catch (error) {
      toast.error(`检索失败：${(error as Error).message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleImport = async (questions: ImportableQuestion[]) => {
    if (!onImportQuestions) {
      toast.info('当前页面未注入导入回调，请使用“转换并下载”功能');
      return;
    }
    if (questions.length === 0) {
      toast.error('没有可导入的题目');
      return;
    }
    await onImportQuestions(questions);
  };

  const exportConvertedData = () => {
    if (!importedData) {
      toast.error('请先导入题库文件');
      return;
    }

    const converted = convertToInternalFormat();
    const blob = new Blob([JSON.stringify(converted, null, 2)], {
      type: 'application/json',
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `converted_${importedData.title || 'questions'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('转换完成，文件已下载');
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-6 h-6 text-blue-600" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">题库适配器</h3>
          <p className="text-sm text-gray-500">支持导入标准格式的题库文件</p>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="inline-flex rounded-lg bg-gray-100 p-1">
          <button
            className={`px-3 py-1.5 text-sm rounded-md ${tab === 'file' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
            onClick={() => setTab('file')}
          >
            本地文件
          </button>
          <button
            className={`px-3 py-1.5 text-sm rounded-md ${tab === 'search' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
            onClick={() => setTab('search')}
          >
            在线搜题
          </button>
        </div>
        <div className={`text-xs px-2 py-1 rounded ${adapterConnected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {adapterConnected ? 'tikuAdapter 已连接' : 'tikuAdapter 未连接'}
        </div>
      </div>

      <div className="space-y-4">
        {tab === 'file' && (
          <>
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <label className="cursor-pointer">
            <span className="text-blue-600 font-medium hover:text-blue-700">
              点击上传题库文件
            </span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isImporting}
            />
          </label>
          <p className="text-xs text-gray-500 mt-2">支持 JSON 格式的题库文件</p>
        </div>

        {importedData && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-900">已导入题库</span>
            </div>
            <div className="text-sm text-blue-800">
              <p>题库名称：{importedData.title || '未命名'}</p>
              <p>题目数量：{importedData.data.length} 题</p>
              {importedData.version && <p>版本号：{importedData.version}</p>}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={exportConvertedData}
            disabled={!importedData}
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            转换并下载
          </Button>
          <Button
            onClick={() => void handleImport(convertToInternalFormat())}
            disabled={!importedData || !onImportQuestions}
            className="flex-1"
            variant="outline"
          >
            <Database className="w-4 h-4 mr-2" />
            导入本站题库
          </Button>
        </div>
          </>
        )}

        {tab === 'search' && (
          <div className="space-y-3">
            <input
              value={searchForm.question}
              onChange={(e) => setSearchForm((prev) => ({ ...prev, question: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="输入题干（必填）"
            />
            <textarea
              value={searchForm.optionsText}
              onChange={(e) => setSearchForm((prev) => ({ ...prev, optionsText: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              rows={4}
              placeholder="选项（可选，每行一个）"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={searchForm.type}
                onChange={(e) => setSearchForm((prev) => ({ ...prev, type: Number(e.target.value) }))}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value={0}>单选题</option>
                <option value={1}>多选题</option>
                <option value={2}>填空题</option>
                <option value={3}>判断题</option>
                <option value={4}>问答题</option>
              </select>
              <input
                value={searchForm.use}
                onChange={(e) => setSearchForm((prev) => ({ ...prev, use: e.target.value }))}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="题库源 use（可选）"
              />
            </div>
            <Button onClick={() => void handleSearchFromAdapter()} loading={isSearching} className="w-full">
              <Search className="w-4 h-4 mr-2" />
              从 tikuAdapter 搜题
            </Button>

            {adapterQuestion && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
                <p className="font-semibold text-blue-800 mb-1">检索结果预览</p>
                <p className="text-blue-800 mb-2">{adapterQuestion.content}</p>
                <p className="text-blue-700 text-xs mb-2">
                  题型：{adapterQuestion.type} | 答案：
                  {Array.isArray(adapterQuestion.correct_answer)
                    ? adapterQuestion.correct_answer.join(',')
                    : adapterQuestion.correct_answer}
                </p>
                <Button variant="outline" onClick={() => void handleImport([adapterQuestion])} disabled={!onImportQuestions}>
                  <Database className="w-4 h-4 mr-2" />
                  导入当前结果到本站题库
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p>• 支持题型：判断题、单选题、多选题</p>
          <p>• 文件格式：标准 JSON 题库格式</p>
          <p>• 转换说明：自动适配系统内部格式</p>
        </div>
      </div>
    </div>
  );
}

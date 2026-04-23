import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';

export type QuillEditorHandle = {
  insertImage: (url: string) => void;
  focus: () => void;
};

type QuillSelection = { index: number; length: number } | null;
type QuillApi = {
  root: HTMLElement;
  clipboard: { dangerouslyPasteHTML: (html: string) => void };
  on: (eventName: 'text-change', handler: () => void) => void;
  getSelection: (focus?: boolean) => QuillSelection;
  getLength: () => number;
  insertEmbed: (index: number, type: string, value: unknown, source?: string) => void;
  setSelection: (index: number, length: number, source?: string) => void;
  focus: () => void;
};

type QuillConstructor = new (el: Element, options: Record<string, unknown>) => QuillApi;

type QuillEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  uploadImage?: (file: File) => Promise<string>;
  onUploadStateChange?: (uploading: boolean) => void;
};

export const QuillEditor = forwardRef<QuillEditorHandle, QuillEditorProps>(function QuillEditor(
  { value, onChange, placeholder, uploadImage, onUploadStateChange },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<QuillApi | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastValueRef = useRef<string>('');
  const pasteHandlerRef = useRef<((event: ClipboardEvent) => void) | null>(null);

  const insertImage = useCallback((url: string) => {
    const quill = quillRef.current;
    if (!quill) return;
    const range = quill.getSelection(true);
    const index = range ? range.index : quill.getLength();
    quill.insertEmbed(index, 'image', url, 'user');
    quill.setSelection(index + 1, 0, 'user');
  }, []);

  const focus = useCallback(() => {
    const quill = quillRef.current;
    if (!quill) return;
    quill.focus();
  }, []);

  useImperativeHandle(ref, () => ({ insertImage, focus }), [focus, insertImage]);

  const toolbarModules = useMemo(() => {
    const base = [
      [{ header: [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'formula', 'image'],
      ['clean'],
    ];

    return {
      toolbar: {
        container: base,
        handlers: {
          image: () => {
            if (!uploadImage) return;
            fileInputRef.current?.click();
          },
        },
      },
    };
  }, [uploadImage]);

  const handleUploadFile = useCallback(
    async (file: File) => {
      if (!uploadImage) return;
      onUploadStateChange?.(true);
      try {
        const url = await uploadImage(file);
        insertImage(url);
      } finally {
        onUploadStateChange?.(false);
      }
    },
    [insertImage, onUploadStateChange, uploadImage]
  );

  useEffect(() => {
    if (!containerRef.current) return;
    if (quillRef.current) return;

    let disposed = false;

    const init = async () => {
      const mod = await import('quill');
      if (disposed) return;
      const el = containerRef.current;
      if (!el) return;
      const QuillValue = (mod as unknown as { default?: unknown }).default ?? (mod as unknown);
      const Quill = QuillValue as QuillConstructor;
      const quill = new Quill(el, {
        theme: 'snow',
        placeholder,
        modules: toolbarModules,
      });

      quill.on('text-change', () => {
        const html = quill.root.innerHTML;
        lastValueRef.current = html;
        onChange(html);
      });

      quillRef.current = quill;

      if (value) {
        quill.clipboard.dangerouslyPasteHTML(value);
        lastValueRef.current = quill.root.innerHTML;
      }

      if (uploadImage) {
        const root = quill.root as HTMLElement;
        const handlePaste = (event: ClipboardEvent) => {
          const items = event.clipboardData?.items;
          if (!items) return;
          const imageItem = Array.from(items).find((i) => i.kind === 'file' && i.type.startsWith('image/'));
          if (!imageItem) return;
          const file = imageItem.getAsFile();
          if (!file) return;
          event.preventDefault();
          void handleUploadFile(file);
        };

        pasteHandlerRef.current = handlePaste;
        root.addEventListener('paste', handlePaste as unknown as EventListener);
      }
    };

    void init();

    return () => {
      disposed = true;
      const quill = quillRef.current;
      const handlePaste = pasteHandlerRef.current;
      if (quill && handlePaste) quill.root.removeEventListener('paste', handlePaste as unknown as EventListener);
      pasteHandlerRef.current = null;
      quillRef.current = null;
    };
  }, [handleUploadFile, onChange, placeholder, toolbarModules, uploadImage, value]);

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) return;
    const incoming = value ?? '';
    const current = quill.root.innerHTML ?? '';
    if (incoming === current) return;
    if (incoming === lastValueRef.current) return;
    const selection = quill.getSelection();
    quill.clipboard.dangerouslyPasteHTML(incoming);
    if (selection) {
      quill.setSelection(selection.index, selection.length, 'silent');
    }
    lastValueRef.current = quill.root.innerHTML;
  }, [value]);

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void handleUploadFile(file);
        }}
      />
      <div ref={containerRef} />
    </div>
  );
});

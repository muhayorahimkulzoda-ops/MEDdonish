'use client';

import { useEffect, useState } from 'react';
import { t } from '../lib/i18n';
import { BrandMark } from './BrandMark';

type Props = {
  title: string;
  notes: string;
  pdfUrl?: string;
  onClose: () => void;
};

function loadUrls(url: string) {
  const urls = [url];
  if (url.startsWith('http')) {
    try {
      const parsed = new URL(url);
      urls.push(`${parsed.pathname}${parsed.search}`);
    } catch {
      /* keep original */
    }
  }
  return [...new Set(urls)];
}

function NotesBody({ notes }: { notes: string }) {
  const blocks = notes.split(/\n\n+/).map((item) => item.trim()).filter(Boolean);
  if (blocks.length === 0) {
    return <p>{t('admin.empty')}</p>;
  }
  return (
    <>
      {blocks.map((block) => {
        if (block.startsWith('## ')) {
          return <h4 key={block}>{block.slice(3)}</h4>;
        }
        return <p key={block.slice(0, 48)}>{block}</p>;
      })}
    </>
  );
}

function PdfFrame({ url }: { url: string }) {
  const [src, setSrc] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let objectUrl = '';
    let cancelled = false;
    setStatus('loading');
    setSrc('');

    (async () => {
      try {
        let blob: Blob | null = null;
        for (const href of loadUrls(url)) {
          const response = await fetch(href, { credentials: 'include' });
          if (response.ok) {
            blob = await response.blob();
            break;
          }
        }
        if (!blob || cancelled) return;
        objectUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setSrc(objectUrl);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (status === 'loading') return <p className="muted">{t('admin.processing')}</p>;
  if (status === 'error' || !src) return <p className="error">{t('admin.empty')}</p>;
  return (
    <iframe
      className="pdf-frame"
      src={`${src}#toolbar=0&navpanes=0&view=FitH`}
      title={t('lesson.pdf')}
    />
  );
}

export function LessonPdfViewer({ title, notes, pdfUrl, onClose }: Props) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && ['c', 's', 'p', 'u'].includes(event.key.toLowerCase())) {
        event.preventDefault();
      }
    }

    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      className="pdf-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={t('lesson.pdf')}
      onContextMenu={(event) => event.preventDefault()}
      onCopy={(event) => event.preventDefault()}
      onCut={(event) => event.preventDefault()}
    >
      <div className="pdf-viewer-bar">
        <h2>{t('lesson.pdf')}</h2>
        <button
          type="button"
          className="pdf-viewer-close"
          onClick={onClose}
          aria-label={t('lesson.closePdf')}
        >
          ×
        </button>
      </div>
      <div className="pdf-viewer-body">
        {pdfUrl ? (
          <PdfFrame url={pdfUrl} />
        ) : (
          <article className="pdf-notes">
            <p className="pdf-notes-kicker">
              <BrandMark />
            </p>
            <h3>{title || t('lesson.pdf')}</h3>
            <NotesBody notes={notes} />
          </article>
        )}
      </div>
    </div>
  );
}

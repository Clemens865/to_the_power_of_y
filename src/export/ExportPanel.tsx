import { useEffect, useRef, useState } from 'react';
import type { Genome } from '../engine/genome';
import { buildKit, downloadKit } from './kit';

type Tab = 'recipe' | 'Universe.tsx' | 'universe.css';

export const ExportPanel = ({ genome, open, onClose }: { genome: Genome; open: boolean; onClose: () => void }) => {
  const ref = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<Tab>('recipe');
  const [copied, setCopied] = useState('');
  const link = location.href;

  useEffect(() => {
    const d = ref.current!;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const copy = async (what: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(''), 1400);
    } catch {
      setCopied('blocked');
    }
  };

  const files = open ? buildKit(genome, link) : null;
  const p = genome.palette;

  return (
    <dialog ref={ref} className="keep" onClose={onClose} onClick={e => e.target === ref.current && onClose()}>
      {files && (
        <div className="keep-body">
          <header>
            <div>
              <div className="keep-eyebrow">keep this universe</div>
              <h2>
                y = <span>{genome.seed}</span>
              </h2>
            </div>
            <button className="keep-x" onClick={onClose} aria-label="Close">
              ×
            </button>
          </header>

          <div className="swatches">
            {[p.bg, p.fg, p.accent, p.accent2, p.accent3].map(c => (
              <button key={c} style={{ background: c }} title={`Copy ${c}`} onClick={() => copy(c, c)} />
            ))}
            <span className="keep-font" style={{ fontFamily: `"${genome.font.family}"` }}>
              {genome.font.family}
            </span>
          </div>

          <div className="keep-actions">
            <button className="primary" onClick={() => downloadKit(genome, link)}>
              Download kit (.zip)
            </button>
            <button onClick={() => copy('link', link)}>{copied === 'link' ? 'Copied' : 'Copy link'}</button>
            <button onClick={() => copy('code', files['Universe.tsx'])}>{copied === 'code' ? 'Copied' : 'Copy component'}</button>
            <button onClick={() => copy('css', files['universe.css'])}>{copied === 'css' ? 'Copied' : 'Copy CSS'}</button>
          </div>
          {copied === 'blocked' && <p className="keep-note">Clipboard is blocked here. Use the download instead.</p>}

          <nav className="keep-tabs">
            {(['recipe', 'Universe.tsx', 'universe.css'] as Tab[]).map(t => (
              <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
                {t}
              </button>
            ))}
          </nav>
          <pre className="keep-code">{tab === 'recipe' ? files['README.md'] : files[tab]}</pre>
        </div>
      )}
    </dialog>
  );
};

import { useEffect, useRef, useState } from 'react';

// Trình soạn thảo: in đậm, in nghiêng, gạch chân, màu chữ, cỡ chữ, căn lề, tiêu đề H1–H3, trích dẫn, hoàn tác (UC6.1 3a, UC6.2 4a)
const CO_CHU = [['Nhỏ', 2], ['Thường', 3], ['Lớn', 5], ['Rất lớn', 6]];
const NUT = [
  ['bold', 'B', { fontWeight: 800 }], ['italic', 'I', { fontStyle: 'italic' }], ['underline', 'U', { textDecoration: 'underline' }],
];
const CAN = [['justifyLeft', 'M3 6h18M3 10h12M3 14h18M3 18h12'], ['justifyCenter', 'M3 6h18M6 10h12M3 14h18M6 18h12'],
  ['justifyRight', 'M3 6h18M9 10h12M3 14h18M9 18h12'], ['justifyFull', 'M3 6h18M3 10h18M3 14h18M3 18h18']];

export default function RichEditor({ value, onChange, loi, disabled, placeholder = 'Nhập nội dung mẫu hợp đồng' }) {
  const ref = useRef();
  const mau = useRef();
  const [dang, setDang] = useState({});
  const [focus, setFocus] = useState(false);

  // Nạp nội dung ban đầu (và khi dữ liệu sửa tải xong) mà không làm nhảy con trỏ khi đang gõ
  useEffect(() => { if (ref.current && ref.current.innerHTML !== (value || '')) ref.current.innerHTML = value || ''; }, [value]);

  const capNhat = () => {
    const s = {};
    for (const c of ['bold', 'italic', 'underline', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull']) {
      try { s[c] = document.queryCommandState(c); } catch { /* bỏ qua */ }
    }
    try { s.block = String(document.queryCommandValue('formatBlock')).toLowerCase(); } catch { /* bỏ qua */ }
    setDang(s);
  };
  const lenh = (c, v = null) => {
    if (disabled) return;
    ref.current.focus(); document.execCommand(c, false, v); onChange(ref.current.innerHTML); capNhat();
  };
  const khoiBlock = (tag) => lenh('formatBlock', dang.block === tag ? 'p' : tag);
  const giu = (e) => e.preventDefault(); // giữ vùng chọn khi bấm nút công cụ

  return (
    <div className={'rte' + (loi !== undefined ? ' err' : '') + (focus ? ' focus' : '')}>
      <div className="rte-bar" onMouseDown={(e) => { if (e.target.tagName !== 'SELECT' && e.target.tagName !== 'OPTION') giu(e); }}>
        {NUT.map(([c, t, st]) => <button type="button" key={c} className={dang[c] ? 'on' : ''} style={st} onClick={() => lenh(c)}>{t}</button>)}
        <button type="button" title="Màu chữ" className="rte-color" onClick={() => mau.current.click()}>A</button>
        <input ref={mau} type="color" defaultValue="#d93025" hidden onChange={(e) => lenh('foreColor', e.target.value)} />
        <select defaultValue="" onChange={(e) => { if (e.target.value) lenh('fontSize', e.target.value); e.target.value = ''; }}>
          <option value="">Cỡ chữ</option>
          {CO_CHU.map(([t, v]) => <option key={v} value={v}>{t}</option>)}
        </select>
        <i />
        {CAN.map(([c, d]) => (
          <button type="button" key={c} className={dang[c] ? 'on' : ''} onClick={() => lenh(c)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d={d} /></svg>
          </button>
        ))}
        <i />
        {['h1', 'h2', 'h3'].map((h) => <button type="button" key={h} className={dang.block === h ? 'on' : ''} onClick={() => khoiBlock(h)}>{h.toUpperCase()}</button>)}
        <button type="button" className={dang.block === 'blockquote' ? 'on' : ''} onClick={() => khoiBlock('blockquote')}>”</button>
        <button type="button" title="Hoàn tác" onClick={() => lenh('undo')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3" /></svg>
        </button>
      </div>
      <div ref={ref} className="rte-area" contentEditable={!disabled} suppressContentEditableWarning data-ph={placeholder}
        onInput={() => onChange(ref.current.innerHTML)} onKeyUp={capNhat} onMouseUp={capNhat}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} />
    </div>
  );
}

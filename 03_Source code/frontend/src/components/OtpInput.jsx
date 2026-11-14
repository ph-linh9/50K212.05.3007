import { useRef } from 'react';
export default function OtpInput({ value, onChange, error, length = 6 }) {
  const refs = useRef([]);
  const set = (i, ch) => {
    const arr = value.padEnd(length, ' ').split('');
    arr[i] = ch || ' ';
    onChange(arr.join('').replace(/ +$/, ''));
  };
  return (
    <div className={'otp' + (error ? ' err' : '')}>
      {Array.from({ length }).map((_, i) => (
        <input key={i} ref={(el) => (refs.current[i] = el)} inputMode="numeric" maxLength={1}
          value={(value[i] || '').trim()}
          onChange={(e) => { const ch = e.target.value.replace(/\D/g, ''); set(i, ch); if (ch && i < length - 1) refs.current[i + 1].focus(); }}
          onKeyDown={(e) => { if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1].focus(); }}
          onPaste={(e) => { const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length); if (t) { e.preventDefault(); onChange(t); refs.current[Math.min(t.length, length - 1)].focus(); } }} />
      ))}
    </div>
  );
}

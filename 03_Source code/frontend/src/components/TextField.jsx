import { useState } from 'react';
const MailI = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#66756F" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>;
const LockI = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#66756F" strokeWidth="1.8"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>;
const EyeI = ({ off }) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#66756F" strokeWidth="1.8"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />{off && <path d="M4 4l16 16" />}</svg>;

export default function TextField({ label, type = 'text', icon = 'mail', error, action, ...props }) {
  const [show, setShow] = useState(false);
  const isPw = type === 'password';
  return (
    <div className="field">
      <div className="field-head"><label className="label">{label}</label>{action}</div>
      <div className={'input-wrap' + (error ? ' err' : '')}>
        {icon === 'mail' ? <MailI /> : <LockI />}
        <input type={isPw && show ? 'text' : type} {...props} />
        {isPw && <button type="button" className="icon-btn" onClick={() => setShow(!show)} aria-label="Hiện/ẩn mật khẩu"><EyeI off={show} /></button>}
      </div>
      {error && <p className="field-err">{error}</p>}
    </div>
  );
}

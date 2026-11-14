export default function AuthCard({ children, onBack, title, sub }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        {onBack && (
          <button className="back" onClick={onBack} aria-label="Quay lại">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </button>
        )}
        <img className="auth-logo" src="/logo.png" alt="Room Rental" />
        {title && <h1 className="auth-title">{title}</h1>}
        {sub && <p className="auth-sub">{sub}</p>}
        {children}
      </div>
    </div>
  );
}

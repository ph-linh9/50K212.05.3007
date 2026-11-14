export default function Flash({ kieu, children }) {
  if (!children) return null;
  return <div className={'flash ' + (kieu === 'loi' ? 'flash-err' : 'flash-ok')} role="status"><i />{children}</div>;
}

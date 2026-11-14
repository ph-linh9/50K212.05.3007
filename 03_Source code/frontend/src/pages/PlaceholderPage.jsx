import { useLocation } from 'react-router-dom';
import { MENU } from '../layout/AppLayout.jsx';
export default function PlaceholderPage() {
  const { pathname } = useLocation();
  const ten = MENU.find((m) => m.to === pathname)?.ten || '';
  return (<><div className="page-head"><span>{ten}</span></div><p className="empty">Chức năng này sẽ được bổ sung ở module tiếp theo.</p></>);
}

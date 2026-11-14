import DOMPurify from 'isomorphic-dompurify';

// Dùng chung cho nội dung hợp đồng (hopDong.service.js) và mẫu hợp đồng (mauHopDong.service.js):
// nội dung HTML từ trình soạn thảo (RichEditor), chỉ giữ các thẻ/thuộc tính định dạng văn bản cơ bản.
const THE_CHO_PHEP = ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'span', 'div', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'blockquote', 'a', 'table', 'thead', 'tbody', 'tr', 'td', 'th'];
const THUOC_TINH_CHO_PHEP = ['style', 'href', 'target', 'rel', 'align'];

export const lamSachHtml = (html) => DOMPurify.sanitize(String(html ?? ''), {
  ALLOWED_TAGS: THE_CHO_PHEP,
  ALLOWED_ATTR: THUOC_TINH_CHO_PHEP,
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i, // chặn javascript:/data: trong href
});
export const trongNoiDungHtml = (html) => !String(html ?? '').replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();

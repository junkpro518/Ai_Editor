import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
// معاينة الوكيل F: تسجّل window.__preview وتضيف __test.frame عند التحميل
import './player';

// إسقاط ملف خارج منطقة الإسقاط لا يجب أن يحمّله Chromium كصفحة (مراجعة phase-2 #2)
for (const ev of ['dragover', 'drop'] as const) document.addEventListener(ev, (e) => e.preventDefault());

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);

import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
// معاينة الوكيل F: تسجّل window.__preview وتضيف __test.frame عند التحميل
import './player';

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);

import { createRoot } from 'react-dom/client';
import App from './App';
import 'dockview-react/dist/styles/dockview.css';
import './styles.css';
// No StrictMode remount of async WebGL resources: lifecycle covered by explicit cleanup.
createRoot(document.getElementById('root')!).render(<App/>);

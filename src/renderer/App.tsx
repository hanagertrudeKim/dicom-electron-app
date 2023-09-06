import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

function Hello() {
  const clickBtn = () => {
    window.electron.ipcRenderer.once('ipc-example', (arg) => {
      console.log(arg);
    });
    window.electron.ipcRenderer.sendMessage('ipc-example', ['ping']);
  };

  return (
    <div>
      <button type="button" onClick={clickBtn}>
        <span role="img" aria-label="folded hands">
          🙏
        </span>
        Donate
      </button>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hello />} />
      </Routes>
    </Router>
  );
}

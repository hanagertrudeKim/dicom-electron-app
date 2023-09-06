import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import MainForm from './MainForm';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainForm />} />
      </Routes>
    </Router>
  );
}

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
// We'll create these pages next
import Projects from './pages/Projects';
import Workers from './pages/Workers';
import Materials from './pages/Materials';
import Tools from './pages/Tools';
import Expenses from './pages/Expenses';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/workers" element={<Workers />} />
        <Route path="/materials" element={<Materials />} />
        <Route path="/tools" element={<Tools />} />
        <Route path="/expenses" element={<Expenses />} />
      </Routes>
    </Router>
  );
}

export default App;
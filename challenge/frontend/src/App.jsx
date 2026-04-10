import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import Clients from './pages/Clients';
import Pipeline from './pages/Pipeline';
import SmartMatches from './pages/SmartMatches';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/matches" element={<SmartMatches />} />
      </Routes>
    </Layout>
  );
}

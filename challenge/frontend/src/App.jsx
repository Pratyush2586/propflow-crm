import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import PropertyDetail from './pages/PropertyDetail';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Pipeline from './pages/Pipeline';
import SmartMatches from './pages/SmartMatches';
import Analytics from './pages/Analytics';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/properties/:id" element={<PropertyDetail />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/:id" element={<ClientDetail />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/matches" element={<SmartMatches />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </Layout>
  );
}

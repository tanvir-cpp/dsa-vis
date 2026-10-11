import { Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import SortingPage from './pages/SortingPage';
import GraphPage from './pages/GraphPage';
import DPPage from './pages/DPPage';
import StringPage from './pages/StringPage';
import StructuresPage from './pages/StructuresPage';
import ArrayPage from './pages/ArrayPage';
import PathPage from './pages/PathPage';
import TreesPage from './pages/TreesPage';
import TriePage from './pages/TriePage';
import LinkedPage from './pages/LinkedPage';

export default function App() {
  return (
    <HashRouter>
      <Layout>
        <Suspense fallback={<div>Loading…</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/sort/:id" element={<SortingPage />} />
            <Route path="/search/:id" element={<SortingPage />} />
            <Route path="/graph/:id" element={<GraphPage />} />
            <Route path="/dp/:id" element={<DPPage />} />
            <Route path="/string/:id" element={<StringPage />} />
            <Route path="/structures" element={<StructuresPage />} />
            <Route path="/arrays/:id" element={<ArrayPage />} />
            <Route path="/path/:id" element={<PathPage />} />
            <Route path="/trees/:id" element={<TreesPage />} />
            <Route path="/trie/:id" element={<TriePage />} />
            <Route path="/linked/:id" element={<LinkedPage />} />
            <Route path="*" element={<div>Not found.</div>} />
          </Routes>
        </Suspense>
      </Layout>
    </HashRouter>
  );
}

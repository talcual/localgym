import { useNavigate } from 'react-router-dom';
import { CatalogBrowser } from '../components/CatalogBrowser';

export function Catalog() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Catálogo de ejercicios</h1>
      <p className="text-slate-400 text-sm">
        Explora ejercicios predefinidos y agrégalos a tu lista personal.
      </p>
      <CatalogBrowser onImported={() => navigate('/exercises')} />
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6 bg-white border border-gray-100 p-8 rounded-2xl shadow-xl">
        <div className="mx-auto w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center animate-bounce">
          <FileQuestion size={32} />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">404</h1>
          <h2 className="text-lg font-bold text-gray-800">Page Not Found</h2>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">
            The page you are looking for doesn't exist, has been moved, or you don't have access.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <button
            onClick={() => navigate(-1)}
            className="btn btn-outline flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-primary flex items-center justify-center gap-2"
          >
            <Home size={16} />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

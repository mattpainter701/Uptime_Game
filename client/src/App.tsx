import { Game } from './components/game/Game';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import './index.css';

function App() {
  return (
    <ErrorBoundary>
      <div className="w-screen h-screen overflow-hidden bg-[#0a0a15]">
        <Game />
      </div>
    </ErrorBoundary>
  );
}

export default App;

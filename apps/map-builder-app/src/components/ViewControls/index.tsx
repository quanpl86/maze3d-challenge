import './ViewControls.css';

type View = 'perspective' | 'top' | 'front' | 'side';

interface ViewControlsProps {
  onViewChange: (view: View) => void;
}

export function ViewControls({ onViewChange }: ViewControlsProps) {
  return (
    <div className="view-controls">
      <button onClick={() => onViewChange('perspective')} title="Perspective View">P</button>
      <button onClick={() => onViewChange('top')} title="Top View (Y)">T</button>
      <button onClick={() => onViewChange('front')} title="Front View (Z)">F</button>
      <button onClick={() => onViewChange('side')} title="Side View (X)">S</button>
    </div>
  );
}
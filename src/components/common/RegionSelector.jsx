import { MapPin } from 'lucide-react';
import useStore from '../../store/useStore';
import { REGION_CODES, REGION_NAMES, REGION_ICONS } from '../../constants/regions';

export default function RegionSelector() {
  const { selectedRegion, setSelectedRegion } = useStore();

  return (
    <div className="relative inline-block">
      <div className="flex items-center gap-2">
        <MapPin className="w-5 h-5 text-blue-600" />
        <select
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className="appearance-none bg-white border-2 border-blue-400 rounded-xl px-4 py-1.5 pr-10 
                     text-gray-800 font-semibold cursor-pointer
                     hover:border-blue-600 hover:shadow-lg
                     focus:outline-none focus:ring-4 focus:ring-blue-200
                     transition-all duration-200 ease-in-out
                     text-base"
        >
          {REGION_CODES.map((code) => (
            <option key={code} value={code}>
              {REGION_ICONS[code]} {REGION_NAMES[code]}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}


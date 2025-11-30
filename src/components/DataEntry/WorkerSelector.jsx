import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const WorkerSelector = ({ 
  value, 
  onChange, 
  availableNames, 
  register, 
  errors, 
  disabled = false,
  name = 'name' // 添加name属性支持
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [nameFilter, setNameFilter] = useState(value || '');
  const nameInputRef = useRef(null);
  const nameDropdownRef = useRef(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (nameDropdownRef.current && !nameDropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update filter when value changes
  useEffect(() => {
    setNameFilter(value || '');
  }, [value]);

  const handleInputChange = (inputValue) => {
    setNameFilter(inputValue);
    onChange(inputValue);
    setShowDropdown(true);
  };

  const handleNameSelect = (selectedName) => {
    onChange(selectedName);
    setNameFilter(selectedName);
    setShowDropdown(false);
    nameInputRef.current?.focus();
  };

  const filteredNames = nameFilter.trim() === '' 
    ? availableNames 
    : availableNames.filter(name => 
        name.toLowerCase().includes(nameFilter.toLowerCase())
      );

  const shouldShowAddOption = nameFilter.trim() && 
    !availableNames.some(name => name.toLowerCase() === nameFilter.toLowerCase());

  return (
    <div className="relative" ref={nameDropdownRef}>
      <div className="relative">
        <input
          ref={nameInputRef}
          type="text"
          {...register(name, { required: '请输入工人姓名' })}
          value={nameFilter}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onClick={() => setShowDropdown(true)}
          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder="输入或选择工人姓名"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => !disabled && setShowDropdown(!showDropdown)}
          className="absolute inset-y-0 right-0 flex items-center pr-3 hover:bg-gray-50 rounded-r-lg transition-colors"
          disabled={disabled}
        >
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {errors[name] && (
        <p className="mt-1 text-sm text-red-600">{errors[name].message}</p>
      )}

      {/* Dropdown */}
      {showDropdown && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredNames.length > 0 ? (
            <div className="py-1">
              {filteredNames.map(name => (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleNameSelect(name)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 text-sm"
                >
                  {name}
                </button>
              ))}
            </div>
          ) : nameFilter.trim() && (
            <div className="py-3 px-4 text-sm text-gray-500 text-center">
              没有找到匹配的工人
            </div>
          )}
          
          {filteredNames.length === 0 && !nameFilter.trim() && availableNames.length === 0 && (
            <div className="py-3 px-4 text-sm text-gray-500 text-center">
              暂无工人记录，请输入新工人姓名
            </div>
          )}
          
          {shouldShowAddOption && (
            <div className={filteredNames.length > 0 ? "border-t border-gray-200" : ""}>
              <button
                type="button"
                onClick={() => handleNameSelect(nameFilter)}
                className="w-full px-4 py-2 text-left hover:bg-blue-50 focus:outline-none focus:bg-blue-50 text-sm text-blue-600"
              >
                + 添加新工人: "{nameFilter}"
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkerSelector; 
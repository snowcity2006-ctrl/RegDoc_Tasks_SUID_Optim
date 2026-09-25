import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, X, Plus, Search, Check } from 'lucide-react';

export interface ComboboxOption {
  id: number;
  label: string;
  subLabel?: string;
  badge?: string;
  searchStr?: string;
}

interface SearchableComboboxProps {
  id?: string;
  inputId?: string;
  options: ComboboxOption[];
  value: number | '';
  onChange: (value: number | '') => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  inputContainerClassName?: string;
  onAddNew?: () => void;
  addNewTitle?: string;
  icon?: React.ReactNode;
  allowCustomValue?: boolean;
  customValue?: string;
  onCustomValueChange?: (val: string) => void;
}

// Преобразование раскладки клавиатуры (En <-> Ru) при поиске
const EN_RU_MAP: Record<string, string> = {
  q: 'й', w: 'ц', e: 'у', r: 'к', t: 'е', y: 'н', u: 'г', i: 'ш', o: 'щ', p: 'з', '[': 'х', ']': 'ъ',
  a: 'ф', s: 'ы', d: 'в', f: 'а', g: 'п', h: 'р', j: 'о', k: 'л', l: 'д', ';': 'ж', "'": 'э',
  z: 'я', x: 'ч', c: 'с', v: 'м', b: 'и', n: 'т', m: 'ь', ',': 'б', '.': 'ю',
};
const RU_EN_MAP: Record<string, string> = Object.entries(EN_RU_MAP).reduce((acc, [en, ru]) => {
  acc[ru] = en;
  return acc;
}, {} as Record<string, string>);

function convertLayout(str: string): string {
  return str
    .split('')
    .map((ch) => {
      const lower = ch.toLowerCase();
      const mapped = EN_RU_MAP[lower] || RU_EN_MAP[lower] || lower;
      return ch === ch.toUpperCase() && ch !== lower ? mapped.toUpperCase() : mapped;
    })
    .join('');
}

function normalizeSearchText(str: string): string {
  return str.toLowerCase().replace(/ё/g, 'е').trim();
}

export const SearchableCombobox: React.FC<SearchableComboboxProps> = React.memo(({
  id,
  inputId,
  options,
  value,
  onChange,
  placeholder = '-- Начните ввод или выберите --',
  emptyMessage = 'Ничего не найдено',
  disabled = false,
  className = '',
  inputContainerClassName = '',
  onAddNew,
  addNewTitle = 'Добавить в справочник',
  icon,
  allowCustomValue = false,
  customValue = '',
  onCustomValueChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hasUserTyped, setHasUserTyped] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Находим выбранный элемент с мемоизацией
  const selectedOption = useMemo(() => options.find((opt) => opt.id === value), [options, value]);

  // Сохраняем актуальные ссылки в ref, чтобы не переподписывать слушатели событий document при каждом вводе буквы
  const latestPropsRef = useRef({
    options,
    onChange,
    allowCustomValue,
    customValue,
    onCustomValueChange,
    selectedOption,
    hasUserTyped,
    query,
  });
  latestPropsRef.current = {
    options,
    onChange,
    allowCustomValue,
    customValue,
    onCustomValueChange,
    selectedOption,
    hasUserTyped,
    query,
  };

  // Синхронизируем текст инпута при изменении value извне, когда дропдаун закрыт
  useEffect(() => {
    if (!isOpen) {
      if (selectedOption) {
        setQuery(selectedOption.label);
      } else if (allowCustomValue && customValue) {
        setQuery(customValue);
      } else {
        setQuery('');
      }
      setHasUserTyped(false);
    }
  }, [value, selectedOption, isOpen, allowCustomValue, customValue]);

  // Закрытие при клике вне компонента (подписывается ТОЛЬКО когда дропдаун открыт)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        const {
          options: curOptions,
          onChange: curOnChange,
          allowCustomValue: curAllow,
          customValue: curCustom,
          onCustomValueChange: curOnCustom,
          selectedOption: curSelected,
          hasUserTyped: curTyped,
          query: curQuery,
        } = latestPropsRef.current;

        // Если введенный текст точно совпадает с одной из опций, выбираем её
        if (curTyped && curQuery.trim()) {
          const exactMatch = curOptions.find(
            (opt) => opt.label.trim().toLowerCase() === curQuery.trim().toLowerCase()
          );
          if (exactMatch) {
            curOnChange(exactMatch.id);
            setQuery(exactMatch.label);
          } else if (curAllow && curOnCustom) {
            curOnChange('');
            curOnCustom(curQuery.trim());
          } else {
            setQuery(curSelected ? curSelected.label : (curAllow && curCustom ? curCustom : ''));
          }
        } else {
          setQuery(curSelected ? curSelected.label : (curAllow && curCustom ? curCustom : ''));
        }
        setHasUserTyped(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Фильтрация опций по введенному тексту (поиск по частям слов, регистронезависимо, с поддержкой раскладки):
  // При наборе "отд кад" или "бух" отображаются все записи, содержащие введенные фрагменты слов
  const filteredOptions = useMemo(() => {
    if (!hasUserTyped || !query.trim()) return options;

    const q = query.trim();
    const qNorm = normalizeSearchText(q);
    const qAlt = normalizeSearchText(convertLayout(q));

    // Разбиваем запрос на токены (части слов) по пробелам
    const tokens = qNorm.split(/\s+/).filter(Boolean);
    const altTokens = qAlt !== qNorm ? qAlt.split(/\s+/).filter(Boolean) : [];

    const matches = options.filter((opt) => {
      const combined = normalizeSearchText(
        `${opt.label} ${opt.subLabel || ''} ${opt.badge || ''} ${opt.searchStr || ''}`
      );

      // Все токены должны входить в объединенную строку (поиск по частям слов)
      const matchesDirect = tokens.every((tok) => combined.includes(tok));
      if (matchesDirect) return true;

      // Проверка с альтернативной раскладкой клавиатуры
      if (altTokens.length > 0 && altTokens.every((tok) => combined.includes(tok))) {
        return true;
      }

      return false;
    });

    // Сортировка совпадений: опции, начинающиеся с первого токена, выводятся первыми
    matches.sort((a, b) => {
      const firstTok = tokens[0] || '';
      const aStarts = normalizeSearchText(a.label).startsWith(firstTok);
      const bStarts = normalizeSearchText(b.label).startsWith(firstTok);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
    });

    // Если разрешен ввод произвольного значения и совпадение не является точным, добавляем пункт использования текста
    if (
      allowCustomValue &&
      q &&
      !options.some((opt) => normalizeSearchText(opt.label) === qNorm)
    ) {
      return [
        ...matches,
        {
          id: -999,
          label: query.trim(),
          subLabel: 'Использовать введенное значение',
          badge: 'Свой вариант',
          searchStr: query.trim(),
        },
      ];
    }

    return matches;
  }, [options, hasUserTyped, query, allowCustomValue]);

  // Авто-скролл к подсвеченному элементу при навигации стрелками
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('.combobox-item');
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const handleSelectOption = (opt: ComboboxOption) => {
    if (opt.id === -999) {
      onChange('');
      if (onCustomValueChange) {
        onCustomValueChange(opt.label);
      }
      setQuery(opt.label);
    } else {
      onChange(opt.id);
      if (allowCustomValue && onCustomValueChange) {
        onCustomValueChange(opt.label);
      }
      setQuery(opt.label);
    }
    setHasUserTyped(false);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    if (allowCustomValue && onCustomValueChange) {
      onCustomValueChange('');
    }
    setQuery('');
    setHasUserTyped(false);
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(filteredOptions.length - 1);
      } else {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      }
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
        e.preventDefault();
        handleSelectOption(filteredOptions[highlightedIndex]);
      } else if (isOpen && filteredOptions.length === 1) {
        e.preventDefault();
        handleSelectOption(filteredOptions[0]);
      } else if (allowCustomValue && query.trim()) {
        e.preventDefault();
        const exactMatch = options.find((opt) => opt.label.trim().toLowerCase() === query.trim().toLowerCase());
        if (exactMatch) {
          handleSelectOption(exactMatch);
        } else {
          onChange('');
          if (onCustomValueChange) {
            onCustomValueChange(query.trim());
          }
          setIsOpen(false);
          setHasUserTyped(false);
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHasUserTyped(false);
      setQuery(selectedOption ? selectedOption.label : (allowCustomValue && customValue ? customValue : ''));
    }
  };

  // Подсветка всех совпавших частей слов в тексте опции
  const renderHighlighted = (text: string, _highlight: string) => {
    if (!hasUserTyped || !query.trim() || !text) return text;

    const qNorm = normalizeSearchText(query);
    const qAlt = normalizeSearchText(convertLayout(query));
    const allTokens = Array.from(
      new Set(
        [...qNorm.split(/\s+/), ...(qAlt !== qNorm ? qAlt.split(/\s+/) : [])]
          .map((t) => t.trim())
          .filter((t) => t.length > 0)
      )
    );

    if (allTokens.length === 0) return text;

    const escaped = allTokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escaped.join('|')})`, 'gi');

    const parts = text.split(regex);
    if (parts.length <= 1) return text;

    return (
      <>
        {parts.map((part, i) => {
          const isMatch = allTokens.some(
            (tok) => normalizeSearchText(tok) === normalizeSearchText(part)
          );
          if (isMatch) {
            return (
              <span key={i} className="text-blue-400 font-semibold bg-blue-500/20 px-0.5 rounded">
                {part}
              </span>
            );
          }
          return part;
        })}
      </>
    );
  };

  return (
    <div id={id} ref={containerRef} className={`relative min-w-0 w-full ${className}`}>
      <div className="flex gap-2 min-w-0 w-full items-center">
        {/* Поле ввода с автодополнением и клавиатурным поиском */}
        <div
          className={`relative min-w-0 flex-1 flex items-center min-h-[42px] ${
            inputContainerClassName || 'bg-white dark:bg-[#0F1115]'
          } border ${
            isOpen ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-slate-200 dark:border-[#2D3139]'
          } rounded-xl transition-all duration-150 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}`}
          onClick={() => {
            if (!disabled) {
              setIsOpen(true);
              inputRef.current?.focus();
            }
          }}
        >
          {icon && <div className="pl-3 text-slate-400 dark:text-gray-500 shrink-0">{icon}</div>}

          <input
            id={inputId}
            ref={inputRef}
            type="text"
            disabled={disabled}
            value={query}
            placeholder={placeholder}
            onFocus={() => {
              setIsOpen(true);
              setHighlightedIndex(-1);
              setTimeout(() => {
                inputRef.current?.select();
              }, 20);
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              setHasUserTyped(true);
              setIsOpen(true);
              setHighlightedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="w-full min-w-0 flex-1 bg-transparent px-3 py-2 text-xs text-slate-900 dark:text-[#E0E0E0] placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none truncate"
          />

          <div className="flex items-center gap-1 pr-2 shrink-0">
            {(value !== '' || (allowCustomValue && customValue)) && (
              <button
                type="button"
                onClick={handleClear}
                title="Очистить выбор"
                className="p-1 text-slate-400 hover:text-rose-500 dark:text-gray-400 dark:hover:text-rose-400 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) {
                  const nextOpen = !isOpen;
                  setIsOpen(nextOpen);
                  if (nextOpen) {
                    inputRef.current?.focus();
                  }
                }
              }}
              className="p-1 text-slate-400 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200 transition-transform"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-500 dark:text-blue-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Кнопка быстрого добавления в справочник */}
        {onAddNew && (
          <button
            type="button"
            onClick={onAddNew}
            title={addNewTitle}
            className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-600/10 dark:hover:bg-blue-600/20 dark:text-blue-400 rounded-xl border border-blue-200 dark:border-blue-500/30 transition-colors cursor-pointer flex items-center justify-center shrink-0"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Выпадающий список совпадений */}
      {isOpen && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-[#1F222B] border border-slate-200 dark:border-[#2D3139] rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 max-h-60 overflow-y-auto"
        >
          {hasUserTyped && query.trim() && (
            <div className="px-3 py-1.5 bg-slate-50 dark:bg-[#171A21] border-b border-slate-200 dark:border-[#2D3139] text-[11px] text-slate-500 dark:text-gray-400 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Search className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                <span>Поиск: «<strong className="text-slate-800 dark:text-gray-200">{query.trim()}</strong>»</span>
              </span>
              <span>Найдено: {filteredOptions.length}</span>
            </div>
          )}

          {filteredOptions.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-xs text-slate-400 dark:text-gray-400">{emptyMessage}</p>
              {onAddNew && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onAddNew();
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-600/20 dark:hover:bg-blue-600/30 dark:text-blue-300 rounded-lg text-xs font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {addNewTitle}
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-[#2D3139]/40 p-1">
              {filteredOptions.map((opt, index) => {
                const isSelected = opt.id === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <div
                    key={opt.id}
                    onClick={() => handleSelectOption(opt)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`combobox-item flex items-center justify-between gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-200 font-medium'
                        : isHighlighted
                        ? 'bg-slate-100 dark:bg-[#2D3139]/70 text-slate-900 dark:text-[#E0E0E0]'
                        : 'hover:bg-slate-50 dark:hover:bg-[#2D3139]/40 text-slate-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="truncate">{renderHighlighted(opt.label, query)}</span>
                        {opt.badge && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-[#2D3139] text-slate-600 dark:text-gray-400 rounded border border-slate-200 dark:border-transparent">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.subLabel && (
                        <span className="text-[11px] text-slate-500 dark:text-gray-400 truncate mt-0.5">
                          {renderHighlighted(opt.subLabel, query)}
                        </span>
                      )}
                    </div>

                    {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

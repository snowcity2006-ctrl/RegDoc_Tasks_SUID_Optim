import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { UserCheck, X, Check, AlertCircle, Building2, Network, Maximize2, Minimize2 } from 'lucide-react';
import { Employee, Department, Organization } from '../../types';
import { SearchableCombobox, ComboboxOption } from '../documents/SearchableCombobox';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (emp: Omit<Employee, 'id'> & { id?: number }) => Promise<void>;
  departments: Department[];
  organizations: Organization[];
  onOpenNewOrgModal: () => void;
  onOpenNewDepartmentModal: (orgId?: number) => void;
  initialData?: Employee | null;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  departments,
  organizations,
  onOpenNewOrgModal,
  onOpenNewDepartmentModal,
  initialData,
}) => {
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');
  const [departmentShortName, setDepartmentShortName] = useState('');
  const [organizationId, setOrganizationId] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Сброс и инициализация полей формы
  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setFullName(initialData.fullName || '');
      setPosition(initialData.position || '');
      setDepartmentShortName(initialData.departmentShortName || '');
      setOrganizationId(initialData.organizationId || '');
    } else {
      setFullName('');
      setPosition('');
      const firstOrgId = organizations.length > 0 ? organizations[0].id : '';
      setOrganizationId(firstOrgId);
      const filteredDepts = departments.filter((d) => !firstOrgId || d.organizationId === firstOrgId);
      setDepartmentShortName(filteredDepts.length > 0 ? filteredDepts[0].shortName : '');
    }
    setError(null);
  }, [initialData, isOpen, organizations, departments]);

  // Автоматический выбор вновь добавленного подразделения без сброса введенного ФИО
  const prevDeptsLengthRef = React.useRef(departments.length);
  useEffect(() => {
    if (isOpen && departments.length > prevDeptsLengthRef.current) {
      const latestDept = departments[departments.length - 1];
      if (latestDept && (!organizationId || latestDept.organizationId === Number(organizationId))) {
        setDepartmentShortName(latestDept.shortName);
      }
    }
    prevDeptsLengthRef.current = departments.length;
  }, [departments, isOpen, organizationId]);

  // Фильтрация подразделений по выбранной организации
  const availableDepartments = useMemo(() => {
    if (!organizationId) return departments;
    return departments.filter((d) => d.organizationId === Number(organizationId));
  }, [departments, organizationId]);

  // Опции организаций для выпадающего списка с поиском по части слова
  const orgOptions: ComboboxOption[] = useMemo(() => {
    return organizations.map((org) => ({
      id: org.id,
      label: org.name,
      subLabel: org.director ? `Руководитель: ${org.director}` : (org.email ? `Email: ${org.email}` : undefined),
      badge: org.email || undefined,
      searchStr: `${org.name} ${org.director || ''} ${org.email || ''}`,
    }));
  }, [organizations]);

  // Опции структурных подразделений для выпадающего списка с поиском по части слова
  const deptOptions: ComboboxOption[] = useMemo(() => {
    return availableDepartments.map((dept) => ({
      id: dept.id,
      label: dept.shortName,
      subLabel: dept.name,
      badge: !organizationId && dept.organizationName ? dept.organizationName : undefined,
      searchStr: `${dept.shortName} ${dept.name} ${dept.organizationName || ''}`,
    }));
  }, [availableDepartments, organizationId]);

  // Идентификатор выбранного подразделения
  const selectedDeptId = useMemo(() => {
    const cleanCurrent = departmentShortName.trim().toLowerCase();
    if (!cleanCurrent) return '';
    const found = availableDepartments.find((d) => d.shortName.trim().toLowerCase() === cleanCurrent);
    return found ? found.id : '';
  }, [availableDepartments, departmentShortName]);

  // Обработчик выбора организации
  const handleOrgChange = useCallback((newOrgId: number | '') => {
    setOrganizationId(newOrgId);
    if (newOrgId) {
      const filtered = departments.filter((d) => d.organizationId === Number(newOrgId));
      if (departmentShortName) {
        const stillValid = filtered.some(
          (d) => d.shortName.trim().toLowerCase() === departmentShortName.trim().toLowerCase()
        );
        if (!stillValid) {
          setDepartmentShortName(filtered.length > 0 ? filtered[0].shortName : '');
        }
      } else if (filtered.length > 0) {
        setDepartmentShortName(filtered[0].shortName);
      }
    }
  }, [departments, departmentShortName]);

  // Обработчик выбора подразделения из списка совпадений
  const handleDeptChange = useCallback((selectedId: number | '') => {
    if (selectedId === '') {
      setDepartmentShortName('');
    } else {
      const dept = availableDepartments.find((d) => d.id === selectedId);
      if (dept) {
        setDepartmentShortName(dept.shortName);
        if (!organizationId || organizationId !== dept.organizationId) {
          setOrganizationId(dept.organizationId);
        }
      }
    }
  }, [availableDepartments, organizationId]);

  // Обработчик ручного ввода названия/сокращения подразделения
  const handleCustomDeptChange = useCallback((val: string) => {
    setDepartmentShortName(val);
    const clean = val.trim().toLowerCase();
    if (clean) {
      const found = departments.find(
        (d) => d.shortName.trim().toLowerCase() === clean || (d.name && d.name.trim().toLowerCase() === clean)
      );
      if (found && (!organizationId || organizationId !== found.organizationId)) {
        setOrganizationId(found.organizationId);
      }
    }
  }, [departments, organizationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Поле «Сотрудник» обязательно для заполнения');
      return;
    }
    if (!departmentShortName.trim()) {
      setError('Поле «Структурное подразделение» обязательно для заполнения');
      return;
    }
    if (!organizationId) {
      setError('Поле «Организация» обязательно для заполнения');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: initialData ? initialData.id : undefined,
        fullName: fullName.trim(),
        position: position.trim(),
        departmentShortName: departmentShortName.trim(),
        organizationId: Number(organizationId),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения сотрудника');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const currentDeptMatch = availableDepartments.find(
    (d) => d.shortName.trim().toLowerCase() === departmentShortName.trim().toLowerCase()
  );

  return (
    <div className={`fixed inset-0 z-[60] flex items-center justify-center ${isMaximized ? 'p-1' : 'p-2 sm:p-4'} bg-black/75 backdrop-blur-xs animate-in fade-in duration-150`}>
      <div
        id="employee-modal-dialog"
        className={`bg-white dark:bg-[#171A21] shadow-2xl border border-slate-200 dark:border-[#2D3139] overflow-hidden flex flex-col text-slate-900 dark:text-[#E0E0E0] transition-all duration-200 ${
          isMaximized
            ? 'w-[99vw] h-[98vh] rounded-xl'
            : 'w-[88vw] max-w-3xl max-h-[92vh] rounded-2xl'
        }`}
      >
        {/* Заголовок (двойной клик разворачивает окно) */}
        <div
          id="employee-modal-header"
          onDoubleClick={() => setIsMaximized((prev) => !prev)}
          title="Двойной клик разворачивает / восстанавливает окно"
          className="directory-modal-header px-6 py-4 border-b border-blue-500/50 flex items-center justify-between bg-blue-600 text-white shrink-0 select-none cursor-default"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-700/80 border border-blue-400/40 text-white flex items-center justify-center shadow-xs shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3
                id="employee-modal-title"
                className="text-base font-bold text-white tracking-wide truncate"
                style={{ color: '#ffffff' }}
              >
                {initialData ? 'Редактирование сотрудника' : 'Новый сотрудник'}
              </h3>
              <p id="employee-modal-subtitle" className="text-[11px] text-blue-100 truncate">
                {initialData ? 'Изменение данных сотрудника' : 'Добавление нового сотрудника в организацию'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button
              type="button"
              onClick={() => setIsMaximized((prev) => !prev)}
              title={isMaximized ? 'Восстановить исходный размер' : 'Развернуть на весь экран'}
              className="text-blue-200 hover:text-white hover:bg-blue-700/60 p-1.5 rounded-lg transition-colors cursor-pointer"
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Закрыть окно"
              className="text-blue-200 hover:text-white hover:bg-blue-700/60 p-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {initialData && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1">
                ID записи
              </label>
              <input
                type="text"
                disabled
                value={initialData.id}
                className="w-24 px-3 py-2 bg-slate-100 dark:bg-[#0F1115] border border-slate-200 dark:border-[#2D3139] rounded-xl text-xs font-mono text-slate-500 dark:text-gray-500 cursor-not-allowed"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
              Сотрудник (ФИО) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Например: Иванов Иван Иванович"
              className="w-full px-3.5 py-2.5 bg-white dark:bg-[#0F1115] border border-slate-200 dark:border-[#2D3139] rounded-xl text-xs text-slate-900 dark:text-[#E0E0E0] placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
              Должность
            </label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Например: Главный специалист, Начальник отдела"
              className="w-full px-3.5 py-2.5 bg-white dark:bg-[#0F1115] border border-slate-200 dark:border-[#2D3139] rounded-xl text-xs text-slate-900 dark:text-[#E0E0E0] placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* Организация с возможностью поиска по части слова и кнопкой '+' */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
              Организация <span className="text-rose-500">*</span>
            </label>
            <SearchableCombobox
              id="employee-modal-organization"
              inputId="employee-modal-org-input"
              options={orgOptions}
              value={organizationId}
              onChange={handleOrgChange}
              placeholder="-- Начните ввод названия или выберите организацию --"
              emptyMessage="Организации не найдены"
              onAddNew={onOpenNewOrgModal}
              addNewTitle="Добавить новую организацию в справочник"
              icon={<Building2 className="w-4 h-4" />}
            />
          </div>

          {/* Структурное подразделение с возможностью поиска по части слова и кнопкой '+' */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
              Структурное подразделение (Сокращенное СП) <span className="text-rose-500">*</span>
            </label>
            <SearchableCombobox
              id="employee-modal-department"
              inputId="employee-modal-dept-input"
              options={deptOptions}
              value={selectedDeptId}
              onChange={handleDeptChange}
              allowCustomValue={true}
              customValue={departmentShortName}
              onCustomValueChange={handleCustomDeptChange}
              placeholder="-- Начните ввод сокращения или названия СП --"
              emptyMessage="Подразделения не найдены"
              onAddNew={() => onOpenNewDepartmentModal(organizationId ? Number(organizationId) : undefined)}
              addNewTitle="Добавить новое структурное подразделение в справочник"
              icon={<Network className="w-4 h-4" />}
            />

            {currentDeptMatch && (
              <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-1 truncate" title={currentDeptMatch.name}>
                Полное наименование: <span className="text-slate-700 dark:text-gray-300 font-medium">{currentDeptMatch.name}</span>
              </p>
            )}
            {availableDepartments.length === 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                Для выбранной организации нет подразделений в справочнике. Нажмите «+» для добавления в справочник или введите сокращение вручную.
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-[#2D3139] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white text-xs font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-[#1F222B] transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs shadow-blue-500/30 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{saving ? 'Сохранение...' : 'Сохранить'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

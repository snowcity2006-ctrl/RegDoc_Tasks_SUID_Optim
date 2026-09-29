import React from 'react';
import {
  FileText,
  Calendar,
  Building2,
  FolderOpen,
  Globe,
  Tag,
  Compass,
  X,
  Edit2,
  Printer,
  ExternalLink,
  Clock,
  MessageSquare,
  Maximize2,
  Minimize2,
  Laptop,
  Link2,
  Eye,
  User,
} from 'lucide-react';
import { DocumentRecord } from '../../types';
import { formatDateRussian, formatDateTimeRussian } from '../../utils/date';
import { electronBridge } from '../../services/electronBridge';
import {
  resolveAstraPathForOpening,
  isAstraNetworkPath,
  getAstraCurrentUser,
} from '../../utils/astraPath';
import { getInterconnectedDocIds } from '../../utils/relatedDocs';

interface DocumentCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentRecord | null;
  onEdit: (doc: DocumentRecord) => void;
  allDocuments?: DocumentRecord[];
  onViewDoc?: (doc: DocumentRecord) => void;
}

export const DocumentCardModal: React.FC<DocumentCardModalProps> = ({
  isOpen,
  onClose,
  document: doc,
  onEdit,
  allDocuments = [],
  onViewDoc,
}) => {
  const [isMaximized, setIsMaximized] = React.useState(false);

  const relatedDocs = React.useMemo(() => {
    if (!doc || !allDocuments || allDocuments.length === 0) return [];
    const connectedIds = getInterconnectedDocIds(doc.id, allDocuments);
    return allDocuments.filter((d) => d.id !== doc.id && connectedIds.has(d.id));
  }, [doc, allDocuments]);

  if (!isOpen || !doc) return null;

  const handleOpenFile = async () => {
    if (doc.filePath) {
      await electronBridge.openPath(doc.filePath);
    }
  };

  const handleOpenSed = async () => {
    if (doc.sedUrl) {
      await electronBridge.openExternal(doc.sedUrl);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isMaximized ? 'p-1' : 'p-2 sm:p-4'} bg-black/75`}>
      <div
        id="document-card-modal-container"
        className={`bg-white dark:bg-[#171A21] shadow-xl border border-slate-200 dark:border-[#2D3139] overflow-hidden flex flex-col text-slate-900 dark:text-[#E0E0E0] ${
          isMaximized
            ? 'w-[99vw] h-[98vh] rounded-xl'
            : 'w-[92vw] max-w-5xl max-h-[92vh] rounded-2xl'
        }`}
        style={{ contain: 'content' }}
      >
        {/* Заголовок карточки (двойной клик разворачивает окно) */}
        <div
          id="document-card-modal-header"
          onDoubleClick={() => setIsMaximized((prev) => !prev)}
          title="Двойной клик разворачивает / восстанавливает окно"
          className="px-6 py-4 border-b border-blue-500/50 flex items-center justify-between bg-blue-600 text-white shrink-0 select-none cursor-default"
          style={{ backgroundColor: '#2563eb' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-700/80 text-white flex items-center justify-center border border-blue-400/40 shrink-0 shadow-xs">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h3
                id="document-card-modal-title"
                className="text-base font-bold text-white flex items-center gap-2 flex-wrap"
                style={{ color: '#ffffff' }}
              >
                <span style={{ color: '#ffffff' }}>Карточка документа №{doc.id}</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-700/80 border border-blue-400/40 text-white font-mono shadow-xs" style={{ color: '#ffffff' }}>
                  {doc.docTypeName}
                </span>
              </h3>
              <p
                id="document-card-modal-subtitle"
                className="text-xs text-blue-100 font-mono"
                style={{ color: '#dbeafe' }}
              >
                Зарегистрирован: {formatDateTimeRussian(doc.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button
              onClick={handlePrint}
              title="Печать карточки документа"
              className="p-1.5 text-blue-100 hover:text-white hover:bg-blue-700/80 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                onClose();
                onEdit(doc);
              }}
              title="Редактировать документ"
              className="p-1.5 text-blue-100 hover:text-white hover:bg-blue-700/80 rounded-lg transition-colors cursor-pointer"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsMaximized((prev) => !prev)}
              title={isMaximized ? 'Восстановить исходный размер' : 'Развернуть на весь экран'}
              className="p-1.5 text-blue-100 hover:text-white hover:bg-blue-700/80 rounded-lg transition-colors cursor-pointer"
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              title="Закрыть окно"
              className="p-1.5 text-blue-100 hover:text-white hover:bg-blue-700/80 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Содержимое карточки */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          
          {/* Тема документа */}
          <div className="p-4 bg-slate-50 dark:bg-[#0F1115] rounded-xl border border-slate-200 dark:border-[#2D3139]">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-gray-400 uppercase tracking-wider block mb-1">
              Тема / Краткое содержание
            </span>
            <p className="text-sm font-semibold text-slate-900 dark:text-[#E0E0E0] leading-relaxed">
              {doc.subject}
            </p>
          </div>

          {/* Классификация */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-[#0F1115] rounded-xl border border-slate-200 dark:border-[#2D3139]">
              <span className="text-slate-600 dark:text-gray-400 text-[11px] flex items-center gap-1 mb-1 font-medium">
                <Tag className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                Тип документа
              </span>
              <p className="font-semibold text-slate-900 dark:text-[#E0E0E0]">
                {doc.docTypeName || '—'}
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-[#0F1115] rounded-xl border border-slate-200 dark:border-[#2D3139]">
              <span className="text-slate-600 dark:text-gray-400 text-[11px] flex items-center gap-1 mb-1 font-medium">
                <Compass className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                Направление
              </span>
              <p className="font-semibold text-slate-900 dark:text-[#E0E0E0]">
                {doc.directionName || '—'}
              </p>
            </div>
          </div>

          {/* Исходящие и Входящие реквизиты */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-50 dark:bg-[#0F1115] rounded-xl border border-slate-200 dark:border-[#2D3139] space-y-1.5">
              <span className="text-[11px] font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wider block">
                Исходящие реквизиты
              </span>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-gray-400">Исх. №:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-[#E0E0E0]">
                  {doc.outgoingNumber || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-gray-400">Исх. дата:</span>
                <span className="font-mono text-slate-900 dark:text-[#E0E0E0]">
                  {formatDateRussian(doc.outgoingDate)}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-[#0F1115] rounded-xl border border-slate-200 dark:border-[#2D3139] space-y-1.5">
              <span className="text-[11px] font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wider block">
                Входящие реквизиты
              </span>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-gray-400">Вх. №:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-[#E0E0E0]">
                  {doc.incomingNumber || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-gray-400">Вх. дата:</span>
                <span className="font-mono text-slate-900 dark:text-[#E0E0E0]">
                  {formatDateRussian(doc.incomingDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Стороны: Отправитель и Получатель */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-[#0F1115] rounded-xl border border-slate-200 dark:border-[#2D3139]">
              <span className="text-slate-600 dark:text-gray-400 text-[11px] flex items-center gap-1 mb-1 font-medium">
                <Building2 className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                Отправитель
              </span>
              <p className="font-semibold text-slate-900 dark:text-[#E0E0E0]">
                {doc.senderName || '—'}
              </p>
              {(doc.senderDepartmentName || doc.signatoryEmployeeName || doc.senderEmployeeName) && (
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-[#2D3139]/60 space-y-1">
                  {doc.senderDepartmentName && (
                    <div className="text-xs">
                      <span className="text-slate-500 dark:text-gray-400 text-[10px] block mb-0.5">Структурное подразделение:</span>
                      <span className="text-blue-600 dark:text-blue-400 font-medium">{doc.senderDepartmentName}</span>
                    </div>
                  )}
                  {doc.signatoryEmployeeName && (
                    <div className="text-xs">
                      <span className="text-slate-500 dark:text-gray-400 text-[10px] block mb-0.5">Подписал:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">{doc.signatoryEmployeeName}</span>
                    </div>
                  )}
                  {doc.senderEmployeeName && (
                    <div className="text-xs">
                      <span className="text-slate-500 dark:text-gray-400 text-[10px] block mb-0.5">Исполнитель:</span>
                      <span className="text-slate-700 dark:text-gray-200 font-medium">{doc.senderEmployeeName}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 dark:bg-[#0F1115] rounded-xl border border-slate-200 dark:border-[#2D3139]">
              <span className="text-slate-600 dark:text-gray-400 text-[11px] flex items-center gap-1 mb-1 font-medium">
                <Building2 className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                Получатель
              </span>
              <p className="font-semibold text-slate-900 dark:text-[#E0E0E0]">
                {doc.recipientName || '—'}
              </p>
              {doc.recipientEmployeesDetails && doc.recipientEmployeesDetails.length > 0 ? (
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-[#2D3139]/60 flex flex-col gap-1.5">
                  <span className="text-slate-500 dark:text-gray-400 text-[10px] block mb-0.5">ФИО Получателя:</span>
                  <div className="flex flex-col gap-1">
                    {doc.recipientEmployeesDetails.map((emp, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 text-xs bg-white dark:bg-[#1A1D24] p-1.5 rounded-lg border border-slate-200/80 dark:border-[#2D3139]"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <User className="w-3 h-3 text-blue-500 shrink-0" />
                          <span className="font-semibold text-slate-800 dark:text-gray-200 truncate">{emp.employeeName}</span>
                          {emp.departmentName && (
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 shrink-0">
                              ({emp.departmentName})
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-medium text-slate-600 dark:text-gray-400 bg-slate-100 dark:bg-[#2D3139] px-1.5 py-0.5 rounded shrink-0">
                          {emp.organizationName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : doc.recipientEmployeeNames ? (
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-[#2D3139]/60">
                  <span className="text-slate-500 dark:text-gray-400 text-[10px] block mb-0.5">ФИО Получателя:</span>
                  <span className="text-blue-600 dark:text-blue-400 font-medium text-xs">
                    {doc.recipientEmployeeNames}
                  </span>
                </div>
              ) : null}
              {doc.recipientDepartmentNames && (!doc.recipientEmployeesDetails || doc.recipientEmployeesDetails.length === 0) && (
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-[#2D3139]/60">
                  <span className="text-slate-500 dark:text-gray-400 text-[10px] block mb-0.5">Структурные подразделения:</span>
                  <span className="text-indigo-600 dark:text-indigo-300 font-medium text-xs">
                    {doc.recipientDepartmentNames}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Ссылки на файлы и СЭД */}
          <div className="space-y-2">
            {doc.filePath ? (
              (() => {
                const isFolder = doc.filePath.endsWith('/') || doc.filePath.endsWith('\\') || !/\.[a-zA-Z0-9]{1,8}$/.test(doc.filePath.trim());
                const isAstra = isAstraNetworkPath(doc.filePath);
                const localUser = getAstraCurrentUser();
                const resolvedPath = resolveAstraPathForOpening(doc.filePath, localUser);

                return (
                  <div className={`p-3 bg-slate-50 dark:bg-[#0F1115] rounded-xl border ${isFolder ? 'border-emerald-300 dark:border-emerald-500/30' : 'border-blue-300 dark:border-blue-500/30'} flex flex-col gap-2`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 overflow-hidden pr-2">
                        {isFolder ? (
                          <FolderOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        )}
                        <div className="truncate">
                          <span className="text-[10px] text-slate-500 dark:text-gray-400 block">
                            {isFolder ? 'Сетевая папка документа (ссылка в БД)' : 'Файл документа (сетевая ссылка в БД)'}
                          </span>
                          <span className={`font-mono ${isFolder ? 'text-emerald-700 dark:text-emerald-400' : 'text-blue-700 dark:text-blue-400'} font-medium truncate block select-all`}>
                            {doc.filePath}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={handleOpenFile}
                        className={`px-3 py-1.5 ${isFolder ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg font-medium text-[11px] flex items-center gap-1 shrink-0 transition-colors cursor-pointer`}
                        title={isFolder ? 'Открыть папку в файловом менеджере ОС' : 'Открыть файл в ОС'}
                      >
                        <span>{isFolder ? 'Открыть папку' : 'Открыть'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Разрешение пути для Astra Linux на текущей рабочей станции */}
                    {isAstra && (
                      <div className="pt-2 border-t border-slate-200 dark:border-[#1F222B] text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-600 dark:text-gray-400">
                        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-300/90 font-medium">
                          <Laptop className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                          <span>На этом компьютере ({localUser}):</span>
                        </div>
                        <span className="font-mono text-slate-800 dark:text-gray-300 truncate bg-slate-100 dark:bg-[#14171E] px-2 py-0.5 rounded border border-slate-200 dark:border-[#222630] select-all">
                          {resolvedPath}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="p-3 bg-slate-50 dark:bg-[#0F1115] rounded-xl border border-slate-200 dark:border-[#2D3139] text-slate-500 dark:text-gray-400 flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                <span>Файл или папка документа не прикреплены</span>
              </div>
            )}

            {doc.sedUrl ? (
              <div className="p-3 bg-slate-50 dark:bg-[#0F1115] rounded-xl border border-blue-200 dark:border-blue-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden pr-2">
                  <Globe className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
                  <div className="truncate">
                    <span className="text-[10px] text-slate-500 dark:text-gray-400 block">Электронная карточка в СЭД</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400 font-medium truncate block">
                      {doc.sedUrl}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleOpenSed}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-[11px] flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                >
                  <span>Перейти</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            ) : null}
          </div>

          {/* Связанные документы */}
          {relatedDocs.length > 0 && (
            <div className="p-3.5 bg-slate-50 dark:bg-[#0F1115] rounded-xl border border-blue-200 dark:border-blue-500/25">
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5" />
                Взаимосвязанные документы ({relatedDocs.length})
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {relatedDocs.map((rDoc) => (
                  <div
                    key={rDoc.id}
                    onClick={() => onViewDoc?.(rDoc)}
                    className="p-2 bg-white dark:bg-[#171A21] hover:bg-slate-100 dark:hover:bg-[#1F222B] border border-slate-200 dark:border-[#2D3139] hover:border-blue-400 dark:hover:border-blue-500/40 rounded-lg flex items-center justify-between gap-3 group cursor-pointer transition-all select-none shadow-xs"
                    title="Нажмите, чтобы открыть карточку этого связанного документа"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">№{rDoc.id}</span>
                        {rDoc.docTypeName && (
                          <span className="text-[11px] text-slate-700 dark:text-gray-300 font-medium">{rDoc.docTypeName}</span>
                        )}
                        {rDoc.outgoingNumber && (
                          <span className="text-[10px] text-slate-600 dark:text-gray-400 font-mono bg-slate-100 dark:bg-[#0F1115] px-1.5 py-0.5 rounded border border-slate-200 dark:border-[#2D3139]">
                            Исх: {rDoc.outgoingNumber}
                          </span>
                        )}
                        {rDoc.incomingNumber && (
                          <span className="text-[10px] text-slate-600 dark:text-gray-400 font-mono bg-slate-100 dark:bg-[#0F1115] px-1.5 py-0.5 rounded border border-slate-200 dark:border-[#2D3139]">
                            Вх: {rDoc.incomingNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-800 dark:text-gray-200 truncate font-medium">{rDoc.subject}</p>
                    </div>
                    <div className="p-1 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0">
                      <Eye className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Примечания */}
          {doc.comments && (
            <div className="p-3.5 bg-slate-50 dark:bg-[#0F1115] rounded-xl border border-slate-200 dark:border-[#2D3139]">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-gray-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />
                Примечания
              </span>
              <p className="text-slate-800 dark:text-[#E0E0E0] leading-relaxed">
                {doc.comments}
              </p>
            </div>
          )}

        </div>

        {/* Футер */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-[#2D3139] bg-slate-50 dark:bg-[#1F222B] flex items-center justify-between text-xs text-slate-500 dark:text-gray-400 shrink-0">
          <div className="flex items-center gap-1 text-[11px]">
            <Clock className="w-3.5 h-3.5" />
            <span>Обновлено: {formatDateTimeRussian(doc.updatedAt)}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white dark:bg-[#0F1115] border border-slate-300 dark:border-[#2D3139] hover:bg-slate-100 dark:hover:bg-[#2D3139] text-slate-800 dark:text-[#E0E0E0] rounded-xl font-semibold transition-colors cursor-pointer shadow-xs"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
};

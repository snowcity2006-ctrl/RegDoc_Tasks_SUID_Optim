import { Project } from '../types';

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Очищает название проекта от дублирующегося кода проекта в начале строки.
 * Например:
 * "4674 • Строительство объекта" -> "Строительство объекта"
 * "4674 - Строительство объекта" -> "Строительство объекта"
 * "[4674] Строительство объекта" -> "Строительство объекта"
 * "4674 Строительство объекта"   -> "Строительство объекта"
 */
export function stripCodeFromProjectName(projectName?: string | null, projectCode?: string | null): string {
  if (!projectName) return '';
  let cleaned = projectName.trim();

  // Если известен код проекта, убираем его вхождение в начале строки
  if (projectCode && projectCode.trim()) {
    const code = projectCode.trim();
    const esc = escapeRegExp(code);

    // [4674] или (4674) с последующими разделителями или пробелами
    const bracketRegex = new RegExp(`^[\\[\\(]${esc}[\\]\\)]\\s*[•\\-\\–\\—\\:\\.]?\\s*`, 'i');
    cleaned = cleaned.replace(bracketRegex, '').trim();

    // 4674 с разделителем (•, -, —, :, .) или пробелом
    const prefixRegex = new RegExp(`^${esc}\\s*([•\\-\\–\\—\\:\\.]|\\s)\\s*`, 'i');
    cleaned = cleaned.replace(prefixRegex, '').trim();

    // Случай, когда код остался строго в начале
    if (cleaned.toLowerCase().startsWith(code.toLowerCase())) {
      cleaned = cleaned.slice(code.length).replace(/^\\s*[•\\-\\–\\—\\:\\.]?\\s*/, '').trim();
    }
  }

  // Общий случай: если в начале строки шаблон "1234 • " или "[1234] "
  cleaned = cleaned.replace(/^\[?[A-Za-zА-Яа-я0-9_\-\.\/]{2,15}\]?\s*[•\–\—\:]\s*/, '').trim();

  return cleaned || projectName.trim();
}

/**
 * Автоматически сопоставляет задачу с проектом из справочника «Проекты».
 * Подтягивает код проекта из справочника и возвращает чистое наименование проекта без дублирования кода.
 */
export function resolveTaskProject(
  task: {
    projectId?: number | null;
    projectCode?: string;
    projectName?: string;
  },
  projects: Project[] = []
): {
  project?: Project;
  projectCode: string;
  projectName: string;
} {
  let matched: Project | undefined;

  // 1. Поиск по projectId
  if (task.projectId) {
    matched = projects.find((p) => p.id === task.projectId);
  }

  // 2. Если не найден по id, поиск по коду проекта
  if (!matched && task.projectCode && task.projectCode.trim()) {
    const codeNorm = task.projectCode.trim().toLowerCase();
    matched = projects.find((p) => p.code && p.code.trim().toLowerCase() === codeNorm);
  }

  // 3. Если не найден, поиск по точному или очищенному названию проекта
  if (!matched && task.projectName && task.projectName.trim()) {
    const rawName = task.projectName.trim();
    const rawLower = rawName.toLowerCase();

    // Прямое совпадение
    matched = projects.find((p) => p.name.trim().toLowerCase() === rawLower);

    // Совпадение по коду проекта, содержащемуся в начале названия
    if (!matched) {
      for (const pr of projects) {
        if (pr.code && pr.code.trim()) {
          const prCodeLower = pr.code.trim().toLowerCase();
          if (
            rawLower.startsWith(prCodeLower + ' ') ||
            rawLower.startsWith(prCodeLower + '•') ||
            rawLower.startsWith(prCodeLower + '-') ||
            rawLower.startsWith('[' + prCodeLower + ']')
          ) {
            matched = pr;
            break;
          }
        }
      }
    }

    // Совпадение с очищенным именем
    if (!matched) {
      const strippedInput = stripCodeFromProjectName(rawName).toLowerCase();
      matched = projects.find((p) => {
        const strippedPr = stripCodeFromProjectName(p.name, p.code).toLowerCase();
        return strippedPr === strippedInput;
      });
    }
  }

  // Резолвим код: берем из найденного проекта (из справочника), либо исходный код задачи
  const resolvedCode = matched?.code || task.projectCode || '';

  // Резолвим наименование: берем из найденного проекта (или задачи) и гарантированно убираем дублирование кода
  const rawName = matched?.name || task.projectName || '';
  const resolvedName = stripCodeFromProjectName(rawName, resolvedCode);

  return {
    project: matched,
    projectCode: resolvedCode,
    projectName: resolvedName,
  };
}

import { trpc } from "@/lib/trpc";
import { useLocalAuth } from "./useLocalAuth";

/**
 * Hook لجلب صلاحيات الـ Sections للمستخدم الحالي
 * يُعيد دالة hasSection(module, section) للتحقق من الصلاحية
 */
export function useSectionPermission() {
  const { session } = useLocalAuth();

  const { data: permsMap, isLoading } = trpc.sectionPermissions.myPermissions.useQuery(
    undefined,
    { enabled: !!session }
  );

  /**
   * التحقق من صلاحية Section معين
   * @returns 'all' | 'self' | 'hidden' | 'all' (default إذا لم توجد صلاحية محددة)
   */
  function getSectionVisibility(module: string, section: string): 'all' | 'self' | 'hidden' {
    if (!permsMap) return 'all'; // Default: كل شيء مرئي حتى تُحمَّل الصلاحيات
    const key = `${module}.${section}`;
    const perm = permsMap[key];
    if (!perm) return 'all'; // إذا لم تُحدَّد صلاحية، يُعرض للجميع
    return perm.visibility as 'all' | 'self' | 'hidden';
  }

  /**
   * هل يمكن رؤية هذا الـ Section؟
   */
  function canViewSection(module: string, section: string): boolean {
    return getSectionVisibility(module, section) !== 'hidden';
  }

  /**
   * هل يرى المستخدم بيانات الجميع أم بياناته فقط؟
   */
  function viewsAllData(module: string, section: string): boolean {
    return getSectionVisibility(module, section) === 'all';
  }

  /**
   * هل يمكن تعديل هذا الـ Section؟
   */
  function canEditSection(module: string, section: string): boolean {
    if (!permsMap) return false;
    const key = `${module}.${section}`;
    const perm = permsMap[key];
    return perm?.canEdit ?? false;
  }

  return {
    isLoading,
    permsMap,
    getSectionVisibility,
    canViewSection,
    viewsAllData,
    canEditSection,
  };
}

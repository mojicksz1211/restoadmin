/**
 * Branch Utility Functions
 * Helper functions for branch-related operations
 */

/**
 * Check if a branch is Kim's Brothers
 * Kim's Brothers is identified by BRANCH_CODE === 'BR002' or BRANCH_NAME === "kim's brothers"
 */
export function isKimsBrothersBranch(
  branchCode?: string | null,
  branchName?: string | null
): boolean {
  if (!branchCode && !branchName) return false;
  
  const code = (branchCode || '').trim().toUpperCase();
  const name = (branchName || '').trim().toLowerCase();
  
  return code === 'BR002' || name === "kim's brothers";
}

/**
 * Check if a branch option is Kim's Brothers
 */
export function isKimsBrothersBranchOption(branchOption: { value: string; label: string }): boolean {
  // Check if label contains "kim's brothers" (case insensitive)
  const label = (branchOption.label || '').trim().toLowerCase();
  return label.includes("kim's brothers");
}

/**
 * Check if a branch is Daraejung
 * Daraejung is identified by BRANCH_CODE === 'BR001' or BRANCH_NAME contains "daraejung"
 */
export function isDaraejungBranch(
  branchCode?: string | null,
  branchName?: string | null
): boolean {
  if (!branchCode && !branchName) return false;
  
  const code = (branchCode || '').trim().toUpperCase();
  const name = (branchName || '').trim().toLowerCase();
  
  return code === 'BR001' || name.includes('daraejung');
}

/**
 * Check if a branch option is Daraejung
 */
export function isDaraejungBranchOption(branchOption: { value: string; label: string }): boolean {
  // Check if label contains "daraejung" (case insensitive)
  const label = (branchOption.label || '').trim().toLowerCase();
  return label.includes('daraejung');
}


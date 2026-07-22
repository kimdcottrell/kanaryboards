import type { Ui } from '@clerk/ui/internal';
import type { AstroClerkUpdateOptions } from '../types';
/**
 * Prevents firing clerk.load() multiple times
 */
declare const createClerkInstance: (params: Parameters<import("./types").CreateClerkInstanceInternalFn>[0]) => Promise<unknown>;
declare function updateClerkOptions<TUi extends Ui = Ui>(options: AstroClerkUpdateOptions<TUi>): void;
export { createClerkInstance, updateClerkOptions };
//# sourceMappingURL=create-clerk-instance.d.ts.map
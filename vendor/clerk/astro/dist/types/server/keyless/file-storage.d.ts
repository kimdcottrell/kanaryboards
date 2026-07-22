import { type KeylessStorage } from '@clerk/shared/keyless';
export type { KeylessStorage };
export interface FileStorageOptions {
    cwd?: () => string;
}
export declare function createFileStorage(options?: FileStorageOptions): KeylessStorage;
//# sourceMappingURL=file-storage.d.ts.map
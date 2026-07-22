import { constants } from '@clerk/backend/internal';
export declare function getAuthKeyFromRequest(req: Request, key: keyof typeof constants.Attributes): string | null | undefined;
export declare const isRedirect: (res: Response) => boolean;
export declare const setHeader: <T extends Response>(res: T, name: string, val: string) => T;
//# sourceMappingURL=utils.d.ts.map
//#region src/async-local-storage.server.ts
async function createAsyncLocalStorage() {
	const { AsyncLocalStorage } = await import("node:async_hooks");
	return new AsyncLocalStorage();
}
const authAsyncStorage = await createAsyncLocalStorage();

//#endregion
export { authAsyncStorage };
//# sourceMappingURL=async-local-storage.server.js.map
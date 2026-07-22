//#region src/async-local-storage.client.ts
const sharedAsyncLocalStorageNotAvailableError = /* @__PURE__ */ new Error("Invariant: AsyncLocalStorage accessed in runtime where it is not available");
var FakeAsyncLocalStorage = class {
	disable() {
		throw sharedAsyncLocalStorageNotAvailableError;
	}
	getStore() {}
	run() {
		throw sharedAsyncLocalStorageNotAvailableError;
	}
	exit() {
		throw sharedAsyncLocalStorageNotAvailableError;
	}
	enterWith() {
		throw sharedAsyncLocalStorageNotAvailableError;
	}
};
function createAsyncLocalStorage() {
	return new FakeAsyncLocalStorage();
}
const authAsyncStorage = createAsyncLocalStorage();

//#endregion
export { authAsyncStorage };
//# sourceMappingURL=async-local-storage.client.js.map
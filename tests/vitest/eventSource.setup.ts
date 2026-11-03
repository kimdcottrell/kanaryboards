// Deno ships its own `EventSource` global, which jsdom doesn't shadow. Its
// events don't belong to jsdom's EventTarget, so the first one crashes the test
// worker. Replace it with a fake that never connects; tests drive it with
// emit() (see board-provider-save.test.tsx).
export class FakeEventSource {
  static instances: FakeEventSource[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  closed = false;

  constructor(public url: string) {
    FakeEventSource.instances.push(this);
  }

  emit(data = "change") {
    this.onmessage?.(new MessageEvent("message", { data }));
  }

  close() {
    this.closed = true;
  }
}

Object.defineProperty(globalThis, "EventSource", {
  configurable: true,
  writable: true,
  value: FakeEventSource,
});

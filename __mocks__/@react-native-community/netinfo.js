const listeners = new Set();

const state = { isConnected: true, isInternetReachable: true, type: "wifi" };

module.exports = {
  addEventListener: jest.fn((listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }),
  fetch: jest.fn(async () => state),
  __setState: (next) => {
    Object.assign(state, next);
    for (const listener of listeners) listener(state);
  },
};

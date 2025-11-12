// src/store/index.ts
// Re-export the unified store configured in ./store to avoid duplicate instances
export { store, persistor } from './store';
export type { RootState, AppDispatch } from './store';

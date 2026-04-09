import { create } from 'zustand';

interface DataStore {
  /** Incremented whenever a mutation (create/update/delete) happens on any entity.
   *  Components that display aggregated or cross-entity data (Dashboard, ClientDetailDrawer)
   *  add this to their useEffect dependency array so they automatically refetch. */
  version: number;
  bump: () => void;
}

export const useDataStore = create<DataStore>((set) => ({
  version: 0,
  bump: () => set((state) => ({ version: state.version + 1 })),
}));

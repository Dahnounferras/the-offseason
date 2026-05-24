export const makeDocSnap = (id: string, data: Record<string, unknown>) => ({
  id,
  exists: () => true,
  data: () => data,
});

export const makeEmptyDocSnap = () => ({
  exists: () => false,
  data: () => undefined,
});

export const makeQuerySnap = (docs: { id: string; data: Record<string, unknown> }[]) => ({
  empty: docs.length === 0,
  docs: docs.map((d) => ({ id: d.id, data: () => d.data })),
});

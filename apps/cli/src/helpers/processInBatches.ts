export const processInBatches = async <T>(batchSize: number, list: T[], callback: (item: T) => Promise<any>) => {
  const batches = Array.from({ length: Math.ceil(list.length / batchSize) }, (_, i) =>
    list.slice(i * batchSize, i * batchSize + batchSize),
  );

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    await Promise.all(batch.map((item) => callback(item)));
  }
};

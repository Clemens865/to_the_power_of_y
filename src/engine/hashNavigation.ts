interface HashChange {
  oldURL: string;
  newURL: string;
}

/** Hash events are queued separately from input events; an older event must not cancel a newer press. */
export const createHashNavigationGate = () => {
  let intent = 0;
  const authored = new Map<string, number>();
  const key = (change: HashChange) => `${change.oldURL}\0${change.newURL}`;

  return {
    beginPress: () => ++intent,
    recordAuthored(oldURL: string, newURL: string, pressIntent: number) {
      if (oldURL !== newURL) authored.set(key({ oldURL, newURL }), pressIntent);
    },
    acceptHashChange(change: HashChange, currentURL: string): boolean {
      const id = key(change);
      const pressIntent = authored.get(id);
      authored.delete(id);
      // A later navigation may already have changed the address before this event runs.
      if (change.newURL !== currentURL) return false;
      if (pressIntent !== undefined && pressIntent !== intent) return false;
      // Accepted external navigation supersedes all older delayed press intents too.
      intent++;
      return true;
    }
  };
};

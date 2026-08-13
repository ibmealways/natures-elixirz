export function uniqueDocuments(...snapshots) {
  const documents = new Map();
  snapshots.flatMap((snapshot) => snapshot.docs).forEach((document) => documents.set(document.ref.path, document));
  return [...documents.values()];
}

export const documentData = (snapshot) => snapshot.exists
  ? { id: snapshot.id, ...snapshot.data() }
  : null;

export const documentsData = (documents) => documents.map((document) => ({
  id: document.id,
  ...document.data(),
}));

export function activeVipFamilyMemberUids(householdSnapshot) {
  const memberUids = householdSnapshot.exists && Array.isArray(householdSnapshot.data()?.memberUids)
    ? householdSnapshot.data().memberUids
    : [];
  return [...new Set(memberUids.filter((uid) => typeof uid === "string" && uid.trim()))];
}

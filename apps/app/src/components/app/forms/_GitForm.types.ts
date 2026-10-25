export interface Branch {
  name: string;
  id: string;
}

export interface Repository {
  owner?: string;
  name: string;
  id: string;
  path?: string;
  legacyIds?: string[];
  defaultBranch?: string;
}

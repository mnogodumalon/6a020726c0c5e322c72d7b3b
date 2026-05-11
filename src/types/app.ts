// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Testeingabe {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    titel?: string;
    beschreibung?: string;
    datum?: string; // Format: YYYY-MM-DD oder ISO String
    nummer?: number;
    status?: LookupValue;
  };
}

export const APP_IDS = {
  TESTEINGABE: '6a02071c6a70f735143b163d',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'testeingabe': {
    status: [{ key: "offen", label: "Offen" }, { key: "in_bearbeitung", label: "In Bearbeitung" }, { key: "abgeschlossen", label: "Abgeschlossen" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'testeingabe': {
    'titel': 'string/text',
    'beschreibung': 'string/textarea',
    'datum': 'date/date',
    'nummer': 'number',
    'status': 'lookup/radio',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateTesteingabe = StripLookup<Testeingabe['fields']>;
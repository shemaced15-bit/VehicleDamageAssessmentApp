import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode, type SetStateAction } from "react";

export type Role = "Assessment Officer" | "Vehicle Damage Assessor" | "Repair Cost Reviewer" | "Insurance Supervisor" | "System Admin";
export type Status = "Initiated" | "Images Uploaded" | "AI Analyzed" | "Under Review" | "Completed" | "Rejected";
export type Page = "dashboard" | "assessments" | "collection" | "ai" | "costs" | "review" | "notifications" | "reports" | "security" | "integrations" | "audit" | "staff" | "profile";
export type EvidenceImage = { id: string; name: string; url: string; size: number; width: number; height: number; quality: "Passed" | "Review"; annotations: { id: string; label: string; x: number; y: number; w: number; h: number }[] };
export type Finding = { id: number; type: string; area: string; x: number; y: number; w: number; h: number; confidence: number; state: "Pending" | "Confirmed" | "Rejected"; rejectionReason?: string };
export type Estimate = { generated: boolean; lineItems: { item: string; category: string; parts: number; laborHours: number; labor: number; subtotal: number }[]; adjustments: { id: number; amount: number; justification: string }[]; flags: { id: number; reason: string }[]; total: number };
export type ReviewRecord = { checklist: boolean[]; decision?: "Approved" | "Rejected" | "Returned"; comments: { id: number; author: string; text: string; date: string }[] };
export type HistoryItem = { id: number; date: string; actor: string; action: string; detail: string };
export type Assessment = { id: string; make: string; model: string; year: number; plate: string; vin: string; claim: string; location: string; date: string; status: Status; cost: number; confidence: number; description?: string; images: EvidenceImage[]; documents: { id: string; name: string; url?: string }[]; findings: Finding[]; estimate: Estimate; review: ReviewRecord; history: HistoryItem[]; readyForCost: boolean };
export type Notice = { id: number; title: string; body: string; time: string; read: boolean; type: "info" | "success" | "warning"; page?: Page; assessmentId?: string; audience?: Role };
export type Audit = { id: number; time: string; user: string; action: string; module: string; detail: string };
export type Communication = { id: number; date: string; type: string; channel: string; sender: string; audience: string; subject: string; status: string; body: string; assessmentId?: string };

type State = { assessments: Assessment[]; notices: Notice[]; communications: Communication[]; audit: Audit[]; masked: boolean; selectedId: string };
type Action =
  | { type: "SET_ASSESSMENTS"; value: SetStateAction<Assessment[]> }
  | { type: "SET_NOTICES"; value: SetStateAction<Notice[]> }
  | { type: "SET_COMMUNICATIONS"; value: SetStateAction<Communication[]> }
  | { type: "SET_AUDIT"; value: SetStateAction<Audit[]> }
  | { type: "SELECT"; id: string }
  | { type: "MASK"; value: boolean }
  | { type: "PATCH_CASE"; id: string; patch: Partial<Assessment> }
  | { type: "RESET" };

const photo = "https://images.unsplash.com/photo-1526583038916-f138f908476b?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=1400";
const blankEstimate: Estimate = { generated: false, lineItems: [], adjustments: [], flags: [], total: 0 };
const blankReview: ReviewRecord = { checklist: [false, false, false], comments: [] };
const vehicles = [["Toyota", "RAV4"], ["Hyundai", "Tucson"], ["Suzuki", "Swift"], ["Toyota", "Corolla"], ["Hyundai", "Santa Fe"], ["Suzuki", "Vitara"]];
const statuses: Status[] = ["Initiated", "Images Uploaded", "AI Analyzed", "Under Review", "Completed", "Rejected"];
const makeCase = (i: number): Assessment => {
  const status = statuses[i % statuses.length];
  const id = `SA-${String(2601 + i).padStart(4, "0")}`;
  return {
    id, make: vehicles[i % vehicles.length][0], model: vehicles[i % vehicles.length][1], year: 2018 + i % 7,
    plate: `RA${String.fromCharCode(66 + i % 6)} ${123 + i}A`, vin: `JTDBR32E${String(100000000 + i).slice(0, 9)}`,
    claim: `CLM-2026-${4010 + i}`, location: "Kigali, Rwanda", date: `2026-09-${String(28 - i % 20).padStart(2, "0")}`,
    status, cost: status === "Completed" ? 1_410_000 + i * 20_000 : 0, confidence: status === "Initiated" ? 0 : 88,
    description: "Visible impact damage requiring professional assessment.",
    images: status === "Initiated" ? [] : [{ id: `${id}-image`, name: "Vehicle damage.jpg", url: photo, size: 248000, width: 1400, height: 933, quality: "Passed", annotations: [] }],
    documents: [], findings: [], estimate: { ...blankEstimate, lineItems: [], adjustments: [], flags: [] },
    review: { ...blankReview, checklist: [...blankReview.checklist], comments: [] },
    history: [{ id: i + 1, date: "2026-09-28 09:00", actor: "Assessment Officer", action: "Assessment created", detail: id }],
    readyForCost: status === "AI Analyzed",
  };
};
export const createDemoState = (): State => {
  const assessments = Array.from({ length: 27 }, (_, i) => makeCase(i));
  return {
    assessments,
    notices: [],
    communications: [],
    audit: [],
    masked: false,
    selectedId: "",
  };
};
const STORAGE_KEY = "secureassess-store-v2";
const load = (): State => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...createDemoState(), ...JSON.parse(saved) } : createDemoState();
  } catch {
    return createDemoState();
  }
};
const apply = <T,>(current: T, value: SetStateAction<T>) => typeof value === "function" ? (value as (v: T) => T)(current) : value;
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_ASSESSMENTS": return { ...state, assessments: apply(state.assessments, action.value) };
    case "SET_NOTICES": return { ...state, notices: apply(state.notices, action.value) };
    case "SET_COMMUNICATIONS": return { ...state, communications: apply(state.communications, action.value) };
    case "SET_AUDIT": return { ...state, audit: apply(state.audit, action.value) };
    case "SELECT": return { ...state, selectedId: action.id };
    case "MASK": return { ...state, masked: action.value };
    case "PATCH_CASE": return { ...state, assessments: state.assessments.map(item => item.id === action.id ? { ...item, ...action.patch } : item) };
    case "RESET": return createDemoState();
  }
}
type Store = State & {
  setAssessments: Dispatch<SetStateAction<Assessment[]>>;
  setNotices: Dispatch<SetStateAction<Notice[]>>;
  setCommunications: Dispatch<SetStateAction<Communication[]>>;
  setAudit: Dispatch<SetStateAction<Audit[]>>;
  setSelectedId: (id: string) => void;
  setMasked: (value: boolean) => void;
  patchCase: (id: string, patch: Partial<Assessment>) => void;
  reset: () => void;
};
const Context = createContext<Store | null>(null);
export function AssessmentStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Keep the active session usable if uploaded demo media exceeds the browser quota.
    }
  }, [state]);
  const value: Store = {
    ...state,
    setAssessments: value => dispatch({ type: "SET_ASSESSMENTS", value }),
    setNotices: value => dispatch({ type: "SET_NOTICES", value }),
    setCommunications: value => dispatch({ type: "SET_COMMUNICATIONS", value }),
    setAudit: value => dispatch({ type: "SET_AUDIT", value }),
    setSelectedId: id => dispatch({ type: "SELECT", id }),
    setMasked: value => dispatch({ type: "MASK", value }),
    patchCase: (id, patch) => dispatch({ type: "PATCH_CASE", id, patch }),
    reset: () => dispatch({ type: "RESET" }),
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAssessmentStore() {
  const value = useContext(Context);
  if (!value) throw new Error("useAssessmentStore must be used inside AssessmentStoreProvider");
  return value;
}

import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../services/firebase";

export const logAudit = async ({
  action,
  module,
  description,
  userId,
  userName,
  targetId = null,
  severity = "INFO",
}: {
  action: string;
  module: string;
  description: string;
  userId: string;
  userName: string;
  targetId?: string | null;
  severity?: "INFO" | "WARNING" | "CRITICAL";
}) => {
  try {
    await addDoc(collection(db, "audit_logs"), {
      action,
      module,
      description,
      userId,
      userName,
      targetId,
      severity,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Audit Log Error:", error);
  }
};

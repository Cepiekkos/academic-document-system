export function historyEvent(document, { user, role = "", action, changes = "", date, version }) {
  return {
    version: version || document?.version || "v0.1",
    date: date || new Date().toISOString(),
    user: user || "Unknown",
    role,
    action,
    changes
  };
}

function actionFamily(action) {
  const value = String(action || "").toLowerCase();
  if (value.includes("created") || value.includes("initial draft") || value.includes("migration seed")) return "created";
  if (value.includes("metadata")) return "metadata";
  if (value.includes("submitted") || value.includes("sent to department") || value.includes("send to department")) return "submitted";
  if (value.includes("department head approved") || value.includes("approved document for dean") || value.includes("approved by department")) return "dh-approve";
  if (value.includes("dean approved") || value.includes("approved document for publication") || value.includes("approved by dean")) return "dean-approve";
  if (value.includes("revision")) return `revision:${value}:${action}`;
  if (value.includes("republish")) return "republish";
  if (value.includes("publish")) return "publish";
  if (value.includes("archiv")) return "archive";
  if (value.includes("restor") || value.includes("changed back to draft")) return "restore";
  return value;
}

function inferWorkflowHistory(document) {
  const version = document?.version || "v0.1";
  const events = [];
  const created = (document?.versionHistory || []).find((entry) => actionFamily(entry.action) === "created");
  events.push(historyEvent(document, {
    version: created?.version || "v0.1",
    date: created?.date || document?.createdAt || document?.updatedAt,
    user: created?.user || document?.owner || "Faculty",
    role: created?.role || "Faculty",
    action: "Created",
    changes: created?.changes || "Initial draft"
  }));

  const reviewHistory = document?.workflow?.reviewHistory || {};
  const departmentHead = reviewHistory.departmentHead;
  if (departmentHead?.reviewed || departmentHead?.approved || departmentHead?.reviewer) {
    events.push(historyEvent(document, {
      version,
      date: departmentHead.time,
      user: departmentHead.reviewer || "Department Head",
      role: "Department Head",
      action: departmentHead.approved ? "Approved by Department Head" : "Reviewed by Department Head",
      changes: departmentHead.approved ? "Sent to Dean for review" : "Department Head recorded a review"
    }));
  }
  const dean = reviewHistory.dean;
  if (dean?.reviewed || dean?.approved || dean?.reviewer) {
    events.push(historyEvent(document, {
      version,
      date: dean.time,
      user: dean.reviewer || "Dean",
      role: "Dean",
      action: dean.approved ? "Approved by Dean" : "Reviewed by Dean",
      changes: dean.approved ? "Returned to Faculty as ready to publish" : "Dean recorded a review"
    }));
  }
  (document?.revisionRequests || []).forEach((request) => {
    events.push(historyEvent(document, {
      version,
      date: request.time,
      user: request.reviewer || request.from || "Reviewer",
      role: request.from || "",
      action: `Revision requested by ${request.from || "reviewer"}`,
      changes: request.reason || "Returned to Faculty for revision"
    }));
  });
  if (document?.publishedAt) {
    events.push(historyEvent(document, {
      version,
      date: document.publishedAt,
      user: document.owner || "Faculty",
      role: "Faculty",
      action: "Published",
      changes: "Document published and archived"
    }));
  } else if (document?.status === "Archived") {
    events.push(historyEvent(document, {
      version,
      date: document.updatedAt,
      user: document.owner || "Faculty",
      role: "Faculty",
      action: "Archived",
      changes: "Document moved to archive"
    }));
  }
  return events;
}

export function buildDocumentTimeline(document) {
  const stored = (document?.versionHistory || []).map((entry) => historyEvent(document, entry));
  const inferred = inferWorkflowHistory(document);
  const merged = [...stored];
  inferred.forEach((entry) => {
    const family = actionFamily(entry.action);
    const exists = stored.some((item) => {
      if (actionFamily(item.action) !== family && !(family.startsWith("revision") && actionFamily(item.action).startsWith("revision"))) return false;
      if (family.startsWith("revision")) {
        return item.date === entry.date || (item.changes && entry.changes && item.changes === entry.changes);
      }
      return true;
    });
    if (!exists) merged.push(entry);
  });
  return merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function viewedBefore({ reviewer, viewedAtBy = {}, viewedBy = [], eventAt }) {
  const normalizedReviewer = String(reviewer || "").trim();
  const reviewerViewedAt = viewedAtBy[normalizedReviewer];
  if (!normalizedReviewer || !reviewerViewedAt || !eventAt) return false;
  const hasViewed = viewedBy.some((viewer) => String(viewer).trim() === normalizedReviewer);
  const viewedTime = new Date(reviewerViewedAt).getTime();
  const eventTime = new Date(eventAt).getTime();
  return hasViewed && Number.isFinite(viewedTime) && Number.isFinite(eventTime) && viewedTime < eventTime;
}

// Draft re-check uses the same rule: a reviewer only sees the re-check indicator when they
// had already viewed the document before the new draft was created.
export function viewedBeforeDraft({ reviewer, viewedAtBy = {}, viewedBy = [], draftedAt }) {
  return viewedBefore({ reviewer, viewedAtBy, viewedBy, eventAt: draftedAt });
}

export const endpoints = [
    ["GET", "/agents"], ["POST", "/agents"],
    ["GET", "/agents/{id}"], ["DELETE", "/agents/{id}"], ["GET", "/agents/{id}/key"],
    ["GET", "/databases"], ["GET", "/databases/{id}"], ["PATCH", "/databases/{id}"],
    ["GET", "/databases/{id}/status"], ["GET", "/databases/{id}/backup"], ["POST", "/databases/{id}/backup"],
    ["GET", "/databases/{id}/backup/{backupId}"], ["POST", "/databases/{id}/restore"],
    ["PUT", "/databases/{id}/backup-policy"],
    ["GET", "/organizations"], ["POST", "/organizations"],
    ["GET", "/organizations/{id}"], ["DELETE", "/organizations/{id}"],
    ["GET", "/organizations/{id}/projects"], ["POST", "/organizations/{id}/projects"],
    ["GET", "/organizations/{id}/agents"], ["POST", "/organizations/{id}/agents"],
    ["DELETE", "/organizations/{id}/agents/{agentId}"],
    ["GET", "/projects/{id}"], ["DELETE", "/projects/{id}"],
] as const;

export const missingId = "438e5292-1e7a-49d8-a3c0-3f4c24aceeb0";
export const apiPath = (path: string) => `/api/v1${path}`;

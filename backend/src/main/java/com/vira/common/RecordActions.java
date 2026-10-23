package com.vira.common;

/**
 * What the row-action control may offer for one record (decision D4).
 * Computed on the server so the availability rule lives in one place.
 */
public record RecordActions(boolean canEdit, boolean canDelete, boolean canRestore,
                            String blockedReason) {

    public static RecordActions of(boolean recordDeleted, boolean linkedDeleted, String linkedLabel) {
        if (linkedDeleted) {
            return new RecordActions(false, false, false,
                    "The " + linkedLabel + " is deleted. Restore the " + linkedLabel + " first.");
        }
        return recordDeleted
                ? new RecordActions(false, false, true, null)
                : new RecordActions(true, true, false, null);
    }
}
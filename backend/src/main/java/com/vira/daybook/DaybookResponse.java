package com.vira.daybook;

import com.vira.common.PageResponse;

public record DaybookResponse(DaybookSummary summary, PageResponse<DaybookRow> bills) {
}
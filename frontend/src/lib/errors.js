/** One readable sentence for any thrown value. */
export function describeError(error) {
  if (!error) return 'Something went wrong.';
  if (error.isNetwork) return error.message;
  if (error.code === 'VALIDATION_FAILED' && error.fieldErrors?.length) {
    return error.fieldErrors.map((f) => f.message).join(' ');
  }
  return error.message || 'Something went wrong.';
}

/** { field: "message" } from an ApiError's fieldErrors (first message wins). */
export function fieldErrorMap(error) {
  const map = {};
  for (const item of error?.fieldErrors ?? []) {
    if (item?.field && !(item.field in map)) map[item.field] = item.message;
  }
  return map;
}

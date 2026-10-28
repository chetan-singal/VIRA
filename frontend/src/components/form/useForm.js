import { useCallback, useState } from 'react';
import { fieldErrorMap } from '../../lib/errors';

/**
 * Tiny form state: values, per-field errors and a helper that turns the backend's
 * VALIDATION_FAILED fieldErrors into inline messages.
 */
export function useForm(initial) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});

  const set = useCallback((field, value) => {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  }, []);

  /** Returns true when the error was a field error and is now shown inline; false otherwise. */
  const applyApiError = useCallback((error) => {
    const map = fieldErrorMap(error);
    if (Object.keys(map).length === 0) return false;
    setErrors(map);
    return true;
  }, []);

  const reset = useCallback((next) => {
    setValues(next ?? initial);
    setErrors({});
  }, [initial]);

  return { values, errors, set, setErrors, applyApiError, reset };
}

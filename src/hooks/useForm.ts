/**
 * 🎯 Custom Form Hook - Inspirado em React Hook Form + Mantine/shadcn
 * Sistema completo de formulários com validação, estados e UX aprimorada
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { z, ZodSchema } from 'zod';

export interface FormField<T = any> {
  value: T;
  error?: string;
  touched: boolean;
  dirty: boolean;
  valid: boolean;
}

export interface FormState<T extends Record<string, any>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  dirty: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValidating: boolean;
  isValid: boolean;
  isDirty: boolean;
  submitCount: number;
}

export interface UseFormOptions<T extends Record<string, any>> {
  initialValues: T;
  validationSchema?: ZodSchema<T>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnSubmit?: boolean;
  onSubmit?: (values: T, helpers: FormHelpers<T>) => void | Promise<void>;
  onError?: (errors: Partial<Record<keyof T, string>>) => void;
  transformValues?: (values: T) => T;
  resetOnSubmit?: boolean;
}

export interface FormHelpers<T extends Record<string, any>> {
  setFieldValue: (field: keyof T, value: any) => void;
  setFieldError: (field: keyof T, error: string) => void;
  setFieldTouched: (field: keyof T, touched?: boolean) => void;
  setErrors: (errors: Partial<Record<keyof T, string>>) => void;
  setValues: (values: T) => void;
  resetForm: (values?: T) => void;
  validateField: (field: keyof T) => Promise<boolean>;
  validateForm: () => Promise<boolean>;
  setSubmitting: (isSubmitting: boolean) => void;
}

export interface FormHandlers<T extends Record<string, any>> {
  handleChange: (field: keyof T) => (event: React.ChangeEvent<any>) => void;
  handleBlur: (field: keyof T) => (event: React.FocusEvent<any>) => void;
  handleSubmit: (event: React.FormEvent) => void;
  handleReset: () => void;
}

export interface UseFormReturn<T extends Record<string, any>> extends FormState<T>, FormHelpers<T>, FormHandlers<T> {
  getFieldProps: (field: keyof T) => {
    name: string;
    value: any;
    onChange: (event: React.ChangeEvent<any>) => void;
    onBlur: (event: React.FocusEvent<any>) => void;
    error?: string;
    'aria-invalid': boolean;
    'aria-describedby': string;
  };
  register: (field: keyof T, options?: RegisterOptions) => RegisterReturn;
}

export interface RegisterOptions {
  required?: boolean;
  pattern?: RegExp;
  validate?: (value: any) => boolean | string;
  transform?: (value: any) => any;
}

export interface RegisterReturn {
  name: string;
  onChange: (event: React.ChangeEvent<any>) => void;
  onBlur: (event: React.FocusEvent<any>) => void;
  value: any;
  ref: React.RefCallback<any>;
  'aria-invalid': boolean;
  'aria-describedby': string;
}

export function useForm<T extends Record<string, any>>(options: UseFormOptions<T>): UseFormReturn<T> {
  const {
    initialValues,
    validationSchema,
    validateOnChange = true,
    validateOnBlur = true,
    validateOnSubmit = true,
    onSubmit,
    onError,
    transformValues,
    resetOnSubmit = false,
  } = options;

  // State
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [dirty, setDirty] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);

  // Refs para elementos do formulário
  const fieldsRef = useRef<Record<string, HTMLElement>>({});

  // Computed states
  const isValid = Object.keys(errors).length === 0;
  const isDirty = Object.values(dirty).some(Boolean);

  // Validate single field
  const validateField = useCallback(async (field: keyof T): Promise<boolean> => {
    if (!validationSchema) return true;

    try {
      setIsValidating(true);
      // Validate just this field by creating a partial schema
      const fieldValue = { [field]: values[field] } as Partial<T>;
      await validationSchema.parseAsync(fieldValue);
      
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
      
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldError = error.errors.find(err => err.path[0] === field);
        if (fieldError) {
          setErrors(prev => ({ ...prev, [field]: fieldError.message }));
        }
      }
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [validationSchema, values]);

  // Validate entire form
  const validateForm = useCallback(async (): Promise<boolean> => {
    if (!validationSchema) return true;

    try {
      setIsValidating(true);
      const transformedValues = transformValues ? transformValues(values) : values;
      await validationSchema.parseAsync(transformedValues);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formErrors: Partial<Record<keyof T, string>> = {};
        error.errors.forEach(err => {
          const field = err.path[0] as keyof T;
          if (field) {
            formErrors[field] = err.message;
          }
        });
        setErrors(formErrors);
        onError?.(formErrors);
      }
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [validationSchema, values, transformValues, onError]);

  // Field helpers
  const setFieldValue = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    setDirty(prev => ({ ...prev, [field]: true }));
    
    if (validateOnChange) {
      validateField(field);
    }
  }, [validateOnChange, validateField]);

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  const setFieldTouched = useCallback((field: keyof T, isTouched = true) => {
    setTouched(prev => ({ ...prev, [field]: isTouched }));
  }, []);

  // Form helpers
  const resetForm = useCallback((newValues?: T) => {
    const resetValues = newValues || initialValues;
    setValues(resetValues);
    setErrors({});
    setTouched({});
    setDirty({});
    setIsSubmitting(false);
    setSubmitCount(0);
  }, [initialValues]);

  const setFormErrors = useCallback((newErrors: Partial<Record<keyof T, string>>) => {
    setErrors(newErrors);
  }, []);

  const setFormValues = useCallback((newValues: T) => {
    setValues(newValues);
  }, []);

  // Event handlers
  const handleChange = useCallback((field: keyof T) => (event: React.ChangeEvent<any>) => {
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    setFieldValue(field, value);
  }, [setFieldValue]);

  const handleBlur = useCallback((field: keyof T) => (_event: React.FocusEvent<any>) => {
    setFieldTouched(field, true);
    
    if (validateOnBlur) {
      validateField(field);
    }
  }, [validateOnBlur, validateField, setFieldTouched]);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitCount(prev => prev + 1);

    // Mark all fields as touched
    const touchedFields: Partial<Record<keyof T, boolean>> = {};
    Object.keys(values).forEach(key => {
      touchedFields[key as keyof T] = true;
    });
    setTouched(touchedFields);

    if (validateOnSubmit) {
      const isFormValid = await validateForm();
      if (!isFormValid) return;
    }

    if (onSubmit) {
      try {
        setIsSubmitting(true);
        const transformedValues = transformValues ? transformValues(values) : values;
        await onSubmit(transformedValues, {
          setFieldValue,
          setFieldError,
          setFieldTouched,
          setErrors: setFormErrors,
          setValues: setFormValues,
          resetForm,
          validateField,
          validateForm,
          setSubmitting: setIsSubmitting,
        });

        if (resetOnSubmit) {
          resetForm();
        }
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [
    values,
    validateOnSubmit,
    validateForm,
    onSubmit,
    transformValues,
    resetOnSubmit,
    resetForm,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    setFormErrors,
    setFormValues,
    validateField,
  ]);

  const handleReset = useCallback(() => {
    resetForm();
  }, [resetForm]);

  // Get field props helper
  const getFieldProps = useCallback((field: keyof T) => ({
    name: String(field),
    value: values[field] || '',
    onChange: handleChange(field),
    onBlur: handleBlur(field),
    error: touched[field] ? errors[field] : undefined,
    'aria-invalid': !!(touched[field] && errors[field]),
    'aria-describedby': `${String(field)}-error`,
  }), [values, handleChange, handleBlur, touched, errors]);

  // Register helper (similar to react-hook-form)
  const register = useCallback((field: keyof T, registerOptions?: RegisterOptions) => {
    return {
      name: String(field),
      onChange: (event: React.ChangeEvent<any>) => {
        let value = event.target.value;
        
        if (registerOptions?.transform) {
          value = registerOptions.transform(value);
        }
        
        if (registerOptions?.pattern && !registerOptions.pattern.test(value)) {
          return; // Don't update if pattern doesn't match
        }
        
        handleChange(field)(event);
      },
      onBlur: handleBlur(field),
      value: values[field] || '',
      ref: (element: HTMLElement) => {
        if (element) {
          fieldsRef.current[String(field)] = element;
        }
      },
      'aria-invalid': !!(touched[field] && errors[field]),
      'aria-describedby': `${String(field)}-error`,
    };
  }, [values, handleChange, handleBlur, touched, errors]);

  // Focus first error field on validation failure
  useEffect(() => {
    if (Object.keys(errors).length > 0 && submitCount > 0) {
      const firstErrorField = Object.keys(errors)[0];
      const element = fieldsRef.current[firstErrorField];
      if (element && 'focus' in element) {
        (element as any).focus();
      }
    }
  }, [errors, submitCount]);

  return {
    // State
    values,
    errors,
    touched,
    dirty,
    isSubmitting,
    isValidating,
    isValid,
    isDirty,
    submitCount,

    // Helpers
    setFieldValue,
    setFieldError,
    setFieldTouched,
    setErrors: setFormErrors,
    setValues: setFormValues,
    resetForm,
    validateField,
    validateForm,
    setSubmitting: setIsSubmitting,

    // Handlers
    handleChange,
    handleBlur,
    handleSubmit,
    handleReset,

    // Utils
    getFieldProps,
    register,
  };
}

export default useForm;

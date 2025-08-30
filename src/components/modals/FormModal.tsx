// packages/web/src/shared/modals/FormModal.tsx
import React, { ReactNode } from 'react';
import { BaseModal } from './BaseModal';
import { Button, Form, FormActions } from '../ui/StandardComponents';
import { FormModalProps } from '../../types/types';

interface FormModalComponentProps extends FormModalProps {
  children: ReactNode;
}

export const FormModal: React.FC<FormModalComponentProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  children,
  isLoading = false,
  submitText = 'Salvar',
  cancelText = 'Cancelar',
  className = '',
  size = 'md',
  ...props
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading) {
      const formData = new FormData(e.target as HTMLFormElement);
      const data = Object.fromEntries(formData.entries());
      onSubmit(data);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      className={className}
      size={size}
      showCloseButton={true}
      {...props}
    >
      <Form onSubmit={handleSubmit}>
        <div className="mb-6">{children}</div>

        <FormActions>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            disabled={isLoading}
          >
            {submitText}
          </Button>
        </FormActions>
      </Form>
    </BaseModal>
  );
};

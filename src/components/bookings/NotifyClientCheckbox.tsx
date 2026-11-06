import { Checkbox } from '../ui/Checkbox';

// D11 (aprovada em 02/11/2026): "Avisar o cliente por e-mail", marcada por padrão, em toda tela do painel que
// confirma uma reserva ou a cria já confirmada. O corpo da requisição sai de utils/notifyClient.

interface NotifyClientCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** A reserva tem e-mail do cliente? undefined quando a tela não sabe (o e-mail é resolvido no servidor). */
  hasEmail?: boolean;
  id?: string;
}

export function NotifyClientCheckbox({ checked, onChange, hasEmail, id }: NotifyClientCheckboxProps) {
  const noEmail = hasEmail === false;
  const description = noEmail
    ? 'Esta reserva não tem e-mail do cliente.'
    : hasEmail
      ? 'O cliente recebe o e-mail de reserva confirmada.'
      : 'O e-mail sai se a reserva tiver o e-mail do cliente.';
  return (
    <Checkbox
      id={id}
      label="Avisar o cliente por e-mail"
      description={description}
      checked={checked && !noEmail}
      disabled={noEmail}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
}

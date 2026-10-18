import { useId, type ComponentProps } from 'react';

type TextFieldProps = Omit<ComponentProps<'input'>, 'id' | 'className'> & {
  label: string;
  error?: string;
};

export function TextField({ label, error, ...input }: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-extrabold">
        {label}
      </label>
      <input
        {...input}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="h-12 rounded-btn-sm border-2 border-line bg-surface px-3.5 text-base font-semibold text-ink aria-invalid:border-danger"
      />
      {error && (
        <p id={errorId} className="text-sm font-bold text-danger-ink">
          {error}
        </p>
      )}
    </div>
  );
}

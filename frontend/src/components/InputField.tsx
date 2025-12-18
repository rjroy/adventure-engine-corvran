import {
  useState,
  useCallback,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import "./InputField.css";

export interface InputFieldProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function InputField({
  onSubmit,
  disabled = false,
  placeholder = "Enter your command...",
}: InputFieldProps) {
  const [value, setValue] = useState("");

  const handleSubmit = useCallback(() => {
    const trimmedValue = value.trim();
    if (trimmedValue && !disabled) {
      onSubmit(trimmedValue);
      setValue("");
    }
  }, [value, disabled, onSubmit]);

  const handleFormSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      handleSubmit();
    },
    [handleSubmit]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <form onSubmit={handleFormSubmit} className="input-field">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className="input-field__input"
        rows={3}
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="input-field__button"
      >
        Send
      </button>
    </form>
  );
}
